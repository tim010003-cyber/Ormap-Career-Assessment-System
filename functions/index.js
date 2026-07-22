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
 *   ⬜ 第三步：課程授權碼與配額（redeemCode / 扣次數）
 *
 * ⚠️ 目前 jdAi() **沒有配額限制**。第三步完成前不要把網址給客戶，
 *    否則用量無上限。
 *
 * 設計規格：PRD/職務設計App_課程授權與AI配額_工作包_v1_2026-07-22.md
 */

import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';

import { complete, parseJson, isSupportedProvider, DEFAULT_MODEL } from './lib/providers.js';

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

    // 配額上線前的臨時防線。清單為空時一律拒絕——寧可不能用，
    // 不要因為忘記設定就把 Key 開放給任何登入者。
    const email = String(req.auth.token?.email || '').toLowerCase();
    if (!ALLOWLIST.includes(email)) {
      logger.warn('jdAi 被非允許清單的帳號呼叫', { uid: req.auth.uid, email });
      throw new HttpsError(
        'permission-denied',
        'AI 整理目前僅開放給指定帳號測試，課程授權碼上線後才會開放。',
      );
    }

    const { taskCode, system, user } = req.data || {};
    if (!system || !user) {
      throw new HttpsError('invalid-argument', '缺少 system 或 user 內容。');
    }
    if (!isSupportedProvider(PROVIDER)) {
      throw new HttpsError('failed-precondition', `未支援的供應商：${PROVIDER}`);
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
      // 供應商的錯誤訊息可能含有請求內容，不原樣往前端丟
      logger.error('AI 供應商呼叫失敗', { taskCode, provider: PROVIDER, message: e.message });
      throw new HttpsError('unavailable', 'AI 服務暫時無法使用，已改用內建整理。');
    }

    let data;
    try {
      data = parseJson(result.text);
    } catch (e) {
      logger.warn('模型未回傳合法 JSON', { taskCode, message: e.message });
      throw new HttpsError('internal', 'AI 回傳格式不正確，已改用內建整理。');
    }

    logger.info('jdAi 完成', {
      taskCode: taskCode || 'AI',
      uid: req.auth.uid,
      ms: Date.now() - started,
      inputTokens: result.usage.input,
      outputTokens: result.usage.output,
    });

    return {
      ok: true,
      data,
      usage: result.usage,
      provider: PROVIDER,
      model: MODEL || DEFAULT_MODEL[PROVIDER],
    };
  },
);
