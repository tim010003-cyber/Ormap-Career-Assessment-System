/**
 * jd-store.js — 職務設計與甄選 Web App｜前端持久層（Demo 原型）
 * =====================================================================
 * 用途
 *   Demo 階段用 localStorage 儲存案例資料，並提供與規格一致的資料形狀
 *   （ModuleSubmission / FieldValue / AccessWindow / 狀態機）。
 *
 * 設計決策
 *   - 唯一持久化入口，日後可把 read/write 換成 Firestore + Cloud Functions，
 *     頁面呼叫的 API 介面不變（getCase / saveField / setModuleStatus ...）。
 *   - 每個欄位值統一形狀（對應 02 欄位字典「原始輸入／AI 整理／AI 推論／
 *     人工確認分開保存」）：{ value, source_type, ai_task, confirmed, ... }。
 *   - 時間一律存 ISO 字串（UTC），顯示端轉 Asia/Taipei。
 *   - 身分（講師／學員）為 Demo 用的本地切換，非真實 Firebase Auth。
 *
 * 對應規格：03_資料與狀態模型_v1（實體、狀態機、存取狀態）
 */

const LS_KEY = 'ormap_jobdesign_cases_v1';
const LS_IDENTITY = 'ormap_jobdesign_identity_v1';

// ── 身分（Demo）──────────────────────────────────────────
export function getIdentity() {
  return localStorage.getItem(LS_IDENTITY) || 'student'; // 'student' | 'instructor'
}
export function setIdentity(role) {
  localStorage.setItem(LS_IDENTITY, role === 'instructor' ? 'instructor' : 'student');
}

// ── 低階讀寫 ─────────────────────────────────────────────
function readAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}
function writeAll(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

/* ══════════════════ 雲端同步（Firestore） ══════════════════
 *
 * 為什麼不是把這一層直接改成 Firestore
 *   這個檔案的介面全是同步的（getCase / saveField / setModuleStatus…），
 *   而所有呼叫端都直接 `const c = S.getCase(id)` 之後一路同步操作。
 *   改成 async 等於重寫 case.html 與 index.html 的每一個呼叫點，
 *   風險遠高於這件事本身的價值。
 *
 * 實際做法
 *   localStorage 仍是**同步的工作副本**，Firestore 是同步與備份層。
 *   進頁面時先把雲端拉下來合併進本機（initCloud），之後每次寫入都
 *   延遲推一次上去。呼叫端的介面一個字都不用改。
 *
 * 合併策略：以案例為單位的 last-write-wins，比較 updated_at。
 *   同一個案例在兩台裝置上「同時」編輯，較晚存的那邊會覆蓋另一邊。
 *   這個工具是一個人依序在不同裝置上使用，不是多人協作，所以可接受；
 *   但這是刻意的取捨，不是沒想到。
 *
 * 沒登入就整層停用，全部行為與改動前完全相同。
 */

const CLOUD = 'jd_cases';
let _fb = null;            // { db, uid, fs }  未登入為 null
let _cloudReady = false;
const _dirty = new Set();
let _pushTimer = null;

/**
 * 給任何可能卡住的 Promise 一個逾時上限。
 * 雲端讀取慢或斷線時，寧可回退到本機，也不要讓畫面卡在那邊等。
 */
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function firestoreBits() {
  const [{ auth, db }, authMod, fsMod] = await Promise.all([
    import('../../firebase-init.js'),
    import('https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js'),
  ]);
  const user = auth.currentUser || await new Promise((resolve) => {
    const un = authMod.onAuthStateChanged(auth, (u) => { un(); resolve(u); });
  });
  return user ? { db, uid: user.uid, fs: fsMod } : null;
}

/**
 * 把雲端案例拉下來合併進本機。頁面在第一次讀取案例前要先 await 這個。
 *
 * 未登入、或雲端讀取失敗時**不擋畫面**：本機資料照樣能用，
 * 只是這一次沒有跨裝置同步。工具不該因為網路問題就打不開。
 */
export async function initCloud() {
  if (_cloudReady) return _fb != null;
  _cloudReady = true;
  try {
    // Auth 還原若卡住（極少見）就當未登入處理，不要拖住整頁
    _fb = await withTimeout(firestoreBits(), 6000, null);
    if (!_fb) return false;
    const { db, uid, fs } = _fb;

    // 雲端讀取是唯一真正會慢的一步。給它逾時上限，逾時就先用本機、_fb 保留，
    // 存檔照樣會嘗試上傳，只是這一次沒把雲端既有案例拉下來。
    const snap = await withTimeout(
      fs.getDocs(fs.query(fs.collection(db, CLOUD), fs.where('ownerUid', '==', uid))),
      8000, null);
    if (!snap) { console.warn('[案例同步] 雲端讀取逾時，先用本機資料'); return true; }

    const remotes = [];
    snap.forEach((d) => { const r = d.data()?.payload; if (r && r.case_id) remotes.push(r); });

    /*
     * 關鍵：讀「現在」的本機，不是進函式時的舊快照。
     * 雲端讀取那幾秒內使用者可能剛存了東西，用舊快照合併會把那筆蓋掉。
     * 逐案例比 updated_at：雲端較新才覆蓋，本機較新則排入上傳。
     */
    const local = readAll();
    let changed = false;
    for (const r of remotes) {
      const mine = local[r.case_id];
      if (!mine || (r.updated_at || '') > (mine.updated_at || '')) { local[r.case_id] = r; changed = true; }
      else if ((mine.updated_at || '') > (r.updated_at || '')) _dirty.add(r.case_id);
    }
    // 雲端沒有的本機案例＝離線期間建立或首次登入前就存在的，要上傳
    for (const id of Object.keys(local)) if (!remotes.some(r => r.case_id === id)) _dirty.add(id);

    if (changed) writeAll(local);
    if (_dirty.size) schedulePush(0);
    return true;
  } catch (e) {
    console.warn('[案例同步] 雲端讀取失敗，改用本機資料：', e?.message || e);
    _fb = null;
    return false;
  }
}

function schedulePush(delay = 1200) {
  if (!_fb || !_dirty.size) return;
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(pushDirty, delay);
}

async function pushDirty() {
  if (!_fb || !_dirty.size) return;
  const { db, uid, fs } = _fb;
  const all = readAll();
  const ids = [..._dirty];
  _dirty.clear();
  for (const id of ids) {
    const c = all[id];
    if (!c) continue;
    try {
      // 整份 payload 存成一個欄位。案例的形狀還在演化，攤平成 Firestore 欄位
      // 只會在每次改結構時多一份對照表要維護，而查詢需求只有「我的全部案例」。
      await fs.setDoc(fs.doc(db, CLOUD, id), { ownerUid: uid, updatedAt: c.updated_at || null, payload: c });
    } catch (e) {
      console.warn('[案例同步] 上傳失敗，稍後重試：', id, e?.message || e);
      _dirty.add(id);   // 放回去，下一次寫入時一併重試
    }
  }
}

/**
 * 身分變了就重新同步一次。
 *
 * 使用者常常是先開頁面、看到「還沒登入」才去登入。那時 initCloud 早就跑完
 * 並記成「未登入」了，不重置的話這一輪永遠不會同步，換裝置的人會以為
 * 資料真的不見了。登出時同樣要重置，才不會把 A 的案例推到 B 的帳號底下。
 */
export async function resyncCloud() {
  clearTimeout(_pushTimer);
  _cloudReady = false;
  _fb = null;
  return initCloud();
}

/** 目前這台裝置的案例有沒有在跟雲端同步。畫面用來誠實說明狀態。 */
export function cloudStatus() {
  return { enabled: _fb != null, ready: _cloudReady, pending: _dirty.size };
}

// Demo 用非加密亂數 id（正式版由後端產生）
function genId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// ── 欄位值形狀 ───────────────────────────────────────────
export function makeFieldValue(value, sourceType, aiTask) {
  return {
    value: value ?? null,
    source_type: sourceType || 'user_input',   // user_input | ai_organized | ai_inference
    ai_task: aiTask || null,
    confirmed: false,
    confirmed_by: null,
    confirmed_at: null,
    version: 1,
  };
}

/**
 * 跨視窗同步（同一台電腦、同一個瀏覽器）
 * localStorage 的 storage 事件只會在「其他」視窗觸發，不會回打自己，
 * 所以回應者打字時不會干擾自己，引導者視窗會即時看到更新。
 * 兩台裝置之間的同步要等接上 Firestore 才做得到。
 */
export function watchExternalChanges(cb) {
  const handler = (e) => { if (e.key === LS_KEY) cb(); };
  addEventListener('storage', handler);
  return () => removeEventListener('storage', handler);
}

// ── 案例 CRUD ────────────────────────────────────────────
export function listCases() {
  const all = readAll();
  return Object.values(all).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
}

export function getCase(caseId) {
  return readAll()[caseId] || null;
}

/**
 * @param caseFieldValues 案例層欄位值
 * @param pathType 'existing_role_focus'（職務優化）｜'full_design'（完整職務設計）
 *   由使用者在建立案例的第 1 步選擇，系統不預設。
 */
export function createCase(caseFieldValues, pathType) {
  const now = new Date().toISOString();
  const id = genId('case');
  const path = pathType === 'full_design' ? 'full_design' : 'existing_role_focus';
  const c = {
    case_id: id,
    owner: 'demo-student',
    path_type: path,
    fields: {},                    // { field_id: FieldValue }
    modules: {},                   // { moduleCode: { status, structured_values, updated_at } }
    access: {                      // AccessWindow（Demo）
      opens_at: now,
      submission_due_at: null,
      first_final_download_at: null,
      scheduled_close_at: null,
      closed_at: null,
      reopened_until: null,
      reopen_reason: null,
    },
    exports: [],                   // WordExport 紀錄
    ai_jobs: [],                   // AIJob 紀錄（次數/成本估算）
    overall_status: 'active',      // active | submitted | output_ready | downloaded_grace | closed | reopened（評測流程內部狀態）
    project_status: 'in_progress', // 使用者手動管理的專案狀態：not_started | in_progress | done
    current_module: path === 'full_design' ? 'm1' : 'existing',
    created_at: now,
    updated_at: now,
  };
  // 寫入案例層欄位
  for (const [fid, val] of Object.entries(caseFieldValues || {})) {
    c.fields[fid] = makeFieldValue(val, 'user_input');
    c.fields[fid].confirmed = true; // 案例基本資料由使用者直接確認
  }
  // 專案名稱：使用者有填就用他的；留白才用「組織＋職務」自動命名
  const title = (caseFieldValues?.['case.title'] || '').trim();
  if (!title) {
    const org = caseFieldValues?.['case.organization_name'] || '';
    const job = caseFieldValues?.['case.job_title_working'] || '未命名職務';
    c.fields['case.title'] = makeFieldValue(org ? `${org}　${job}` : job, 'user_input');
    c.fields['case.title'].confirmed = true;
  }
  const all = readAll();
  all[id] = c;
  writeAll(all);
  _dirty.add(id); schedulePush();
  return c;
}

export function deleteCase(caseId) {
  const all = readAll();
  delete all[caseId];
  writeAll(all);
  _dirty.delete(caseId);
  // 雲端也要刪，否則下次 initCloud 會把它同步回來，看起來像刪不掉
  if (_fb) {
    const { db, fs } = _fb;
    fs.deleteDoc(fs.doc(db, CLOUD, caseId))
      .catch(e => console.warn('[案例同步] 雲端刪除失敗：', caseId, e?.message || e));
  }
}

function touch(c) { c.updated_at = new Date().toISOString(); }

export function saveCase(c) {
  const all = readAll();
  touch(c);
  all[c.case_id] = c;
  writeAll(all);
  _dirty.add(c.case_id); schedulePush();
  return c;
}

/** 使用者手動管理的專案狀態：not_started | in_progress | done */
export function getProjectStatus(c) {
  return c?.project_status || 'in_progress';
}
export function setProjectStatus(c, status) {
  c.project_status = status;
  return saveCase(c);
}

/**
 * 在清單頁編輯基本資訊（修掉「建立後改不了」的問題）。
 * 直接更新 case.* 欄位並存檔；空的專案名稱自動回填「組織＋職務」。
 * values 例：{ 'case.title': '...', 'case.organization_name': '...', ... }
 */
export function updateCaseFields(c, values) {
  for (const [fid, val] of Object.entries(values || {})) {
    saveField(c, fid, val, 'user_input');
    confirmField(c, fid);           // 基本資料由使用者直接確認
  }
  const title = (values?.['case.title'] || '').trim();
  if (!title) {
    const org = (values?.['case.organization_name'] ?? c.fields['case.organization_name']?.value) || '';
    const job = (values?.['case.job_title_working'] ?? c.fields['case.job_title_working']?.value) || '未命名職務';
    saveField(c, 'case.title', org ? `${org}　${job}` : job, 'user_input');
    confirmField(c, 'case.title');
  }
  return saveCase(c);
}

// ── 欄位存取 ─────────────────────────────────────────────
export function getField(c, fieldId) {
  return c.fields[fieldId] || null;
}

/** 儲存欄位值；預設保留既有 confirmed 狀態，值有變更則需重新確認 */
export function saveField(c, fieldId, value, sourceType, aiTask) {
  const prev = c.fields[fieldId];
  const changed = !prev || JSON.stringify(prev.value) !== JSON.stringify(value);
  const fv = prev ? { ...prev } : makeFieldValue(null, sourceType, aiTask);
  fv.value = value;
  if (sourceType) fv.source_type = sourceType;
  if (aiTask !== undefined) fv.ai_task = aiTask;
  if (changed) {
    fv.confirmed = false; fv.confirmed_by = null; fv.confirmed_at = null;
    fv.version = (prev?.version || 0) + 1;
  }
  c.fields[fieldId] = fv;
  return fv;
}

/** 人工確認一個欄位（H 或 AI 整理後確認）*/
export function confirmField(c, fieldId, by) {
  const fv = c.fields[fieldId];
  if (!fv) return null;
  fv.confirmed = true;
  fv.confirmed_by = by || getIdentity();
  fv.confirmed_at = new Date().toISOString();
  return fv;
}

export function isConfirmed(c, fieldId) {
  return !!(c.fields[fieldId] && c.fields[fieldId].confirmed);
}

// ── 模組狀態機（03 第五節）──────────────────────────────
export const MODULE_STATUS = {
  not_started: '尚未開始',
  drafting: '填寫中',
  ready_for_ai: '可呼叫 AI',
  awaiting_user_review: '等待確認',
  confirmed: '已確認',
  needs_review: '待重查',
  locked: '已鎖定',
};

export function getModuleStatus(c, moduleCode) {
  return c.modules[moduleCode]?.status || 'not_started';
}

export function setModuleStatus(c, moduleCode, status) {
  if (!c.modules[moduleCode]) c.modules[moduleCode] = { structured_values: {} };
  c.modules[moduleCode].status = status;
  c.modules[moduleCode].updated_at = new Date().toISOString();
}

// ── AI 任務紀錄（Demo 估算）──────────────────────────────
export function recordAiJob(c, taskCode, tokensIn, tokensOut) {
  const job = {
    ai_job_id: genId('aijob'),
    task_code: taskCode,
    prompt_version: '1.0.0',
    provider: 'mock',
    model: 'mock-1',
    input_tokens: tokensIn || 0,
    output_tokens: tokensOut || 0,
    estimated_cost: 0,             // Mock：不計費
    completed_at: new Date().toISOString(),
  };
  c.ai_jobs.push(job);
  return job;
}

// ── 待課堂討論 / 稽核事件 / 路徑切換 ──────────────────────
// 對應 01 第六節「原文件的『需要諮詢』在 Beta 顯示為『待課堂討論』或
// 『待講師確認』」，以及 03「AuditEvent 記錄關鍵狀態與權限操作」。

/** 把未解決的矛盾／議題掛為待課堂討論，會被帶進 Word 的「待確認事項」 */
export function addDiscussionItem(c, item) {
  if (!c.discussion_items) c.discussion_items = [];
  c.discussion_items.push({
    id: genId('disc'),
    module: item.module || 'existing',
    topic: item.topic,
    reason: item.reason,
    by: item.by || '講師',
    status: 'classroom_discussion',
    created_at: new Date().toISOString(),
  });
  return c;
}

export function addAuditEvent(c, type, detail) {
  if (!c.audit_events) c.audit_events = [];
  c.audit_events.push({
    id: genId('audit'), type, detail: detail || '',
    actor: getIdentity(), at: new Date().toISOString(),
  });
  return c;
}

/**
 * 由「人」決定切換案例路徑。系統偵測到矛盾時只能建議，不得自行切換或覆蓋
 * 既有資料（01 第四節）。既有 existing.* 資料一律保留。
 */
export function switchPath(c, newPath, reason) {
  const from = c.path_type;
  c.path_type = newPath;               // 'full_design' | 'existing_role_focus'
  addAuditEvent(c, 'path_switch', `${from} → ${newPath}｜理由：${reason || '未填'}`);
  return c;
}

/* ── 存取窗與關閉 ─────────────────────────────────────────
 *
 * 這一整套目前是**停用狀態**，刻意的。
 *
 * 原設計是「首次下載後 72 小時自動關閉，需講師重新開放」。但實際上：
 *   1. 啟動倒數的 markFirstDownload() 從來沒有被任何地方呼叫，
 *      所以 scheduled_close_at 永遠是 null，案例永遠不會關閉。
 *   2. 就算會關閉，重新開放需要 isInstructor()，而身分切換的 UI 已經移除，
 *      getIdentity() 恆為 'student'，那顆按鈕永遠不會出現 → 案例會永久鎖死。
 *
 * 決定：不補救這個機制，而是停用它。使用者已確認職務設計走
 * **課程授權碼**模式（見 PRD/職務設計App_課程授權與AI配額_工作包），
 * 存取期限與講師身分都會由後端的 jd_users / jd_codes 提供，
 * 不再依賴瀏覽器 localStorage 的身分旗標。
 *
 * 下面的函式保留成惰性版本，讓呼叫端不用改；真正的存取控制等後端到位再接。
 */

/** 依關閉時間判斷是否已到期。目前沒有任何流程會設定 scheduled_close_at。 */
export function evaluateClose(c) {
  const sc = c.access.scheduled_close_at;
  if (!sc || c.access.closed_at) return c;
  if (c.access.reopened_until && new Date(c.access.reopened_until) > new Date()) return c;
  if (new Date(sc) <= new Date()) {
    c.access.closed_at = new Date().toISOString();
    c.overall_status = 'closed';
  }
  return c;
}

export function isClosed(c) {
  evaluateClose(c);
  if (c.access.closed_at && (!c.access.reopened_until || new Date(c.access.reopened_until) <= new Date())) return true;
  return false;
}

/** 講師重開（03：closed → reopened）*/
export function reopenCase(c, hours, reason) {
  const until = new Date(Date.now() + (hours || 24) * 3600 * 1000).toISOString();
  c.access.reopened_until = until;
  c.access.reopen_reason = reason || '講師重開';
  c.access.closed_at = null;
  c.overall_status = 'reopened';
  return c;
}

export function remainingMs(c) {
  const target = c.access.reopened_until || c.access.scheduled_close_at;
  if (!target) return null;
  return new Date(target).getTime() - Date.now();
}
