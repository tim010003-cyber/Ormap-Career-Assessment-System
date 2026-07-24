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

/**
 * Firestore Timestamp → ISO 字串。
 * callable 的回傳會被 JSON 序列化，Timestamp 直接丟出去會變成
 * {_seconds, _nanoseconds}，前端還要再解一次，不如在這裡就轉好。
 * 有些欄位當初是直接存字串（例如 createdAt），所以要能同時吃兩種。
 */
const tsToIso = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (typeof v._seconds === 'number') return new Date(v._seconds * 1000).toISOString();
  return null;
};

/**
 * Super Admin 檢查。四個管理用 function 各自複製過一次，
 * 新增刪除與標記之後就有六份，錯一個地方就是權限漏洞，收成一個。
 */
async function assertSuperAdmin(req, action) {
  if (!req.auth) throw new HttpsError('unauthenticated', '請先登入。');
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();
  const me = await db.collection('counselors').doc(req.auth.uid).get();
  if (!me.exists || me.data().isSuperAdmin !== true || me.data().isActive !== true) {
    throw new HttpsError('permission-denied', `只有管理者可以${action}。`);
  }
  return db;
}

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
  const db = await assertSuperAdmin(req, '產生授權碼');

  // 解構的預設值也要是 60。之前只改了下面的 `|| 60`，但呼叫端沒帶 quota 時
  // 這裡先給了 30，Number(30)||60 還是 30，等於那次改動沒生效。
  const { cohort, count = 1, quota = 60, isInstructor = false } = req.data || {};
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
      // 60 次。實測一個欄位常要按到近 30 次，30 次連一輪都跑不完，
      // 使用者拿到報告後想回頭修就沒額度了。（2026-07-22 使用者決策）
      quotaTotal: Number(quota) || 60,
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
  const db = await assertSuperAdmin(req, '查看授權碼');

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
      // 「已發出」是人工標記：碼交給對方了，但對方還沒兌換。
      // 沒有這個狀態就分不出「還在我手上」與「已經給人、只是還沒用」，
      // 而後者被誤刪等於把已經交付的商品收回去。
      sent: c.sent === true,
      sentAt: tsToIso(c.sentAt),
      redeemedAt: tsToIso(c.redeemedAt),
    };
  }));
  rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const cohorts = [...new Set(rows.map(r => r.cohort).filter(Boolean))];
  return { ok: true, rows, cohorts };
});

/** setCodeRevoked — 停權或恢復一組授權碼。限 Super Admin。 */
export const setCodeRevoked = onCall(async (req) => {
  const db = await assertSuperAdmin(req, '停權授權碼');
  const { code, revoked } = req.data || {};
  if (!code) throw new HttpsError('invalid-argument', '缺少授權碼。');
  await db.collection('jd_codes').doc(String(code)).update({ revoked: revoked === true });
  logger.info('授權碼狀態變更', { uid: req.auth.uid, code, revoked: revoked === true });
  return { ok: true };
});

/**
 * deleteCode — 刪除一組尚未被兌換的授權碼。限 Super Admin。
 *
 * 只讓刪「還沒有人用過」的碼，是產碼手滑時的清理工具。
 *
 * 已兌換的碼一律不刪，這不只是保護紀錄，而是配額模型的必要條件：
 * 兌換加值的防重放靠的是碼上的 redeemedBy。碼一旦被刪，同樣的字串就能
 * 重新產生、重新兌換，加值次數會被無限重放。要停用請改用「停權」。
 *
 * 注意：停權只擋「之後的兌換」。已經兌換過的人，額度存在 jd_users，
 * consumeQuota 不會回頭看碼的狀態，所以停權不會收回已發出的次數。
 */
export const deleteCode = onCall(async (req) => {
  const db = await assertSuperAdmin(req, '刪除授權碼');
  const code = String(req.data?.code || '').trim().toUpperCase();
  if (!code) throw new HttpsError('invalid-argument', '缺少授權碼。');

  const ref = db.collection('jd_codes').doc(code);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', '找不到這組授權碼。');
  if (snap.data().redeemedBy) {
    throw new HttpsError(
      'failed-precondition',
      '這組授權碼已經被兌換，不能刪除。若要停止使用請改用「停權」。',
    );
  }

  const c = snap.data();
  /*
   * 已發出的碼要求呼叫端明確表態。
   *
   * 「未使用」不等於「還在我手上」——碼可能早就寄給學員了，只是對方還沒兌換。
   * 那種碼被誤刪，等於把已經交付出去的商品收回去，而且對方要到兌換時才會發現。
   * 所以刪除已標記為「已發出」的碼，必須帶 confirmSent，前端會另外要求打字確認。
   */
  if (c.sent === true && req.data?.confirmSent !== true) {
    throw new HttpsError(
      'failed-precondition',
      '這組授權碼已標記為「已發出」，可能已經交給對方了。確定要刪除請再確認一次。',
    );
  }

  await ref.delete();
  logger.info('授權碼已刪除', { uid: req.auth.uid, code, wasSent: c.sent === true, cohort: c.cohort ?? null });
  return { ok: true };
});

/**
 * markCodeSent — 標記／取消標記「已發出」。限 Super Admin。
 *
 * 純粹是給管理者自己記帳用的狀態，系統不會依它改變任何行為。
 * 存在的理由只有一個：把「還在我手上」與「已經給人、只是還沒兌換」分開，
 * 否則清單上兩者都顯示「未使用」，刪除時無從判斷哪些碰不得。
 */
export const markCodeSent = onCall(async (req) => {
  const db = await assertSuperAdmin(req, '標記授權碼');
  const code = String(req.data?.code || '').trim().toUpperCase();
  if (!code) throw new HttpsError('invalid-argument', '缺少授權碼。');
  const sent = req.data?.sent === true;

  const { FieldValue } = await import('firebase-admin/firestore');
  await db.collection('jd_codes').doc(code).update(
    sent ? { sent: true, sentAt: FieldValue.serverTimestamp() }
         : { sent: false, sentAt: null },
  );
  logger.info('授權碼發出狀態變更', { uid: req.auth.uid, code, sent });
  return { ok: true };
});

/* =====================================================================
 * 文章發布
 * ---------------------------------------------------------------------
 * 文章的真實來源是 repo 裡的 content/posts/*.md。這三支 function 讓管理者
 * 在後臺貼上 Markdown 就能寫進 repo，CI 接手產生靜態頁並部署。
 *
 * 使用者 2026-07-24 決策：發布＝直接上線（commit 進 main 會觸發 live 部署）。
 * 前端必須明確告知這件事，不能讓人以為只是存檔。
 *
 * 規格：PRD/原味藍圖_內容平台與部落格_需求規格_v1_2026-07-24.md §7
 * ===================================================================== */

/** GitHub 權杖。fine-grained PAT，只給本 repo 的 Contents 讀寫。 */
const GITHUB_TOKEN = defineSecret('GITHUB_TOKEN');

/**
 * publishPost — 新增或更新一篇文章。限 Super Admin。
 *
 * draft: true 一樣會寫進 repo，但產生器會跳過它，所以不會出現在網站上。
 * 這就是「存草稿」與「取消發布」的實作方式——不刪檔案，只是不產生。
 */
export const publishPost = onCall({ secrets: [GITHUB_TOKEN] }, async (req) => {
  await assertSuperAdmin(req, '發布文章');

  const { validatePost, writePost } = await import('./lib/blog.js');
  const post = validatePost(req.data);
  const email = String(req.auth.token?.email || '');

  const result = await writePost(GITHUB_TOKEN.value(), post, email);
  logger.info('文章已送出', {
    uid: req.auth.uid, slug: post.slug, draft: post.draft, isNew: result.isNew,
  });
  return { ok: true, ...result };
});

/** listBlogPosts — 後臺清單。限 Super Admin。 */
export const listBlogPosts = onCall({ secrets: [GITHUB_TOKEN] }, async (req) => {
  await assertSuperAdmin(req, '查看文章清單');
  const { listPosts } = await import('./lib/blog.js');
  return { ok: true, posts: await listPosts(GITHUB_TOKEN.value()) };
});

/** getBlogPost — 讀回一篇文章供編輯。限 Super Admin。 */
export const getBlogPost = onCall({ secrets: [GITHUB_TOKEN] }, async (req) => {
  await assertSuperAdmin(req, '編輯文章');
  const { readPost } = await import('./lib/blog.js');
  return { ok: true, post: await readPost(GITHUB_TOKEN.value(), req.data?.slug) };
});
