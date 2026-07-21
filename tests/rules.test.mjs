// ═══════════════════════════════════════════════════════════════
// tests/rules.test.mjs
// Firestore 安全規則的自動化回歸測試
// ───────────────────────────────────────────────────────────────
// 為什麼需要這個
//   這個專案沒有伺服器端，firestore.rules 是唯一的存取控制層。
//   規則寫錯不會有任何錯誤訊息 —— 只會安靜地讓不該進來的人進來。
//   這份測試把「誰可以做什麼」變成可執行的斷言，改規則就能立刻驗證。
//
// 怎麼跑
//   npm run test:rules
//   （會自動啟動 Firestore 模擬器，跑完自動關閉；不碰任何正式資料）
//
// 需求：Node 18+ 與 Java（模擬器所需）。
//
// 命名規則
//   allow*  = 應該被允許的正常流程（防止規則改過頭把使用者鎖在外面）
//   deny*   = 應該被拒絕的攻擊路徑（防止規則被改鬆）
// ═══════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, getDocs, query, where,
} from 'firebase/firestore';

let testEnv;

// 三個測試身分
const SA_UID = 'uid_superadmin';
const COUNSELOR_UID = 'uid_counselor';
const STUDENT_UID = 'uid_student';
const OTHER_UID = 'uid_other';
const SUSPENDED_UID = 'uid_suspended';

const ATTACKER_EMAIL = 'attacker@example.com';
const INVITED_EMAIL = 'invited@example.com';
const INVITED_PENDING_KEY = 'invited@example_com'; // pendingKeyForEmail 的結果

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'careervalue-ormap-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

// 每個測試前重建乾淨的種子資料（繞過規則寫入）
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'counselors', SA_UID), {
      uid: SA_UID, email: 'sa@example.com', name: '超級管理員',
      isActive: true, isSuperAdmin: true,
    });
    await setDoc(doc(db, 'counselors', COUNSELOR_UID), {
      uid: COUNSELOR_UID, email: 'counselor@example.com', name: '諮詢師',
      isActive: true, isSuperAdmin: false,
    });
    // 已停權的諮詢師（用於驗證不得自行復權）
    await setDoc(doc(db, 'counselors', SUSPENDED_UID), {
      uid: SUSPENDED_UID, email: 'suspended@example.com', name: '已停權',
      isActive: false, isSuperAdmin: false,
    });
    // 一份尚未被領取的邀請
    await setDoc(doc(db, 'counselors', INVITED_PENDING_KEY), {
      email: INVITED_EMAIL, name: '受邀者', isActive: true, pending: true,
    });
    // 學員的評測結果：未綁定諮詢師
    await setDoc(doc(db, 'assessments', 'report_student'), {
      uid: STUDENT_UID, toolType: 'TWA', counselorAccess: false,
      summary: { text: 'x', status: '已完成' },
    });
    // 學員的另一份：已綁定 COUNSELOR_UID 且開放授權
    await setDoc(doc(db, 'assessments', 'report_shared'), {
      uid: STUDENT_UID, toolType: 'HTI',
      assignedCounselorUid: COUNSELOR_UID, counselorAccess: true,
    });
    await setDoc(doc(db, 'user_progress', `${STUDENT_UID}_TWA`), { data: '{}' });
  });
});

const asUser = (uid, token = {}) =>
  testEnv.authenticatedContext(uid, token).firestore();
const asGuest = () => testEnv.unauthenticatedContext().firestore();

// ───────────────────────────────────────────────────────────────
// P0-A：自我提權為 Super Admin
// ───────────────────────────────────────────────────────────────
describe('P0-A｜counselors 自我提權', () => {
  it('deny：任何登入者不得自建 Super Admin 身分', async () => {
    const db = asUser(OTHER_UID, { email: ATTACKER_EMAIL });
    await assertFails(setDoc(doc(db, 'counselors', OTHER_UID), {
      uid: OTHER_UID, isActive: true, isSuperAdmin: true,
    }));
  });

  it('deny：任何登入者不得自建一般諮詢師身分（無邀請）', async () => {
    const db = asUser(OTHER_UID, { email: ATTACKER_EMAIL });
    await assertFails(setDoc(doc(db, 'counselors', OTHER_UID), {
      uid: OTHER_UID, isActive: true, isSuperAdmin: false,
    }));
  });

  it('deny：不得冒用他人的邀請文件遷移', async () => {
    const db = asUser(OTHER_UID, { email: ATTACKER_EMAIL });
    await assertFails(setDoc(doc(db, 'counselors', OTHER_UID), {
      uid: OTHER_UID, isActive: true, isSuperAdmin: false,
      migratedFrom: INVITED_PENDING_KEY, // 邀請的是 invited@，不是攻擊者
    }));
  });

  it('deny：持有合法邀請者也不得順手自帶 Super Admin', async () => {
    const db = asUser(OTHER_UID, { email: INVITED_EMAIL });
    await assertFails(setDoc(doc(db, 'counselors', OTHER_UID), {
      uid: OTHER_UID, isActive: true, isSuperAdmin: true,
      migratedFrom: INVITED_PENDING_KEY,
    }));
  });

  it('allow：受邀者首次登入可完成遷移（正常流程不被鎖死）', async () => {
    const db = asUser(OTHER_UID, { email: INVITED_EMAIL });
    await assertSucceeds(setDoc(doc(db, 'counselors', OTHER_UID), {
      email: INVITED_EMAIL, name: '受邀者', isActive: true,
      pending: false, uid: OTHER_UID, migratedFrom: INVITED_PENDING_KEY,
    }));
  });

  it('deny：諮詢師不得把自己改成 Super Admin', async () => {
    const db = asUser(COUNSELOR_UID, { email: 'counselor@example.com' });
    await assertFails(updateDoc(doc(db, 'counselors', COUNSELOR_UID), {
      isSuperAdmin: true,
    }));
  });

  it('deny：被停權者不得自行復權', async () => {
    const db = asUser(SUSPENDED_UID, { email: 'suspended@example.com' });
    await assertFails(updateDoc(doc(db, 'counselors', SUSPENDED_UID), {
      isActive: true,
    }));
  });

  it('deny：被停權者不得再讀寫諮詢師備註', async () => {
    const db = asUser(SUSPENDED_UID, { email: 'suspended@example.com' });
    await assertFails(getDoc(doc(db, 'counselor_notes', STUDENT_UID)));
  });

  it('allow：登入時更新 lastLoginAt / name（admin.html 既有行為）', async () => {
    const db = asUser(COUNSELOR_UID, { email: 'counselor@example.com' });
    await assertSucceeds(updateDoc(doc(db, 'counselors', COUNSELOR_UID), {
      lastLoginAt: new Date(), name: '諮詢師新名字',
    }));
  });

  it('allow：Super Admin 仍可建立邀請與調整權限（後台不被鎖死）', async () => {
    const db = asUser(SA_UID, { email: 'sa@example.com' });
    await assertSucceeds(setDoc(doc(db, 'counselors', 'newinvite@example_com'), {
      email: 'newinvite@example.com', isActive: true, pending: true,
    }));
    await assertSucceeds(updateDoc(doc(db, 'counselors', COUNSELOR_UID), {
      isSuperAdmin: true,
    }));
  });
});

// ───────────────────────────────────────────────────────────────
// P0-B：透過 update 竊取報告綁定
// ───────────────────────────────────────────────────────────────
describe('P0-B｜assessments 綁定竊取', () => {
  it('deny：諮詢師不得把他人報告綁到自己名下', async () => {
    const db = asUser(COUNSELOR_UID, { email: 'counselor@example.com' });
    await assertFails(updateDoc(doc(db, 'assessments', 'report_student'), {
      assignedCounselorUid: COUNSELOR_UID,
    }));
  });

  it('deny：諮詢師不得自行打開他人報告的授權開關', async () => {
    const db = asUser(COUNSELOR_UID, { email: 'counselor@example.com' });
    await assertFails(updateDoc(doc(db, 'assessments', 'report_student'), {
      counselorAccess: true,
    }));
  });

  it('deny：本人不得竄改 uid 或其他欄位', async () => {
    const db = asUser(STUDENT_UID);
    await assertFails(updateDoc(doc(db, 'assessments', 'report_student'), {
      uid: OTHER_UID,
    }));
    await assertFails(updateDoc(doc(db, 'assessments', 'report_student'), {
      assignedCounselorUid: COUNSELOR_UID,
    }));
  });

  it('allow：本人可切換授權開關（dashboard.html 既有行為）', async () => {
    const db = asUser(STUDENT_UID);
    await assertSucceeds(updateDoc(doc(db, 'assessments', 'report_student'), {
      counselorAccess: true,
    }));
  });
});

// ───────────────────────────────────────────────────────────────
// 讀取範圍（SEC-004）
// ───────────────────────────────────────────────────────────────
describe('assessments 讀取範圍', () => {
  it('deny：登入者不得列舉全表', async () => {
    const db = asUser(OTHER_UID);
    await assertFails(getDocs(collection(db, 'assessments')));
  });

  it('deny：登入者不得查詢他人的報告清單', async () => {
    const db = asUser(OTHER_UID);
    await assertFails(getDocs(
      query(collection(db, 'assessments'), where('uid', '==', STUDENT_UID))
    ));
  });

  it('deny：登入者不得直接讀取他人單筆報告', async () => {
    const db = asUser(OTHER_UID);
    await assertFails(getDoc(doc(db, 'assessments', 'report_student')));
  });

  it('deny：授權撤銷後，綁定諮詢師不得再讀取單筆', async () => {
    const db = asUser(COUNSELOR_UID, { email: 'counselor@example.com' });
    await assertFails(getDoc(doc(db, 'assessments', 'report_student')));
  });

  it('allow：本人可查詢自己的報告清單（dashboard / timeline）', async () => {
    const db = asUser(STUDENT_UID);
    await assertSucceeds(getDocs(
      query(collection(db, 'assessments'), where('uid', '==', STUDENT_UID))
    ));
  });

  it('allow：諮詢師可查詢自己綁定的學員（admin.html）', async () => {
    const db = asUser(COUNSELOR_UID, { email: 'counselor@example.com' });
    await assertSucceeds(getDocs(query(
      collection(db, 'assessments'),
      where('assignedCounselorUid', '==', COUNSELOR_UID)
    )));
  });

  it('allow：Super Admin 可全表查詢（admin.html 後台）', async () => {
    const db = asUser(SA_UID, { email: 'sa@example.com' });
    await assertSucceeds(getDocs(collection(db, 'assessments')));
  });

  it('allow：綁定且授權中的諮詢師可讀單筆', async () => {
    const db = asUser(COUNSELOR_UID, { email: 'counselor@example.com' });
    await assertSucceeds(getDoc(doc(db, 'assessments', 'report_shared')));
  });
});

// ───────────────────────────────────────────────────────────────
// 建立與刪除（SEC-003）
// ───────────────────────────────────────────────────────────────
describe('assessments 建立與刪除', () => {
  it('deny：未登入不得建立評測結果', async () => {
    const db = asGuest();
    await assertFails(addDoc(collection(db, 'assessments'), {
      uid: 'guest', toolType: 'TWA',
    }));
  });

  it('deny：不得建立掛在他人名下的結果', async () => {
    const db = asUser(OTHER_UID);
    await assertFails(addDoc(collection(db, 'assessments'), {
      uid: STUDENT_UID, toolType: 'TWA',
    }));
  });

  it('deny：不得在建立時自行指定審閱諮詢師', async () => {
    const db = asUser(OTHER_UID);
    await assertFails(addDoc(collection(db, 'assessments'), {
      uid: OTHER_UID, toolType: 'TWA', assignedCounselorUid: OTHER_UID,
    }));
  });

  it('allow：登入者可建立自己的 TWA / HTI 結果', async () => {
    const db = asUser(STUDENT_UID);
    await assertSucceeds(addDoc(collection(db, 'assessments'), {
      uid: STUDENT_UID, toolType: 'TWA', counselorAccess: false,
    }));
    await assertSucceeds(addDoc(collection(db, 'assessments'), {
      uid: STUDENT_UID, toolType: 'HTI', counselorAccess: false,
    }));
  });

  it('deny：他人不得刪除；allow：本人可刪除', async () => {
    await assertFails(deleteDoc(doc(asUser(OTHER_UID), 'assessments', 'report_student')));
    await assertSucceeds(deleteDoc(doc(asUser(STUDENT_UID), 'assessments', 'report_student')));
  });
});

// ───────────────────────────────────────────────────────────────
// 草稿隔離（SEC-001）
// ───────────────────────────────────────────────────────────────
describe('user_progress 草稿隔離', () => {
  it('deny：不得讀取他人草稿', async () => {
    const db = asUser(OTHER_UID);
    await assertFails(getDoc(doc(db, 'user_progress', `${STUDENT_UID}_TWA`)));
  });

  it('deny：不得寫入他人草稿', async () => {
    const db = asUser(OTHER_UID);
    await assertFails(setDoc(doc(db, 'user_progress', `${STUDENT_UID}_TWA`), { data: 'x' }));
  });

  it('allow：本人可讀寫自己的草稿', async () => {
    const db = asUser(STUDENT_UID);
    await assertSucceeds(getDoc(doc(db, 'user_progress', `${STUDENT_UID}_TWA`)));
    await assertSucceeds(setDoc(doc(db, 'user_progress', `${STUDENT_UID}_HTI`), { data: 'x' }));
  });
});

// ───────────────────────────────────────────────────────────────
// 名單與回饋的外洩面
// ───────────────────────────────────────────────────────────────
describe('counselors 名單與 feedback', () => {
  it('deny：一般登入者不得列舉諮詢師名單（含待邀請 email）', async () => {
    await assertFails(getDocs(collection(asUser(OTHER_UID), 'counselors')));
  });

  it('deny：一般登入者不得讀取他人的諮詢師文件', async () => {
    await assertFails(getDoc(doc(asUser(OTHER_UID), 'counselors', COUNSELOR_UID)));
  });

  it('allow：本人可讀自己的諮詢師文件（auth-utils 判定所需）', async () => {
    await assertSucceeds(getDoc(doc(asUser(COUNSELOR_UID), 'counselors', COUNSELOR_UID)));
  });

  it('allow：受邀者可讀自己的 pending 文件（遷移查找所需）', async () => {
    const db = asUser(OTHER_UID, { email: INVITED_EMAIL });
    await assertSucceeds(getDoc(doc(db, 'counselors', INVITED_PENDING_KEY)));
  });

  it('allow：Super Admin 可列舉名單（counselors.html）', async () => {
    await assertSucceeds(getDocs(collection(asUser(SA_UID, { email: 'sa@example.com' }), 'counselors')));
  });

  it('allow：訪客可送出意見回饋；deny：不得讀取他人回饋', async () => {
    await assertSucceeds(addDoc(collection(asGuest(), 'feedback'), { message: '測試回饋' }));
    await assertFails(getDocs(collection(asUser(OTHER_UID), 'feedback')));
  });
});
