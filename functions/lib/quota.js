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
 *
 * 一碼一人：redeemedBy 一旦寫入就不可更改，別人拿到同一組也用不了。
 *
 * 一人可以多碼（2026-07-23 使用者決策）。原本是硬性一人一碼，次數用完就
 * 完全沒有補充管道——使用者手上有新碼卻兌換不了，只能眼睜睜看著工具停擺。
 * 現在改成**加值**：每兌換一組新碼，就把它的次數加到現有額度上。
 *
 * 防濫用靠的是碼本身，不是帳號：
 *   - 一組碼的 redeemedBy 只會被寫入一次，所以同一組碼只加得了一次值。
 *   - 重按同一組已兌換的碼是冪等的，不會重複加值，也不會重設用量。
 * 因此「已兌換的碼不可刪除」是這個模型的必要條件——碼被刪掉，同樣的字串
 * 就能重新產生並再兌換一次，加值次數會被無限重放。deleteCode 有擋這件事。
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

    const u = userSnap.exists ? userSnap.data() : null;
    const prevTotal = u?.quotaTotal ?? 0;
    const prevUsed = u?.quotaUsed ?? 0;
    const now = FieldValue.serverTimestamp();

    // 這組碼先前就已經由本人兌換過：冪等，不加值也不重設用量。
    // 使用者重按或重整頁面都會走到這裡，不能因此多送次數。
    const alreadyMine = c.redeemedBy === uid;

    if (!alreadyMine) {
      tx.update(codeRef, { redeemedBy: uid, redeemedAt: now });
    }

    const nextTotal = alreadyMine ? prevTotal : prevTotal + (c.quotaTotal ?? 0);
    // 講師身分只會被加上，不會被後兌換的學員碼降級
    const nextInstructor = (u?.isInstructor === true) || c.isInstructor === true;

    tx.set(userRef, {
      code,                                   // 最近一次兌換的碼（沿用既有欄位）
      codes: FieldValue.arrayUnion(code),     // 全部兌換過的碼，供稽核與後台反查
      cohort: c.cohort ?? null,
      quotaTotal: nextTotal,
      quotaUsed: prevUsed,
      isInstructor: nextInstructor,
      redeemedAt: u?.redeemedAt ?? now,
      email: email ?? null,
    }, { merge: true });

    return {
      cohort: c.cohort ?? null,
      quotaTotal: nextTotal,
      quotaUsed: prevUsed,
      isInstructor: nextInstructor,
      // 讓畫面能誠實說「加了幾次」還是「這張碼先前就用過了」
      added: alreadyMine ? 0 : (c.quotaTotal ?? 0),
      alreadyRedeemed: alreadyMine,
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
