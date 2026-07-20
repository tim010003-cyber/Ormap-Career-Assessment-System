/**
 * jd-word.js — 職務設計與甄選 Web App｜文件產生（Demo 原型）
 * =====================================================================
 * 產出四份**獨立**文件（PO 決策 2026-07-19，取代 05 規格原本的「單一合併檔」）：
 *   ① 引導與思考   — 思考歷程（路徑 B：第一部基礎確認＋第二部職務與人才規格）
 *                    ＋ 待確認事項 ＋ 版本與來源摘要
 *   ② 職務說明書   — 正式輸出，乾淨版，不含思考引導內容
 *   ③ 甄選流程設計書
 *   ④ JD 對外文案  — 唯一可對外的檔案
 *
 * 設計決策
 *   - 每份檔案各自有封面（案例、職務、組織、版本、產生日期、確認狀態），
 *     因為四份會被分開拿去使用。
 *   - 揭露邊界改由「檔案層級」界定：①②③封面標「內部資料，不對外公開」，
 *     ④標「可對外提供」。比原本單一合併檔的章節註記更安全。
 *   - 待確認事項只放在①，三份正式文件保持乾淨。
 *
 * Demo 取捨
 *   正式版由 Cloud Function 以 Node `docx` 產生真 .docx 上傳 Storage；
 *   前端原型產生 Word 可開啟的 HTML-based .doc，章節結構與正式版一致。
 */

const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function tw(dtISO) {
  if (!dtISO) return '—';
  try { return new Date(dtISO).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }); }
  catch { return dtISO; }
}

const TBC = '<span class="tbc">待確認</span>';

// 空值一律顯示「待確認」，不顯示 null / 欄位 ID（05 第七節）
const val = (v) => {
  if (v == null || v === '') return TBC;
  if (Array.isArray(v)) return v.length ? listBlock(v) : TBC;
  return esc(v);
};

function listBlock(arr) {
  const a = (arr || []).filter(x => (x ?? '').toString().trim());
  return a.length ? '<ul>' + a.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : `<p class="tbc">待確認</p>`;
}

const fieldVal = (c, id) => c.fields[id]?.value ?? null;
const docVersion = (c) => c.doc_version || 1;

// 三張 M3 錨點表合併成職能清單（知識與判斷／工具與技術／專業態度）
const ANCHOR_IDS = ['m3.knowledge_anchors', 'm3.tool_anchors', 'm3.attitude_anchors'];
const allAnchors = (c) => ANCHOR_IDS.flatMap(id => fieldVal(c, id) || []);

const STYLE = `
<style>
  body{font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;color:#142033;line-height:1.7;}
  h1{font-size:22pt;color:#142033;border-bottom:3px solid #1E9188;padding-bottom:6pt;margin-top:26pt;}
  h2{font-size:15pt;color:#136E68;margin-top:20pt;border-left:5px solid #1E9188;padding-left:8pt;}
  h3{font-size:12.5pt;color:#142033;margin-top:14pt;}
  table{border-collapse:collapse;width:100%;margin:8pt 0;}
  th,td{border:1px solid #b7c7c9;padding:5pt 8pt;text-align:left;vertical-align:top;font-size:10.5pt;}
  th{background:#DCECEF;color:#0f172a;}
  .tbc{color:#b45309;font-weight:600;}
  .cover{padding:36pt 0 24pt;border-bottom:1px solid #dcd6c8;}
  .cover .kind{font-size:10pt;letter-spacing:3px;color:#136E68;font-weight:700;}
  .cover .doc-title{font-size:26pt;font-weight:900;margin:6pt 0 2pt;}
  .cover .role{font-size:14pt;color:#475569;}
  .kv{margin:2pt 0;font-size:10.5pt;} .kv b{display:inline-block;min-width:92pt;color:#136E68;}
  .seal{display:inline-block;margin-top:14pt;padding:5pt 12pt;border-radius:4px;font-size:10pt;font-weight:700;}
  .seal.internal{background:#FDF3EA;border:1px solid #E88A55;color:#a4551f;}
  .seal.external{background:#EAF5F3;border:1px solid #1E9188;color:#136E68;}
  .note{background:#FBF8F2;border:1px solid #E88A55;padding:8pt 12pt;border-radius:6px;font-size:10.5pt;}
  ul{margin:4pt 0 4pt 18pt;} li{margin:2pt 0;}
  .part{color:#94a3b8;font-size:10pt;letter-spacing:2px;}
</style>`;

/** 四份文件共用的封面 */
function coverPage(c, opts) {
  const pathLabel = c.path_type === 'full_design' ? '完整職務設計（路徑 A）' : '既有職務優化（路徑 B）';
  const pending = countPending(c);
  const seal = opts.external
    ? '<div class="seal external">本文件為對外文案，可提供給候選人</div>'
    : '<div class="seal internal">本文件為內部資料，不對外公開</div>';
  return `<section class="cover">
    <div class="kind">${esc(opts.kind)}</div>
    <div class="doc-title">${esc(opts.title)}</div>
    <div class="role">${esc(fieldVal(c, 'case.job_title_working') || '（未命名職務）')}</div>
    <div style="height:14pt"></div>
    <div class="kv"><b>案例名稱</b>${val(fieldVal(c, 'case.title'))}</div>
    <div class="kv"><b>組織</b>${val(fieldVal(c, 'case.organization_name'))}</div>
    <div class="kv"><b>案例路徑</b>${pathLabel}</div>
    <div class="kv"><b>文件版本</b>v${docVersion(c)}</div>
    <div class="kv"><b>產生日期</b>${tw(new Date().toISOString())}</div>
    <div class="kv"><b>確認狀態</b>${pending === 0 ? '全部已確認' : `尚有 ${pending} 項待確認`}</div>
    ${seal}
  </section>`;
}

const wrap = (inner) => `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="utf-8">${STYLE}</head><body>${inner}</body></html>`;

// ═══════════ ① 引導與思考 ═══════════
export function buildGuideDoc(c) {
  const F = (id) => fieldVal(c, id);
  const isPathA = c.path_type === 'full_design';
  const workItems = F('m3.work_items') || [];

  const pathASections = `
  <h2><span class="part">第一部</span>　問題釐清定位</h2>
  <p class="note">此案例已改走完整職務設計（路徑 A）。問題釐清與職務需求界定的完整內容將於正式版提供，本原型尚未開放填寫。</p>
  <h2><span class="part">第二部</span>　職務需求界定</h2>
  <p class="note">同上，待正式版提供。</p>
  <h2><span class="part">第三部</span>　職務與人才規格定位</h2>`;

  const pathBSections = `
  <h2><span class="part">第一部</span>　既有職務基礎確認</h2>
  <h3>職務存在理由</h3><p>${val(F('existing.role_reason'))}</p>
  <h3>既有預期成果</h3>${listBlock(F('existing.expected_results'))}
  <h3>既有主要工作</h3>${listBlock(F('existing.main_work'))}
  <h3>現有職務問題</h3>${listBlock(F('existing.current_issues'))}
  <h3>正在改變的期待</h3><p>${val(F('existing.changed_expectations'))}</p>
  <h3>資源、授權與組織條件</h3><p>${val(F('existing.resources_authority'))}</p>
  <h3>本次優化目標</h3>${listBlock(F('case.optimization_goals'))}
  <h2><span class="part">第二部</span>　職務與人才規格定位</h2>`;

  return wrap(`
  ${coverPage(c, { kind: '思考歷程紀錄', title: '引導與思考', external: false })}

  <h1>文件資訊與使用說明</h1>
  <p class="note">本文件記錄的是<strong>思考與引導的歷程</strong>，包含原始輸入、AI 整理與人工確認的差異，屬內部資料。正式對外或對內使用的文件請見另外三份：職務說明書、甄選流程設計書、JD 對外文案。</p>
  <p>尚未確認或待課堂討論項目數量：<strong>${countPending(c)}</strong> 項。</p>

  <h1>思考歷程紀錄</h1>
  ${isPathA ? pathASections : pathBSections}
  <h3>角色定位</h3><p>${val(F('m3.role_positioning'))}</p>
  <h3>預期價值產出</h3>${listBlock(F('m3.value_outputs'))}
  <h3>主要工作項目</h3>
  <table><tr><th>工作項目</th><th>責任區分</th><th>性質</th><th>頻率／占比</th></tr>
  ${workItems.length ? workItems.map(w => `<tr><td>${esc(w.work)}</td><td>${esc(w.responsibility_type)}</td><td>${esc(w.nature)}</td><td>${w.frequency_share ? esc(w.frequency_share) : TBC}</td></tr>`).join('') : `<tr><td colspan="4" class="tbc">待確認</td></tr>`}
  </table>
  <h3>組織關係、責任與專業決策範圍</h3>${relationsTable(F('m3.organization_relations'))}
  <h3>第二章　知識與判斷原則</h3>
  <table>
    <tr><th style="width:160px">到職前核心必備知識</th><td>${listBlock(F('m3.prehire_knowledge'))}</td></tr>
    <tr><th>到職後可培訓知識</th><td>${listBlock(F('m3.trainable_knowledge'))}</td></tr>
    <tr><th>組織特有知識</th><td>${listBlock(F('m3.organization_specific_knowledge'))}</td></tr>
    <tr><th>核心專業判斷</th><td>${listBlock(F('m3.core_judgments'))}</td></tr>
    <tr><th>重要工作原則</th><td>${listBlock(F('m3.work_principles'))}</td></tr>
    <tr><th>高風險判斷與升級條件</th><td>${listBlock(F('m3.high_risk_escalations'))}</td></tr>
  </table>
  <h4>知識與判斷五級錨點</h4>${anchorTable(F('m3.knowledge_anchors'))}
  <h3>第三章　工具與技術方法</h3>
  <table>
    <tr><th style="width:160px">到職前需具備的工具能力</th><td>${listBlock(F('m3.required_tools'))}</td></tr>
    <tr><th>可接受替代經驗的工具</th><td>${listBlock(F('m3.alternative_tools'))}</td></tr>
    <tr><th>到職後可學習的工具</th><td>${listBlock(F('m3.trainable_tools'))}</td></tr>
    <tr><th>必要專業技術</th><td>${listBlock(F('m3.professional_methods'))}</td></tr>
    <tr><th>主要工作方法</th><td>${listBlock(F('m3.work_methods'))}</td></tr>
    <tr><th>例外處理與替代方法</th><td>${listBlock(F('m3.exception_methods'))}</td></tr>
  </table>
  <h4>工具與技術五級錨點</h4>${anchorTable(F('m3.tool_anchors'))}
  <h3>第四章　專業態度與工作原則</h3>
  <table>
    <tr><th style="width:160px">專業品質要求</th><td>${listBlock(F('m3.quality_requirements'))}</td></tr>
    <tr><th>責任與錯誤處理原則</th><td>${listBlock(F('m3.error_responsibility'))}</td></tr>
    <tr><th>重要取捨原則</th><td>${listBlock(F('m3.tradeoff_principles'))}</td></tr>
    <tr><th>專業倫理與底線</th><td>${listBlock(F('m3.ethics_nonnegotiables'))}</td></tr>
    <tr><th>灰區判斷原則</th><td>${listBlock(F('m3.gray_area_principles'))}</td></tr>
    <tr><th>必須回報或升級的情況</th><td>${listBlock(F('m3.escalation_required'))}</td></tr>
  </table>
  <h4>專業態度五級錨點</h4>${anchorTable(F('m3.attitude_anchors'))}
  <h3>第五章　人才成熟度五級錨點</h3>${maturityTable(F('m3.maturity_anchors'))}

  <h1>待確認事項</h1>
  ${pendingTable(c)}

  <h1>版本與來源摘要</h1>
  <table>
    <tr><th style="width:170px">案例版本</th><td>v${docVersion(c)}</td></tr>
    <tr><th>思考歷程確認版本</th><td>${c.modules?.m3?.status === 'confirmed' ? '已確認' : TBC}</td></tr>
    <tr><th>職務說明書</th><td>${c.modules?.m4?.status === 'confirmed' ? '已確認' : TBC}</td></tr>
    <tr><th>甄選流程設計書</th><td>${c.modules?.m5?.status === 'confirmed' ? '已確認' : TBC}</td></tr>
    <tr><th>JD 對外文案</th><td>${c.modules?.m6?.status === 'confirmed' ? '已確認' : TBC}</td></tr>
    <tr><th>產生時間</th><td>${tw(new Date().toISOString())}</td></tr>
    <tr><th>首次下載時間</th><td>${tw(c.access?.first_final_download_at)}</td></tr>
  </table>`);
}

// ═══════════ ② 職務說明書 ═══════════
// 依 05 第五節正式範本順序，不含任何思考引導內容。
export function buildJobDescriptionDoc(c) {
  const F = (id) => fieldVal(c, id);
  const workItems = F('m3.work_items') || [];
  return wrap(`
  ${coverPage(c, { kind: '正式輸出 ①', title: '職務說明書', external: false })}

  <h1>一、職務基本資料</h1>
  ${jobBasicTable(F('m4.job_basic_info'), c)}

  <h1>二、角色定位</h1>
  <p>${val(F('m3.role_positioning'))}</p>

  <h1>三、預期價值產出</h1>
  ${listBlock(F('m3.value_outputs'))}

  <h1>四、主要工作內容</h1>
  <table><tr><th>工作項目</th><th>責任區分</th><th>性質</th><th>頻率／占比</th></tr>
  ${workItems.length ? workItems.map(w => `<tr><td>${esc(w.work)}</td><td>${esc(w.responsibility_type)}</td><td>${esc(w.nature)}</td><td>${w.frequency_share ? esc(w.frequency_share) : TBC}</td></tr>`).join('') : `<tr><td colspan="4" class="tbc">待確認</td></tr>`}
  </table>

  <h1>五、組織關係與權責範圍</h1>
  ${relationsTable(F('m3.organization_relations'))}

  <h1>六、適任條件</h1>
  <h3>6.1 必要知識</h3>
  <table>
    <tr><th style="width:160px">到職前核心必備知識</th><td>${listBlock(F('m3.prehire_knowledge'))}</td></tr>
    <tr><th>到職後可培訓知識</th><td>${listBlock(F('m3.trainable_knowledge'))}</td></tr>
    <tr><th>組織特有知識</th><td>${listBlock(F('m3.organization_specific_knowledge'))}</td></tr>
  </table>
  <h3>6.2 工具與專業技術</h3>
  <table>
    <tr><th style="width:160px">必要工具與系統能力</th><td>${listBlock(F('m3.required_tools'))}</td></tr>
    <tr><th>必要專業技術與工作方法</th><td>${listBlock([...(F('m3.professional_methods') || []), ...(F('m3.work_methods') || []), ...(F('m3.exception_methods') || [])])}</td></tr>
    <tr><th>可接受的替代工具或相關經驗</th><td>${listBlock([...(F('m3.alternative_tools') || []), ...(F('m3.trainable_tools') || [])])}</td></tr>
  </table>
  <h3>6.3 核心專業判斷與工作原則</h3>
  <table>
    <tr><th style="width:160px">核心專業判斷</th><td>${listBlock(F('m3.core_judgments'))}</td></tr>
    <tr><th>重要工作原則</th><td>${listBlock([...(F('m3.work_principles') || []), ...(F('m3.tradeoff_principles') || [])])}</td></tr>
    <tr><th>高風險判斷與升級條件</th><td>${listBlock([...(F('m3.high_risk_escalations') || []), ...(F('m3.escalation_required') || [])])}</td></tr>
  </table>
  <h3>6.4 專業品質、責任與倫理</h3>
  <table>
    <tr><th style="width:160px">專業品質要求</th><td>${listBlock(F('m3.quality_requirements'))}</td></tr>
    <tr><th>責任與錯誤處理</th><td>${listBlock(F('m3.error_responsibility'))}</td></tr>
    <tr><th>專業倫理與不可妥協原則</th><td>${listBlock([...(F('m3.ethics_nonnegotiables') || []), ...(F('m3.gray_area_principles') || [])])}</td></tr>
  </table>
  <h3>6.5 組織合作、溝通與人才成熟度</h3>${maturitySummary(F('m3.maturity_anchors'))}
  <p class="note">完整行為錨點、面試題目與評分標準不放入職務說明書。</p>

  <h1>七、文件確認</h1>
  ${confirmTable(['職務主管確認', '招募／人力資源確認', '其他共同確認者'])}`);
}

// ═══════════ ③ 甄選流程設計書 ═══════════
export function buildSelectionDoc(c) {
  const F = (id) => fieldVal(c, id);
  return wrap(`
  ${coverPage(c, { kind: '正式輸出 ②', title: '甄選流程設計書', external: false })}

  <h1>一、文件版本與來源版本</h1>
  <table>
    <tr><th style="width:170px">本文件版本</th><td>v${docVersion(c)}</td></tr>
    <tr><th>依據之職務規格</th><td>${c.modules?.m3?.status === 'confirmed' ? '職務與人才規格定位（已確認）' : TBC}</td></tr>
    <tr><th>依據之職務說明書</th><td>${c.modules?.m4?.status === 'confirmed' ? '職務說明書（已確認）' : TBC}</td></tr>
  </table>

  <h1>二、甄選流程設計表</h1>
  ${processTable(F('m5.process_steps'))}

  <h1>三、候選人流程說明</h1>
  ${candidateInfo(F('m5.candidate_process_info'))}

  <h1>四、各職能結構化面試問題</h1>
  ${questionTable(F('m5.interview_questions'))}

  <h1>五、表格三：各職能的行為定錨等級</h1>
  ${anchorTable(allAnchors(c))}

  <h1>六、表現過度的可能風險</h1>
  ${riskTable(F('m5.overperformance_risks'))}

  <h1>七、可接受的培訓缺口</h1>
  ${gapTable(F('m5.training_gaps'))}

  <h1>八、文件確認</h1>
  ${confirmTable(['職務主管確認', '招募／人力資源確認', '其他面試角色確認'])}`);
}

// ═══════════ ④ JD 對外文案 ═══════════
// 唯一可對外的檔案。不得含完整題目、L1–L5、內部評分、風險假設。
export function buildJdDoc(c) {
  const F = (id) => fieldVal(c, id);
  return wrap(`
  ${coverPage(c, { kind: '正式輸出 ③', title: 'JD 對外文案', external: true })}

  <h1>職務名稱</h1>
  <p>${val(F('m6.job_title'))}</p>

  <h1>角色定位</h1>
  <p>${val(F('m6.role_positioning'))}</p>

  <h1>工作內容</h1>
  ${listBlock(F('m6.work_items'))}

  <h1>需要具備的職能</h1>
  ${listBlock(F('m6.minimum_competencies'))}

  <h1>期待的工作特質</h1>
  ${listBlock(F('m6.work_traits'))}

  <h1>面試流程</h1>
  ${listBlock(F('m6.interview_process'))}`);
}

// ── 共用表格片段 ────────────────────────────────────────
function anchorTable(anchors) {
  if (!anchors || !anchors.length) return `<p class="tbc">待確認</p>`;
  return '<table><tr><th>職能／維度</th><th>L1</th><th>L2</th><th>L3</th><th>L4</th><th>L5</th><th>最低</th><th>理想</th></tr>' +
    anchors.map(a => `<tr><td>${esc(a.competency)}</td><td>${esc(a.L1)}</td><td>${esc(a.L2)}</td><td>${esc(a.L3)}</td><td>${esc(a.L4)}</td><td>${esc(a.L5)}</td><td>${a.minimum_level ? esc(a.minimum_level) : TBC}</td><td>${a.ideal_level ? esc(a.ideal_level) : TBC}</td></tr>`).join('') +
    '</table>';
}

// 職務說明書用：成熟度只列最低／理想，不攤開 L1–L5（那是甄選用的評分工具）
function maturitySummary(anchors) {
  if (!anchors || !anchors.length) return `<p class="tbc">待確認</p>`;
  return '<table><tr><th>維度</th><th>最低可接受</th><th>理想</th></tr>' +
    anchors.map(a => `<tr><td>${esc(a.competency)}</td><td>${a.minimum_level ? esc(a.minimum_level) : TBC}</td><td>${a.ideal_level ? esc(a.ideal_level) : TBC}</td></tr>`).join('') + '</table>';
}

function jobBasicTable(info, c) {
  const rows = [
    ['職務名稱', fieldVal(c, 'case.job_title_working')],
    ['部門／團隊', info?.department], ['直屬主管', info?.report_to],
    ['聘用形式', info?.employment], ['工作地點', info?.location],
  ];
  return '<table>' + rows.map(([k, v]) => `<tr><th style="width:120px">${k}</th><td>${v ? esc(v) : TBC}</td></tr>`).join('') + '</table>';
}

function processTable(steps) {
  if (!steps || !steps.length) return `<p class="tbc">待確認</p>`;
  return '<table><tr><th>階段</th><th>負責角色</th><th>任務</th><th>甄選重點</th></tr>' +
    steps.map(s => `<tr><td>${esc(s.step)}</td><td>${esc(s.role)}</td><td>${esc(s.task)}</td><td>${esc(s.focus)}</td></tr>`).join('') + '</table>';
}

function candidateInfo(info) {
  if (!info) return `<p class="tbc">待確認</p>`;
  const rows = [['整體期間', info.duration], ['形式', info.format], ['候選人準備事項', info.prep], ['結果通知方式', info.notify]];
  return '<table>' + rows.map(([k, v]) => `<tr><th style="width:140px">${k}</th><td>${v ? esc(v) : TBC}</td></tr>`).join('') + '</table>';
}

function questionTable(qs) {
  if (!qs || !qs.length) return `<p class="tbc">待確認</p>`;
  return '<table><tr><th>使用階段</th><th>職能名稱</th><th>問題類型</th><th>核心問題</th><th>結構化追問</th><th>需要取得的行為證據</th><th>對應等級</th></tr>' +
    qs.map(q => `<tr><td>${esc(q.stage)}</td><td>${esc(q.competency)}</td><td>${esc(q.qtype)}</td><td>${esc(q.question)}</td><td>${esc(q.followup)}</td><td>${esc(q.evidence)}</td><td>${q.level ? esc(q.level) : TBC}</td></tr>`).join('') + '</table>';
}

// 組織關係與權責範圍（對上／對下／平行／對外）
function relationsTable(rows) {
  if (!rows || !rows.length) return `<p class="tbc">待確認</p>`;
  return '<table><tr><th>關係面向</th><th>主要對象</th><th>主要負責事項</th><th>協助事項</th><th>專業決策範圍</th><th>需要回報、協作或授權的情況</th></tr>' +
    rows.map(r => `<tr><td>${esc(r.aspect)}</td><td>${r.target ? esc(r.target) : TBC}</td><td>${r.primary ? esc(r.primary) : TBC}</td><td>${r.support ? esc(r.support) : TBC}</td><td>${r.decision ? esc(r.decision) : TBC}</td><td>${r.escalation ? esc(r.escalation) : TBC}</td></tr>`).join('') + '</table>';
}

// 人才成熟度（含「為什麼需要」）
function maturityTable(anchors) {
  if (!anchors || !anchors.length) return `<p class="tbc">待確認</p>`;
  return '<table><tr><th>人才成熟度維度</th><th>為什麼需要</th><th>L1</th><th>L2</th><th>L3</th><th>L4</th><th>L5</th><th>最低</th><th>理想／最高</th></tr>' +
    anchors.map(a => `<tr><td>${esc(a.competency)}</td><td>${a.why ? esc(a.why) : TBC}</td><td>${esc(a.L1)}</td><td>${esc(a.L2)}</td><td>${esc(a.L3)}</td><td>${esc(a.L4)}</td><td>${esc(a.L5)}</td><td>${a.minimum_level ? esc(a.minimum_level) : TBC}</td><td>${a.ideal_level ? esc(a.ideal_level) : TBC}</td></tr>`).join('') + '</table>';
}

function riskTable(rows) {
  if (!rows || !rows.length) return `<p class="tbc">待確認</p>`;
  return '<table><tr><th>職能名稱</th><th>可能出現的風險</th><th>需要透過面試核對的事項</th><th>可接受或可調整的條件</th></tr>' +
    rows.map(r => `<tr><td>${esc(r.competency)}</td><td>${esc(r.risk)}</td><td>${esc(r.check)}</td><td>${esc(r.acceptable)}</td></tr>`).join('') + '</table>';
}

function gapTable(rows) {
  if (!rows || !rows.length) return `<p class="tbc">待確認</p>`;
  return '<table><tr><th>職能名稱</th><th>到職時可接受的缺口</th><th>預計補足的程度與期間</th><th>組織提供的訓練或支持</th></tr>' +
    rows.map(r => `<tr><td>${esc(r.competency)}</td><td>${esc(r.gap)}</td><td>${esc(r.period)}</td><td>${esc(r.support)}</td></tr>`).join('') + '</table>';
}

function confirmTable(roles) {
  return '<table><tr><th style="width:180px">確認角色</th><th>姓名</th><th>確認日期</th></tr>' +
    roles.map(r => `<tr><td>${esc(r)}</td><td class="tbc">待確認</td><td class="tbc">待確認</td></tr>`).join('') + '</table>';
}

// ── 待確認事項（只出現在①引導與思考）────────────────────
export function collectPending(c) {
  const out = [];
  const checkList = [
    ['既有職務基礎確認', ['existing.role_reason', 'existing.expected_results', 'existing.main_work', 'existing.resources_authority']],
    ['職務與人才規格', ['m3.role_positioning', 'm3.value_outputs', 'm3.work_items', 'm3.organization_relations',
      'm3.prehire_knowledge', 'm3.core_judgments', 'm3.knowledge_anchors',
      'm3.required_tools', 'm3.professional_methods', 'm3.tool_anchors',
      'm3.quality_requirements', 'm3.ethics_nonnegotiables', 'm3.attitude_anchors', 'm3.maturity_anchors']],
    ['JD 對外文案', ['m6.job_title', 'm6.role_positioning']],
  ];
  for (const [mod, fids] of checkList) {
    for (const fid of fids) {
      const fv = c.fields[fid];
      if (!fv || !fv.confirmed) out.push({ module: mod, field: fid, reason: !fv ? '尚未填寫' : '尚未人工確認', by: '學員／講師' });
    }
  }
  allAnchors(c).forEach(a => { if (!a.minimum_level) out.push({ module: '職務與人才規格', field: `錨點「${a.competency}」最低等級`, reason: '最低等級須人工決定', by: '講師' }); });
  (c.fields['m3.maturity_anchors']?.value || []).forEach(m => {
    if (!m.why) out.push({ module: '人才成熟度', field: `維度「${m.competency}」為什麼需要這個範圍`, reason: '等級理由須人工填寫', by: '學員／講師' });
  });
  // 待課堂討論項目（例如未解決的權責矛盾）——一律帶進文件，不隱藏
  (c.discussion_items || []).forEach(d => {
    out.push({ module: d.module === 'existing' ? '既有職務基礎確認' : d.module, field: d.topic, reason: d.reason, by: d.by });
  });
  return out;
}

export function countPending(c) { return collectPending(c).length; }

function pendingTable(c) {
  const items = collectPending(c);
  if (!items.length) return '<p>目前沒有待確認事項。</p>';
  return '<table><tr><th>模組</th><th>欄位／議題</th><th>為何待確認</th><th>建議由誰確認</th></tr>' +
    items.map(i => `<tr><td>${esc(i.module)}</td><td>${esc(i.field)}</td><td>${esc(i.reason)}</td><td>${esc(i.by)}</td></tr>`).join('') + '</table>';
}

// ── 文件登記表 ──────────────────────────────────────────
export const DOCUMENTS = [
  { key: 'guide',     name: '引導與思考',       kind: '思考歷程紀錄', external: false, build: buildGuideDoc },
  { key: 'jobdesc',   name: '職務說明書',       kind: '正式輸出 ①',  external: false, build: buildJobDescriptionDoc },
  { key: 'selection', name: '甄選流程設計書',   kind: '正式輸出 ②',  external: false, build: buildSelectionDoc },
  { key: 'jd',        name: 'JD 對外文案',      kind: '正式輸出 ③',  external: true,  build: buildJdDoc },
];

export function getDocument(key) { return DOCUMENTS.find(d => d.key === key); }

// ── 下載 ────────────────────────────────────────────────
function safeName(s) { return String(s || '').replace(/[\\/:*?"<>|]/g, '_'); }

export function downloadDocument(c, key) {
  const doc = getDocument(key);
  if (!doc) return null;
  const html = doc.build(c);
  const role = safeName(c.fields['case.job_title_working']?.value || '職務');
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `${doc.name}_${role}_v${docVersion(c)}_${ymd}.doc`;
  const blob = new Blob(['﻿' + html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return filename;
}

/** 依序下載四份（瀏覽器需要間隔，否則會被擋掉後續下載） */
export function downloadAllDocuments(c, onEach) {
  const names = [];
  DOCUMENTS.forEach((doc, i) => {
    setTimeout(() => {
      const n = downloadDocument(c, doc.key);
      names.push(n);
      if (onEach) onEach(doc, n);
    }, i * 700);
  });
  return DOCUMENTS.map(d => d.name);
}
