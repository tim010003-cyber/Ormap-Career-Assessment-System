/**
 * jd-ai.js — AI 供應商層（前端）
 * =====================================================================
 * 這一層決定「這次的整理由誰做」，並統一組裝提示詞。
 *
 * 兩條路徑
 *   本機開發：瀏覽器 → 127.0.0.1:8788（ai-proxy.mjs）→ 供應商
 *   線上：    瀏覽器 → Cloud Function jdAi（asia-east1）→ 供應商
 *   兩邊的 Key 都不在前端；線上那把存在 Secret Manager。
 *
 * ⚠️ 沒有 AI 時「不整理」，不再退回 Mock
 *   Mock 是關鍵字規則產生的，品質差到會誤導人——使用者看到的是一份看起來
 *   像產品、實際上是拼湊的東西。與其給假貨，不如明說現在不能整理。
 *   （2026-07-22 使用者決策）
 *
 *   注意：被擋的只有「口述整理」這一類。權責矛盾偵測、職務說明書組裝、
 *   甄選流程模板、揭露與歧視提醒都是規則邏輯不是 AI，照常運作，
 *   所以預建示範案例在沒有 AI 的環境仍然看得完、下載得了。
 */

import { transformRule, STANCE } from './jd-transform-rules.js';

const PROXY_KEY = 'jd_ai_proxy_url';
export const defaultProxy = () => localStorage.getItem(PROXY_KEY) || 'http://127.0.0.1:8788';
export const setProxy = (u) => localStorage.setItem(PROXY_KEY, u);

const FN_REGION = 'asia-east1';

let _status = null;   // 快取，避免每次呼叫都問一次
let _fbPromise = null;

/**
 * 本機代理只在本機環境有意義。
 *
 * 部署到 HTTPS 之後，從網頁 fetch http://127.0.0.1:8788 屬於 mixed content，
 * 瀏覽器會直接封鎖，而且那個錯誤**攔不住**——try/catch 接得到 fetch 的 rejection，
 * 但攔不掉 console 上的封鎖訊息。所以非本機環境一律不發這個請求。
 */
export function isLocalEnv() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost');
}

/** 延遲載入 Firebase：公開站不一定要用到，不要一進頁面就拉 SDK。 */
function firebaseBits() {
  if (!_fbPromise) {
    _fbPromise = (async () => {
      const [{ auth }, authMod, fnMod, appMod] = await Promise.all([
        import('../../firebase-init.js'),
        import('https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.8.1/firebase-functions.js'),
        import('https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js'),
      ]);
      return { auth, authMod, fnMod, appMod };
    })();
  }
  return _fbPromise;
}

/** 目前登入的使用者（未登入回 null）。等 Auth 還原完成才回answer。 */
export async function currentUser() {
  try {
    const { auth, authMod } = await firebaseBits();
    if (auth.currentUser) return auth.currentUser;
    return await new Promise((resolve) => {
      const un = authMod.onAuthStateChanged(auth, (u) => { un(); resolve(u); });
    });
  } catch { return null; }
}

export async function signIn() {
  const { auth, authMod } = await firebaseBits();
  const provider = new authMod.GoogleAuthProvider();
  const cred = await authMod.signInWithPopup(auth, provider);
  _status = null;                     // 身分變了，狀態要重算
  return cred.user;
}

export async function signOut() {
  const { auth, authMod } = await firebaseBits();
  await authMod.signOut(auth);
  _status = null;
}

/** 監看登入狀態變化，讓畫面可以即時更新。 */
export async function onAuth(cb) {
  const { auth, authMod } = await firebaseBits();
  return authMod.onAuthStateChanged(auth, (u) => { _status = null; cb(u); });
}

/**
 * 目前能不能用 AI，以及為什麼不能。
 * mode: 'local'（本機代理）｜'cloud'（Cloud Function）｜'none'
 */
export async function aiStatus(force = false) {
  if (_status && !force) return _status;

  // 本機開發：優先用本機代理，改提示詞不用重新部署
  if (isLocalEnv()) {
    try {
      const r = await fetch(defaultProxy() + '/api/status', { signal: AbortSignal.timeout(2500) });
      const j = await r.json();
      if (j.ok && j.hasKey) {
        _status = { ...j, mode: 'local', ready: true };
        return _status;
      }
      _status = { ...j, mode: 'none', ready: false, reason: j.hasKey ? 'proxy_error' : 'no_key' };
      return _status;
    } catch {
      // 本機代理沒開就往下試雲端，不直接放棄
    }
  }

  const user = await currentUser();
  if (!user) {
    _status = { mode: 'none', ready: false, reason: 'signed_out' };
    return _status;
  }
  _status = { mode: 'cloud', ready: true, email: user.email, provider: 'cloud' };
  return _status;
}

export const aiReady = async () => (await aiStatus()).ready === true;

/** 給畫面用的說明文字：為什麼現在不能整理、該做什麼。 */
export function whyNotReady(status) {
  switch (status?.reason) {
    case 'signed_out': return { short: '請先登入', detail: 'AI 整理需要登入才能使用。' };
    case 'no_key':     return { short: '尚未設定 API Key', detail: '本機代理已啟動，但還沒填入 API Key。' };
    case 'proxy_error':return { short: 'AI 代理異常', detail: '本機代理回應不正常，請檢查終端機。' };
    case 'not_allowed':return { short: '帳號未開放', detail: 'AI 整理目前僅開放給指定帳號測試，課程授權碼上線後才會開放。' };
    default:           return { short: '目前無法使用 AI', detail: '請稍後再試，或改用人工填寫。' };
  }
}

/* ══════════ 共通提示詞 ══════════
   目標只有一個：把口述整理好。
   不評價、不追問、不判定，那些都是人在現場做的事。 */

const COMMON_RULES = `你是一位很會整理的顧問助手。有人正在口述他對一個職務的想法，你的工作是**把他說的話整理成清楚、有結構、他自己看了會說「對，就是這個意思」的內容**。

把這件事做到最好，就是你唯一的任務。

【怎麼整理得好】
- 抓重點。口語會繞、會重複、會插話，把真正在講的事情提煉出來。
- 合併同一件事的不同說法，不要讓同一個意思散在三個地方。
- 依這一節指定的分類與格式歸位，讓他一眼看得到結構。
- 把抽象的話往下轉成具體的：聽到「要細心」，寫成「在什麼情況下、會做出什麼行為」；聽到「常常出包」，寫成「什麼環節、多常發生、造成什麼結果」。
- 用詞可以改寫得更精準、更專業，只要意思是他的。
- 他只講了片段，就把片段整理好。這是一題一題問出來的，本來就不會一次講完。
- 寧可整理得多一點讓他刪，不要因為不確定而留白。**整理得不夠好，比整理得不夠精確更糟。**

【他要的是草稿，不是判決】
產出會被他帶到現場討論、修改、推翻。所以：
- 不評價他講得夠不夠、對不對、完不完整。那是他的事。
- 不因為內容短、模糊或有偏見就少整理。有偏見的草稿照樣有用。
- 不追問、不要求補件、不判定「不完整」「不一致」「不可發布」。
- 想到別的角度可以補一個進 inferences 供他參考，**說一次就好**，不要來回勸說。

【你拿到的是什麼】
你會拿到兩塊東西：
- **目前為止談過的內容**：他在前面題目講過的話與已整理好的結果。這是背景，不要重複整理它，但**要拿來理解這一題**。他在前面順口提過的事（組織性質、為什麼不找正職、人員為什麼會流動、旺季在幾月），到了後面的題目就直接用，不要當作沒說過，更不要標成「待確認」。
- **這一題他說的**：這次要整理的內容。

輸入常常是**現場對話的逐字稿**，所以會夾雜：
- 引導者的問句（「如果不處理會怎麼樣嗎？」「那你覺得呢？」）——**那是問題，不是他的答案，不要填進欄位**。
- 贅字、口頭禪、講到一半改口、重複（「就是」「那個」「對對對」「我剛剛講的那個」）——去掉。
- 一句話裡混了好幾件事——拆開，分別歸到該去的欄位。
- 舉例、離題、聊到別的——判斷跟這一題有沒有關，有關就用，沒關就先放著。

**整理不是搬運。** 把 (a)(b)(c) 那種口述編號、「主要可以整理成以下幾大項」這種引言、以及「我覺得」「其實」這類語助詞都拿掉，留下真正的內容，用完整的句子重寫。

【人稱】
說話的人是這個職務的主管或負責人，他在講自己的組織，所以「我」指的是他。
整理進正式欄位時，把「我」換成角色稱謂——**主管、用人主管、專案負責人、活動負責人**——或改成組織的口吻（「由主管負責…」「團隊需要…」）。
這是文件不是逐字稿，出現「我」會很奇怪。同理，「他們」「那些人」要換成實際的角色名稱。

【只有兩件事要守】
1. 不要憑空生出他沒說過的數字、金額、期限、人數。沒有就留白。
2. 他講了兩種不同說法時，兩種都留著，不要替他選。

warnings 平常給空陣列。只有真的有事才寫，最多兩則。

一律使用繁體中文。只輸出 JSON，不要有任何其他文字。`;

/**
 * 把輸出形狀描述成 schema 說明。
 *
 * 重要：這裡只給「欄位名稱與型別」，**不給 Mock 的實際值**。
 * 之前直接把 Mock 的 organized_content 整包當範本，而 Mock 是關鍵字規則產生的，
 * 內容常常是原話照搬。AI 看到那種範本就會照著模仿，於是也原話照搬。
 */
function skeleton(sample) {
  const out = {};
  for (const [k, v] of Object.entries(sample || {})) {
    out[k] = Array.isArray(v)
      ? (v.length && typeof v[0] === 'object'
          ? [Object.fromEntries(Object.keys(v[0]).map(kk => [kk, '…']))]
          : ['…'])
      : (v && typeof v === 'object'
          ? Object.fromEntries(Object.keys(v).map(kk => [kk, '…']))
          : '…');
  }
  return out;
}

function shapeHint(sample) {
  return `輸出 JSON 必須完全符合以下形狀（欄位名稱不可更動，"…" 代表由你填入整理後的內容）：
{
  "organized_content": ${JSON.stringify(skeleton(sample), null, 2)},
  "inferences_requiring_confirmation": [{"field": "欄位ID", "note": "這是你補的角度，一句話說明"}],
  "information_gaps": [{"field": "欄位ID", "message": "這一格還沒談到（沒有就給空陣列）"}],
  "contradictions": [{"message": "他講了哪兩種說法", "detail": "差在哪", "suggestion": "留給他決定"}],
  "warnings": ["真的有事才寫，平常空陣列"]
}

⚠️ organized_content 裡面填的是**給人看的中文內容**，絕對不要填欄位代號。
像 m1.first_noticed_at、m3.work_items、existing.role_reason 這種是程式用的識別碼，
它們只能出現在 information_gaps 與 inferences 的 "field" 位置，不能當成內容。

特別注意：organized_content 裡可能有一個叫 m1.information_gaps 的**內容欄位**
（意思是「他還想補充哪些資料」），那跟上面那個 information_gaps 中繼欄位是兩回事。
前者要填中文句子，後者才填欄位代號。沒東西可寫就給空陣列，不要拿代號充數。`;
}

/** 呼叫端用來分辨「沒整理」的原因，決定要顯示什麼 */
export class AiUnavailable extends Error {
  constructor(reason, detail) {
    super(detail || reason);
    this.name = 'AiUnavailable';
    this.reason = reason;
  }
}

/**
 * 呼叫 AI。
 *
 * 不再「失敗就回 Mock」——失敗會丟出 AiUnavailable，讓畫面誠實說明現況。
 * 使用者原話：Mock 的品質真的蠻糟糕的，寧可不能跑。
 *
 * @param taskCode 任務代碼（決定帶哪一節的轉換原則，也用於紀錄）
 * @param instruction 這個任務要做什麼
 * @param sample 欄位形狀（只取鍵名與型別，不帶值）
 * @param input 使用者的原始輸入與已確認上游
 */
export async function askAi(taskCode, instruction, sample, input) {
  const st = await aiStatus();
  if (!st.ready) throw new AiUnavailable(st.reason || 'unavailable');
  // 使用者在正式文件裡逐節寫好的「AI 轉換原則」，決定這一節該整理成什麼形狀。
  // 這是整理品質的主要來源：告訴 AI 該產出什麼結構，它才整理得好。
  const rule = transformRule(taskCode);
  const system = [
    COMMON_RULES,
    STANCE,
    `【本次任務】${instruction}`,
    rule && `【本節的轉換原則】\n${rule}`,
    shapeHint(sample),
  ].filter(Boolean).join('\n\n');
  const user = typeof input === 'string' ? input : JSON.stringify(input, null, 2);

  if (st.mode === 'local') {
    let j;
    try {
      const r = await fetch(defaultProxy() + '/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskCode, system, user }),
        signal: AbortSignal.timeout(90000),
      });
      j = await r.json();
    } catch (e) {
      throw new AiUnavailable('proxy_error', '無法連線到本機 AI 代理：' + e.message);
    }
    if (!j.ok) throw new AiUnavailable('provider_error', j.message || j.error || 'AI 呼叫失敗');
    return { ...j.data, _usage: j.usage, _model: j.model, _provider: j.provider };
  }

  // 線上：Cloud Function。Key 在 Secret Manager，前端只送提示詞與內容。
  try {
    const { fnMod, appMod } = await firebaseBits();
    const fns = fnMod.getFunctions(appMod.getApp(), FN_REGION);
    const call = fnMod.httpsCallable(fns, 'jdAi', { timeout: 120000 });
    const res = await call({ taskCode, system, user });
    const j = res.data || {};
    if (!j.ok) throw new AiUnavailable('provider_error', j.message || 'AI 呼叫失敗');
    return { ...j.data, _usage: j.usage, _model: j.model, _provider: j.provider };
  } catch (e) {
    if (e instanceof AiUnavailable) throw e;
    // callable 的錯誤碼對應到畫面說明
    const code = String(e.code || '').replace(/^functions\//, '');
    if (code === 'unauthenticated') throw new AiUnavailable('signed_out', e.message);
    if (code === 'permission-denied') throw new AiUnavailable('not_allowed', e.message);
    throw new AiUnavailable('provider_error', e.message || String(e));
  }
}

/**
 * 欄位代號長這樣：m1.first_noticed_at、m3.work_items、existing.role_reason。
 * 它們是程式用的識別碼，不該出現在給人看的內容裡。
 */
const FIELD_ID_RE = /^(m[1-6]|case|existing)\.[a-z0-9_]+$/i;

/**
 * 把 AI 誤填的欄位代號清掉。
 *
 * 為什麼會發生：輸出格式裡有一個 information_gaps（中繼資料，記錄「哪個欄位
 * 還沒談到」），而 M1 第一章剛好也有一個內容欄位叫 m1.information_gaps
 * （畫面上的「仍需要補充的資料」）。名字太像，模型會把欄位代號填進內容欄，
 * 使用者就看到「m1.first_noticed_at」這種東西。
 *
 * 提示詞已經講明不要這樣做，但模型輸出本來就不保證，所以這裡再攔一次。
 */
function stripFieldIds(v) {
  if (typeof v === 'string') return FIELD_ID_RE.test(v.trim()) ? '' : v;
  if (Array.isArray(v)) {
    return v
      .map(stripFieldIds)
      .filter(x => !(x === '' || x == null || (typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length === 0)));
  }
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = stripFieldIds(val);
    return out;
  }
  return v;
}

/** 把真 AI 的結果併入 Mock 的信封，確保缺欄位時仍有預設值 */
export function mergeIntoEnvelope(mock, ai) {
  if (!ai) return mock;
  return {
    ...mock,
    organized_content: stripFieldIds({ ...mock.organized_content, ...(ai.organized_content || {}) }),
    // 真 AI 回傳空陣列代表「本次沒有這類提醒」，不可再把 Mock 的
    // 關鍵字警告強行加回來；只有欄位缺失時才使用 Mock 保底。
    inferences_requiring_confirmation: Array.isArray(ai.inferences_requiring_confirmation)
      ? ai.inferences_requiring_confirmation : mock.inferences_requiring_confirmation,
    information_gaps: Array.isArray(ai.information_gaps)
      ? ai.information_gaps : mock.information_gaps,
    contradictions: Array.isArray(ai.contradictions)
      ? ai.contradictions : mock.contradictions,
    warnings: Array.isArray(ai.warnings) ? ai.warnings.slice(0, 6) : mock.warnings,
    _source: 'ai',
    _usage: ai._usage, _model: ai._model, _provider: ai._provider,
  };
}
