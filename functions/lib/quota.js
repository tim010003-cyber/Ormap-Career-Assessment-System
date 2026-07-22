/**
 * quota.js — 課程授權碼與 AI 配額
 * =====================================================================
 * 規格：PRD/職務設計App_課程授權與AI配額_工作包_v1_2026-07-22.md
 *
 * 兩個核心決定
 *   1. 扣配額一定在**交易**內完成，而且在呼叫供應商**之前**。
 *      先扣再打，失敗才退。反過來做的話，兩個請求同時進來就會超扣。
 *   2. 整合層（SYNTH-01）不計入使用者配額。那是系統為了整理品質自己跑的，
 *      使用者按不到也看不到，算他頭上會讓「剩幾次」這個數字說謊。
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

/** 不計入使用者配額的任務 */
const FREE_TASKS = new Set(['SYNTH-01']);
export const isFreeTask = (taskCode) => FREE_TASKS.has(taskCode);

const db = () => getFirestore();

/**
 * 兌換課程授權碼，把它綁到目前登入的 uid。
 * 一人一碼：redeemedBy 一旦寫入就不可更改，別人拿到同一組也用不了。
 */
export async function redeemCode(uid, email, rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) throw new HttpsError('invalid-argument', '請輸入授權碼。');

  const codeRef = db().collection('jd_codes').doc(code);
  const userRef = db().collection('jd_users').doc(uid);

  return db().runTransaction(async (tx) => {
    const [codeSnap, userSnap] = await Promise.all([tx.get(codeRef), tx.get(userRef)]);

    if (!codeSnap.exists) {
      throw new HttpsError('not-found', '找不到這組授權碼，請確認有沒有打錯。');
    }
    const c = codeSnap.data();

    if (c.revoked === true) {
      throw new HttpsError('permission-denied', '這組授權碼已停用。');
    }
    if (c.redeemedBy && c.redeemedBy !== uid) {
      throw new HttpsError('already-exists', '這組授權碼已經被其他帳號使用了。');
    }
    if (userSnap.exists && userSnap.data().code && userSnap.data().code !== code) {
      throw new HttpsError('failed-precondition', '這個帳號已經兌換過其他授權碼了。');
    }

    const now = FieldValue.serverTimestamp();
    if (!c.redeemedBy) {
      tx.update(codeRef, { redeemedBy: uid, redeemedAt: now });
    }
    // 重複兌換同一組碼不重設用量，避免有人靠重按來刷次數
    tx.set(userRef, {
      code,
      cohort: c.cohort ?? null,
      quotaTotal: c.quotaTotal ?? 0,
      quotaUsed: userSnap.exists ? (userSnap.data().quotaUsed ?? 0) : 0,
      isInstructor: c.isInstructor === true,
      redeemedAt: userSnap.exists ? (userSnap.data().redeemedAt ?? now) : now,
      email: email ?? null,
    }, { merge: true });

    return {
      cohort: c.cohort ?? null,
      quotaTotal: c.quotaTotal ?? 0,
      quotaUsed: userSnap.exists ? (userSnap.data().quotaUsed ?? 0) : 0,
      isInstructor: c.isInstructor === true,
    };
  });
}

/** 讀取目前的授權與用量。沒兌換過回 null。 */
export async function getAccess(uid) {
  const snap = await db().collection('jd_users').doc(uid).get();
  return snap.exists ? snap.data() : null;
}

/**
 * 呼叫 AI 之前先扣一次配額。
 * 講師與免計次任務直接放行，不動計數。
 * @returns {{counted:boolean, quotaUsed:number, quotaTotal:number, isInstructor:boolean}}
 */
export async function consumeQuota(uid, taskCode) {
  const userRef = db().collection('jd_users').doc(uid);

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new HttpsError(
        'permission-denied',
        '還沒有輸入課程授權碼。輸入之後才能使用 AI 整理。',
      );
    }
    const u = snap.data();

    // 講師不扣次數；整合層是系統自己跑的，也不算在使用者頭上
    if (u.isInstructor === true || isFreeTask(taskCode)) {
      return {
        counted: false,
        quotaUsed: u.quotaUsed ?? 0,
        quotaTotal: u.quotaTotal ?? 0,
        isInstructor: u.isInstructor === true,
      };
    }

    const used = u.quotaUsed ?? 0;
    const total = u.quotaTotal ?? 0;
    if (used >= total) {
      throw new HttpsError(
        'resource-exhausted',
        `AI 整理次數已用完（${used}／${total}）。人工填寫、修改與下載都不受影響。`,
      );
    }

    tx.update(userRef, { quotaUsed: used + 1 });
    return { counted: true, quotaUsed: used + 1, quotaTotal: total, isInstructor: false };
  });
}

/**
 * 供應商失敗時把配額退回去。
 * 使用者不該為系統錯誤付費——這是刻意的設計，不是漏洞。
 */
export async function refundQuota(uid) {
  try {
    await db().collection('jd_users').doc(uid)
      .update({ quotaUsed: FieldValue.increment(-1) });
  } catch { /* 退款失敗不該讓主要錯誤被蓋掉 */ }
}

/** 用量稽核。只有後端寫得到，使用者讀不到。 */
export async function logAiJob(entry) {
  try {
    await db().collection('jd_ai_logs').add({ ...entry, at: FieldValue.serverTimestamp() });
  } catch { /* 稽核失敗不影響使用者流程 */ }
}
