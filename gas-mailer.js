// ═══════════════════════════════════════════════════════════════
// gas-mailer.js
// 全站共用的 GAS 信件發送模組
// ───────────────────────────────────────────────────────────────
// 唯一事實來源:本檔的 GAS_MAILER_URL
//
// 提供兩個 export:
//   GAS_MAILER_URL          — Google Apps Script 部署網址
//   callGasMailer(type,data) — 觸發 GAS 寄信的方法
//
// 使用情境:
//   counselors / whiteboard / tools/twa / tools/hti 等需寄信的頁面:
//     import { callGasMailer } from './gas-mailer.js';
//     // tools/ 子目錄請改寫 '../gas-mailer.js'
//     await callGasMailer('invite_student', { to: ..., ... });
//
// type 對應的四種信件:
//   invite_counselor      — 諮詢師邀請信
//   invite_student        — 學員白板邀請信
//   assessment_completed  — 學員評測完成通知
//   report_delivery       — 諮詢結束後報告寄發
//
// 設計決定:
//   - 用 new Image() 觸發 GET → 天然跟著 GAS 的 302 redirect、
//     繞開瀏覽器跨網域(CORS)限制
//     (fetch + no-cors 對 GAS redirect 會靜默失敗,這是踩過的坑)
//   - 永遠 resolve(true),呼叫端不需處理失敗(fire-and-forget)
//   - 3 秒 timeout 保護,避免使用者卡在 UI
//   - 開頭檢查 URL 設定,避免 URL 還是預設值就亂寄信
//
// PRD 對應:v3.7 Phase 9 / 審計報告 M1 + M3 + L4
// 建立日期:2026-04-27(Phase 9,合併 4 套實作的完整版基準)
// ═══════════════════════════════════════════════════════════════

export const GAS_MAILER_URL = "https://script.google.com/macros/s/AKfycbzyTam8pCWA9GPAfvr9HeKg5tUHANRKefjGN5FXFzWdaZlkudnqhFfmUfKY_smIWQyRMg/exec";

export async function callGasMailer(type, data) {
  if (!GAS_MAILER_URL || GAS_MAILER_URL.includes("__")) {
    console.warn("[GAS Mailer] URL 尚未設定"); return false;
  }
  return new Promise((resolve) => {
    // 用 Image() 觸發 GET,天然跟著 redirect、完全沒有 CORS 問題
    const params = new URLSearchParams({ type, payload: JSON.stringify(data) });
    const img = new Image();
    img.onload  = () => resolve(true);
    img.onerror = () => resolve(true); // GAS 回傳 JSON 非圖片,onerror 是正常的
    img.src = `${GAS_MAILER_URL}?${params.toString()}`;
    // 3 秒 timeout 保護
    setTimeout(() => resolve(true), 3000);
  });
}
