// ═══════════════════════════════════════════════════════════════
// config.js
// 全站共用的常數設定模組
// ───────────────────────────────────────────────────────────────
// 提供全站共用的小常數。
// 不放 Firebase 設定(已在 firebase-init.js)
// 也不放 GAS 設定(已在 gas-mailer.js)。
//
// 提供的 export:
//   CONFIG_COUNSELOR_NAME — 諮詢師預設顯示名稱(displayName 缺失時的 fallback)
//
// 使用情境:
//   import { CONFIG_COUNSELOR_NAME } from './config.js';
//   // tools/ 子目錄請改寫 '../config.js'
//   const name = currentUser?.displayName || CONFIG_COUNSELOR_NAME;
//
// 設計決定:
//   - 未來新增的全站常數一律放這裡(避免散在各檔重複)
//   - 不放敏感資訊(API key 等),敏感資訊一律放對應的服務模組
//   - 未來若要改成「每位諮詢師有自己的預設名」,
//     此檔退役、改由 counselors/{uid} 文件提供
//
// PRD 對應:v3.7 Phase 9
// 建立日期:2026-04-27(Phase 9)
// ═══════════════════════════════════════════════════════════════

export const CONFIG_COUNSELOR_NAME = "何昆陽";
