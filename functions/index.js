/**
 * index.js — 原味藍圖 Cloud Functions 進入點
 * =====================================================================
 * 為什麼需要這一層
 *   AI 供應商的 API Key 不能放進瀏覽器（原始碼、DevTools、網路面板都看得到）。
 *   本機開發時 Key 放在 tools/job-design/server/ai-proxy.mjs，只有 127.0.0.1
 *   連得到；要讓線上的人也能用，同一支程式必須搬到伺服器端，Key 改存
 *   Secret Manager。這個目錄就是那支程式。
 *
 * 目前進度（第一步：骨架）
 *   ✅ 專案結構、供應商轉接層、健康檢查
 *   ⬜ jdAi()      — 帶配額的 AI 呼叫（第二、三步）
 *   ⬜ redeemCode() — 課程授權碼兌換（第三步）
 *
 * 設計規格：PRD/職務設計App_課程授權與AI配額_工作包_v1_2026-07-22.md
 *
 * 尚未部署。部署會產生費用，需使用者另行確認。
 */

import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall } from 'firebase-functions/v2/https';

initializeApp();

// 台灣的使用者，選最近的區域降低延遲；maxInstances 防止異常暴衝把帳單拉高
setGlobalOptions({
  region: 'asia-east1',
  maxInstances: 10,
});

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
