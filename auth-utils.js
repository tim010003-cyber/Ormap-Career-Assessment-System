// ═══════════════════════════════════════════════════════════════
// auth-utils.js
// 全站共用的諮詢師 / Super Admin 權限判定模組
// ───────────────────────────────────────────────────────────────
// 唯一事實來源：Firestore 的 counselors/{uid} 文件
//
// 使用方式（在 HTML 檔案中）：
//   import { isCounselor, isSuperAdmin } from './auth-utils.js';     // 根目錄
//   import { isCounselor, isSuperAdmin } from '../auth-utils.js';    // tools/ 底下
//   const ok = await isSuperAdmin(db, user.uid);
//
// 設計決定：
//   - 呼叫者把已初始化的 db 實例傳進來，避免本檔重複 init Firebase
//   - 任何錯誤（網路斷、文件不存在、欄位缺）一律回 false（fail-safe）
//   - 不接受 email 白名單、不接受硬編碼 UID
//
// PRD 對應：v3.6 第三章 3.3「統一判定函式」
// 建立日期：2026-04-26（Phase 7.1）
// ═══════════════════════════════════════════════════════════════

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

/**
 * 判定 uid 是否為「啟用中的諮詢師」（含 Super Admin）
 * @param {Firestore} db - 已初始化的 Firestore 實例
 * @param {string} uid - 要查詢的使用者 UID
 * @returns {Promise<boolean>}
 */
export async function isCounselor(db, uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'counselors', uid));
    return snap.exists() && snap.data().isActive === true;
  } catch (e) {
    console.warn('[auth-utils] isCounselor failed:', e);
    return false;
  }
}

/**
 * 判定 uid 是否為「啟用中的 Super Admin」
 * @param {Firestore} db - 已初始化的 Firestore 實例
 * @param {string} uid - 要查詢的使用者 UID
 * @returns {Promise<boolean>}
 */
export async function isSuperAdmin(db, uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'counselors', uid));
    if (!snap.exists()) return false;
    const d = snap.data();
    return d.isActive === true && d.isSuperAdmin === true;
  } catch (e) {
    console.warn('[auth-utils] isSuperAdmin failed:', e);
    return false;
  }
}