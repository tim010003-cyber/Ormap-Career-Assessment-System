// ═══════════════════════════════════════════════════════════════
// firebase-init.js
// 全站共用的 Firebase 初始化模組
// ───────────────────────────────────────────────────────────────
// 唯一事實來源:本檔的 firebaseConfig
//
// 提供兩個 export:
//   auth — Firebase Auth 實例(給 onAuthStateChanged / signInWithPopup 等用)
//   db   — Firestore 實例(給 getDoc / setDoc / collection 等用)
//
// 使用情境:
//   各 HTML 在 <script type="module"> 開頭 import:
//     import { auth, db } from './firebase-init.js';
//     // tools/ 子目錄請改寫 '../firebase-init.js'
//
//   其他 firebase SDK 函式(onAuthStateChanged / signInWithPopup /
//   getDocs / setDoc 等)仍由各檔自行從 gstatic CDN import,
//   本模組只統一處理「連線初始化」這件事。
//
// 設計決定:
//   - 只 export auth 和 db,不 export app(避免多重 init 風險)
//   - 不在這裡 import auth/firestore 的「動詞函式」,避免綁死各頁需求
//
// PRD 對應:v3.7 Phase 9 / 審計報告 M4
// 建立日期:2026-04-27(Phase 9)
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDI_joRjSRWZ5qW9sr2rkpQ6o2q-ORhicQ",
  authDomain: "careervalue-ormap.firebaseapp.com",
  projectId: "careervalue-ormap",
  storageBucket: "careervalue-ormap.firebasestorage.app",
  messagingSenderId: "883599167982",
  appId: "1:883599167982:web:6dee33f8abf03de9b53eff"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
