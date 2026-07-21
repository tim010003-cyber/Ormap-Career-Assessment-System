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
    overall_status: 'active',      // active | submitted | output_ready | downloaded_grace | closed | reopened
    current_module: path === 'full_design' ? 'm1' : 'existing',
    created_at: now,
    updated_at: now,
  };
  // 寫入案例層欄位
  for (const [fid, val] of Object.entries(caseFieldValues || {})) {
    c.fields[fid] = makeFieldValue(val, 'user_input');
    c.fields[fid].confirmed = true; // 案例基本資料由使用者直接確認
  }
  const all = readAll();
  all[id] = c;
  writeAll(all);
  return c;
}

export function deleteCase(caseId) {
  const all = readAll();
  delete all[caseId];
  writeAll(all);
}

function touch(c) { c.updated_at = new Date().toISOString(); }

export function saveCase(c) {
  const all = readAll();
  touch(c);
  all[c.case_id] = c;
  writeAll(all);
  return c;
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

// ── 存取窗與關閉（03 第七節）────────────────────────────
export const CLOSE_HOURS = 72;

/** 首次成功下載後才啟動 72h 倒數（05 產生與下載流程第 8–9 步）*/
export function markFirstDownload(c) {
  if (c.access.first_final_download_at) return c; // 只記一次
  const now = new Date();
  c.access.first_final_download_at = now.toISOString();
  c.access.scheduled_close_at = new Date(now.getTime() + CLOSE_HOURS * 3600 * 1000).toISOString();
  c.overall_status = 'downloaded_grace';
  return c;
}

/** 依伺服器時間（此處為本機時間，Demo）判斷是否已到關閉時間 */
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
