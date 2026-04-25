// ═══════════════════════════════════════════════════════════════
// auth-utils.js
// 全站共用的諮詢師 / Super Admin 權限判定模組
// ───────────────────────────────────────────────────────────────
// 唯一事實來源：Firestore 的 counselors/{uid} 文件
//
// 提供三個函式：
//   isCounselor(db, uid)              — 純查 uid，是否為啟用中的諮詢師
//   isSuperAdmin(db, uid)             — 純查 uid,是否為啟用中的 Super Admin
//   migratePendingCounselor(db, uid, email)
//                                      — 把 email 命名的 pending 文件搬到 uid 命名
//
// 使用情境：
//   - whiteboard / counselors / report 等頁面 → 只需 isCounselor / isSuperAdmin
//   - admin 頁面（諮詢師受邀第一次登入入口）  → 還需要 migratePendingCounselor
//
// 設計決定：
//   - 呼叫者把已初始化的 db 實例傳進來，避免本檔重複 init Firebase
//   - 任何錯誤一律回 false（fail-safe）
//   - migratePendingCounselor 是「fire-and-forget」設計：
//     找到有效 pending 文件就立刻 return true 放行，
//     setDoc + deleteDoc 在背景執行，失敗不阻斷登入流程
//
// PRD 對應：v3.6 第三章 3.3「統一判定函式」
// 建立日期：2026-04-26（Phase 7.1 + 7.2a 擴充）
// ═══════════════════════════════════════════════════════════════

import {
  doc, getDoc, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

/**
 * 將「以 email 命名的 pending 文件」遷移到「以 uid 命名的正式文件」
 *
 * 使用情境：
 *   新諮詢師受邀後第一次登入時呼叫。系統發現他有對應的 pending 文件，
 *   就把資料搬到正式 uid 文件，並刪除舊 pending 文件。
 *
 * 行為：
 *   - 找不到對應 pending 文件 → 回 false（這個人不是受邀諮詢師）
 *   - 找到有效 pending 文件 → 立刻回 true（放行登入），背景執行搬遷
 *   - 搬遷的 deleteDoc 若失敗（例如 Rules 太嚴），會留下舊 pending 文件，
 *     下次登入再嘗試。不阻斷本次登入。
 *
 * @param {Firestore} db - 已初始化的 Firestore 實例
 * @param {string} uid - 對方剛登入後拿到的真實 UID
 * @param {string} email - 對方的 Google 帳號 email
 * @returns {Promise<boolean>}
 */
export async function migratePendingCounselor(db, uid, email) {
  if (!uid || !email) return false;
  // pending 文件的 document ID 格式：把 email 中 . # $ / [ ] 都換成 _
  const pendingKey = email.replace(/[.#$\/\[\]]/g, "_");
  try {
    const pSnap = await getDoc(doc(db, "counselors", pendingKey));
    if (!pSnap.exists()) return false;
    if (pSnap.data().isActive === false) return false;

    const data = pSnap.data();
    // 背景遷移（不 await）：寫入正式 uid 文件 → 然後刪除舊 pending 文件
    // 刪除失敗時不阻斷登入，下次登入會再試一次
    setDoc(doc(db, "counselors", uid), {
      ...data,
      uid,
      pending: false
    })
    .then(() => deleteDoc(doc(db, "counselors", pendingKey)))
    .catch((e) => {
      console.warn('[auth-utils] pending 遷移失敗，將於下次登入重試:', e);
    });

    return true; // 找到有效 pending 文件就立刻放行
  } catch (e) {
    console.warn('[auth-utils] migratePendingCounselor failed:', e);
    return false;
  }
}