/**
 * index.js — 原味藍圖 Cloud Functions 進入點
 * =====================================================================
 * 為什麼需要這一層
 *   AI 供應商的 API Key 不能放進瀏覽器（原始碼、DevTools、網路面板都看得到）。
 *   本機開發時 Key 放在 tools/job-design/server/ai-proxy.mjs，只有 127.0.0.1
 *   連得到；要讓線上的人也能用，同一支程式必須搬到伺服器端，Key 改存
 *   Secret Manager。這個目錄就是那支程式。
 *
 * 目前進度
 *   ✅ 第一步：專案結構、供應商轉接層、健康檢查
 *   ✅ 第二步：jdAi() 帶著 Secret 呼叫 AI
 *   ✅ 第三步：課程授權碼與配額（一人一碼、每人 30 次、伺服器端扣減）
 *   ⬜ 第四步：案例資料上雲（jd_cases）
 *
 * 函式一覽
 *   ping            健康檢查
 *   jdAi            AI 整理（扣配額、失敗退費、寫稽核）
 *   redeemCode      兌換授權碼
 *   myAccess        查自己的剩餘次數
 *   issueCodes      批次產碼（限 Super Admin）
 *   listCodes       列出碼與使用狀態（限 Super Admin）
 *   setCodeRevoked  停權／恢復（限 Super Admin）
 *
 * 設計規格：PRD/職務設計App_課程授權與AI配額_工作包_v1_2026-07-22.md
 */

import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';

import { complete, parseJson, isSupportedProvider, DEFAULT_MODEL } from './lib/providers.js';
import { redeemCode as doRedeem, getAccess, consumeQuota, refundQuota, logAiJob, isFreeTask } from './lib/quota.js';

initializeApp();

// 台灣的使用者，選最近的區域降低延遲；maxInstances 防止異常暴衝把帳單拉高
setGlobalOptions({
  region: 'asia-east1',
  maxInstances: 10,
});

/** API Key。只有宣告用到它的 function 才拿得到，程式碼與版控裡都沒有它的值。 */
const AI_API_KEY = defineSecret('AI_API_KEY');

/** 供應商與模型不是機密，用環境變數即可；沒設就走預設。 */
const PROVIDER = process.env.AI_PROVIDER || 'openai';
const MODEL = process.env.AI_MODEL || '';

/**
 * 臨時允許清單（第三步的配額上線後移除）。
 *
 * 現在 jdAi 只檢查「有沒有登入」。但任何人都能用 Google 帳號登入，
 * 在配額機制到位之前，等於任何人都能燒掉這把 Key。
 * 所以先用 email 白名單擋住，只有清單內的人可以呼叫。
 *
 * 設定方式（不是機密，用環境變數即可）：
 *   functions/.env  →  AI_ALLOWLIST=someone@example.com,other@example.com
 * 留空 = 完全不開放，避免忘記設定時反而變成全開。
 */
const ALLOWLIST = String(process.env.AI_ALLOWLIST || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

/**
 * 健康檢查。用來確認部署成功、區域正確、前端呼叫得到。
 * 不碰 Secret、不碰 Firestore、不花 AI 的錢。
 */
export const ping = onCall(async (req) => {
  return {
    ok: true,
    signedIn: !!req.auth,
    uid: req.auth?.uid ?? null,
    region: 'asia-east1',
    at: new Date().toISOString(),
  };
});

/**
 * jdAi — 職務設計的 AI 整理呼叫。
 *
 * 取代本機代理的 POST /api/ai，回傳形狀刻意保持一致，
 * 前端 jd-ai.js 只要換 endpoint 就能用。
 *
 * 目前沒有配額檢查（第三步才加）。已先要求登入，避免完全裸奔。
 */
export const jdAi = onCall(
  {
    secrets: [AI_API_KEY],
    timeoutSeconds: 120,      // AI 整理長文可能要一分鐘以上
    memory: '256MiB',
  },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', '請先登入再使用 AI 整理。');
    }

    const uid = req.auth.uid;
    const email = String(req.auth.token?.email || '').toLowerCase();

    const { taskCode, system, user, caseId } = req.data || {};
    if (!system || !user) {
      throw new HttpsError('invalid-argument', '缺少 system 或 user 內容。');
    }
    if (!isSupportedProvider(PROVIDER)) {
      throw new HttpsError('failed-precondition', `未支援的供應商：${PROVIDER}`);
    }

    /*
     * 授權：課程授權碼優先，允許清單是備援。
     * 兌換過碼的人走配額；還在清單裡的開發帳號不扣次數，方便測試。
     * 兩者都沒有就拒絕——不會因為忘記設定而變成全開。
     */
    const access = await getAccess(uid);
    let quota = null;
    if (access) {
      quota = await consumeQuota(uid, taskCode);   // 先扣再打，失敗才退
    } else if (!ALLOWLIST.includes(email)) {
      logger.warn('jdAi 未授權呼叫', { uid, email });
      throw new HttpsError(
        'permission-denied',
        '還沒有輸入課程授權碼。輸入之後才能使用 AI 整理。',
      );
    }

    const started = Date.now();
    let result;
    try {
      result = await complete(PROVIDER, {
        apiKey: AI_API_KEY.value(),
        model: MODEL,
        system,
        user,
      });
    } catch (e) {
      // 供應商失敗不該由使用者付費
      if (quota?.counted) await refundQuota(uid);
      // 供應商的錯誤訊息可能含有請求內容，不原樣往前端丟
      logger.error('AI 供應商呼叫失敗', { taskCode, provider: PROVIDER, message: e.message });
      throw new HttpsError('unavailable', 'AI 服務暫時無法使用。你寫的內容都還在。');
    }

    let data;
    try {
      data = parseJson(result.text);
    } catch (e) {
      // 格式壞掉也是系統的問題，一樣退費
      if (quota?.counted) await refundQuota(uid);
      logger.warn('模型未回傳合法 JSON', { taskCode, message: e.message });
      throw new HttpsError('internal', 'AI 回傳的格式不正確，這一次不計次。請再試一次。');
    }

    logger.info('jdAi 完成', {
      taskCode: taskCode || 'AI',
      uid,
      ms: Date.now() - started,
      inputTokens: result.usage.input,
      outputTokens: result.usage.output,
      counted: !!quota?.counted,
    });
    await logAiJob({
      uid, caseId: caseId ?? null, taskCode: taskCode ?? null,
      inputTokens: result.usage.input, outputTokens: result.usage.output,
      model: MODEL || DEFAULT_MODEL[PROVIDER], counted: !!quota?.counted,
    });

    return {
      ok: true,
      data,
      usage: result.usage,
      provider: PROVIDER,
      model: MODEL || DEFAULT_MODEL[PROVIDER],
      // 讓畫面即時更新「剩幾次」
      quotaUsed: quota?.quotaUsed ?? null,
      quotaTotal: quota?.quotaTotal ?? null,
      counted: !!quota?.counted,
    };
  },
);

/**
 * redeemCode — 兌換課程授權碼。
 * 一人一碼：碼綁定 uid 後，別人拿到同一組也用不了；停權只要把該碼標記 revoked。
 */
export const redeemCode = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', '請先登入。');
  const r = await doRedeem(req.auth.uid, req.auth.token?.email ?? null, req.data?.code);
  logger.info('授權碼兌換成功', { uid: req.auth.uid, cohort: r.cohort });
  return { ok: true, ...r };
});

/** myAccess — 讀自己的授權與剩餘次數，畫面用來顯示「還剩幾次」。 */
export const myAccess = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', '請先登入。');
  const a = await getAccess(req.auth.uid);
  if (!a) return { ok: true, hasCode: false };
  return {
    ok: true,
    hasCode: true,
    cohort: a.cohort ?? null,
    quotaTotal: a.quotaTotal ?? 0,
    quotaUsed: a.quotaUsed ?? 0,
    isInstructor: a.isInstructor === true,
  };
});

/**
 * issueCodes — 批次產碼。限 Super Admin。
 * 碼的格式刻意避開容易看錯的字元（0/O、1/I），因為要用唸的或手抄。
 */
export const issueCodes = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', '請先登入。');

  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();
  const me = await db.collection('counselors').doc(req.auth.uid).get();
  if (!me.exists || me.data().isSuperAdmin !== true || me.data().isActive !== true) {
    throw new HttpsError('permission-denied', '只有管理者可以產生授權碼。');
  }

  const { cohort, count = 1, quota = 30, isInstructor = false } = req.data || {};
  if (!cohort) throw new HttpsError('invalid-argument', '請指定梯次名稱。');
  const n = Math.min(Math.max(Number(count) || 1, 1), 200);

  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 去掉 O/0/I/1
  const rand = (len) => Array.from(
    { length: len },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join('');

  const codes = [];
  const batch = db.batch();
  for (let i = 0; i < n; i++) {
    const code = `ORMAP-${rand(4)}-${rand(4)}`;
    batch.set(db.collection('jd_codes').doc(code), {
      cohort,
      quotaTotal: Number(quota) || 30,
      isInstructor: isInstructor === true,
      redeemedBy: null,
      redeemedAt: null,
      revoked: false,
      createdAt: new Date().toISOString(),
      createdBy: req.auth.uid,
    });
    codes.push(code);
  }
  await batch.commit();
  logger.info('產生授權碼', { uid: req.auth.uid, cohort, count: n, isInstructor });
  return { ok: true, codes };
});

/** listCodes — 列出某梯次的授權碼與使用狀態。限 Super Admin。 */
export const listCodes = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', '請先登入。');
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();
  const me = await db.collection('counselors').doc(req.auth.uid).get();
  if (!me.exists || me.data().isSuperAdmin !== true || me.data().isActive !== true) {
    throw new HttpsError('permission-denied', '只有管理者可以查看授權碼。');
  }

  const { cohort } = req.data || {};
  let q = db.collection('jd_codes');
  if (cohort) q = q.where('cohort', '==', cohort);
  const snap = await q.limit(500).get();

  // 用量要從 jd_users 反查，因為碼上只記綁定了誰
  const rows = await Promise.all(snap.docs.map(async (d) => {
    const c = d.data();
    let used = null;
    if (c.redeemedBy) {
      const u = await db.collection('jd_users').doc(c.redeemedBy).get();
      if (u.exists) used = { quotaUsed: u.data().quotaUsed ?? 0, email: u.data().email ?? null };
    }
    return {
      code: d.id,
      cohort: c.cohort ?? null,
      quotaTotal: c.quotaTotal ?? 0,
      isInstructor: c.isInstructor === true,
      revoked: c.revoked === true,
      redeemedBy: c.redeemedBy ?? null,
      redeemedEmail: used?.email ?? null,
      quotaUsed: used?.quotaUsed ?? null,
      createdAt: c.createdAt ?? null,
    };
  }));
  rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const cohorts = [...new Set(rows.map(r => r.cohort).filter(Boolean))];
  return { ok: true, rows, cohorts };
});

/** setCodeRevoked — 停權或恢復一組授權碼。限 Super Admin。 */
export const setCodeRevoked = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', '請先登入。');
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();
  const me = await db.collection('counselors').doc(req.auth.uid).get();
  if (!me.exists || me.data().isSuperAdmin !== true || me.data().isActive !== true) {
    throw new HttpsError('permission-denied', '只有管理者可以停權授權碼。');
  }
  const { code, revoked } = req.data || {};
  if (!code) throw new HttpsError('invalid-argument', '缺少授權碼。');
  await db.collection('jd_codes').doc(String(code)).update({ revoked: revoked === true });
  logger.info('授權碼狀態變更', { uid: req.auth.uid, code, revoked: revoked === true });
  return { ok: true };
});
