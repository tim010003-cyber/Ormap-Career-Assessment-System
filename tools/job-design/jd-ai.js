/**
 * jd-ai.js — AI 供應商層（前端）
 * =====================================================================
 * 這一層決定「這次要用真 AI 還是 Mock」，並統一組裝提示詞。
 *
 * 設計原則
 *   - 前端永遠拿不到 API Key。所有呼叫都送到本機代理（127.0.0.1:8788），
 *     由代理帶著 Key 去打供應商。
 *   - 代理沒開、沒設 Key、或 AI 失敗時，一律**自動退回 Mock**，
 *     流程不會中斷（對應規格：API 失敗不得清除原始輸入，也不得阻止人工繼續）。
 *   - 提示詞的重點是「怎麼整理得好」，不是「不准做什麼」。審核由人做，
 *     AI 只負責把口述轉成清楚、有結構的草稿。輸出形狀與 Mock 一致，畫面不用改。
 */

import { transformRule, STANCE } from './jd-transform-rules.js';

const PROXY_KEY = 'jd_ai_proxy_url';
export const defaultProxy = () => localStorage.getItem(PROXY_KEY) || 'http://127.0.0.1:8788';
export const setProxy = (u) => localStorage.setItem(PROXY_KEY, u);

let _status = null;   // 快取，避免每次呼叫都問一次

/**
 * 本機代理只在本機環境有意義。
 *
 * 部署到 HTTPS 之後，從網頁 fetch http://127.0.0.1:8788 屬於 mixed content，
 * 瀏覽器會直接封鎖，而且那個錯誤**攔不住**——try/catch 接得到 fetch 的 rejection，
 * 但攔不掉 console 上的封鎖訊息。結果就是公開站每次載入都噴一條紅字。
 *
 * 所以非本機環境一律不發這個請求，直接視為沒有 AI，安靜退回 Mock。
 */
export function isLocalEnv() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost');
}

export async function aiStatus(force = false) {
  if (_status && !force) return _status;
  if (!isLocalEnv()) {
    _status = { ok: false, hasKey: false, offline: true, remote: true };
    return _status;
  }
  try {
    const r = await fetch(defaultProxy() + '/api/status', { signal: AbortSignal.timeout(2500) });
    _status = await r.json();
  } catch {
    _status = { ok: false, hasKey: false, offline: true };
  }
  return _status;
}

export const aiReady = async () => {
  const s = await aiStatus();
  return !!(s.ok && s.hasKey);
};

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
}`;
}

/**
 * 呼叫 AI。失敗一律回 null，讓呼叫端退回 Mock。
 * @param taskCode 任務代碼（僅供紀錄）
 * @param instruction 這個任務要做什麼
 * @param sample Mock 的 organized_content 形狀，用來約束輸出
 * @param input 使用者的原始輸入與已確認上游
 */
export async function askAi(taskCode, instruction, sample, input) {
  if (!(await aiReady())) return null;
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
  try {
    const r = await fetch(defaultProxy() + '/api/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taskCode, system, user }),
      signal: AbortSignal.timeout(90000),
    });
    const j = await r.json();
    if (!j.ok) { console.warn('[AI] 失敗，改用 Mock：', j.message || j.error); return null; }
    return { ...j.data, _usage: j.usage, _model: j.model, _provider: j.provider };
  } catch (e) {
    console.warn('[AI] 無法連線，改用 Mock：', e.message);
    return null;
  }
}

/** 把真 AI 的結果併入 Mock 的信封，確保缺欄位時仍有預設值 */
export function mergeIntoEnvelope(mock, ai) {
  if (!ai) return mock;
  return {
    ...mock,
    organized_content: { ...mock.organized_content, ...(ai.organized_content || {}) },
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
