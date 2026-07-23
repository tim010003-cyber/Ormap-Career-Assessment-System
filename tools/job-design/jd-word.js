/**
 * jd-word.js — 職務設計與甄選 Web App｜文件產生（Demo 原型）
 * =====================================================================
 * 產出四份**獨立**文件（PO 決策 2026-07-19，取代 05 規格原本的「單一合併檔」）：
 *   ① 引導與思考   — 思考歷程（職務優化：第一部既有職務盤點＋第二部職務與人才規格）
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

// 表格三來源：三張 M3 錨點表 ＋ 人才成熟度五個維度（全部，等級只在這裡出現）
const ANCHOR_IDS = ['m3.knowledge_anchors', 'm3.tool_anchors', 'm3.attitude_anchors'];
const allAnchors = (c) => [
  ...ANCHOR_IDS.flatMap(id => fieldVal(c, id) || []),
  ...(fieldVal(c, 'm3.maturity_anchors') || [])
    .map(m => ({ ...m, isTrait: true, definition: m.definition || m.description || '' })),
];

/**
 * 文件樣式：純黑白、緊湊、正式。
 *
 * 為什麼不用品牌色：這些檔案下載後會被拿去改、去印、去轉 PDF、
 * 貼進別人的簡報。彩色線條在那些情境只會變成雜訊，而且不好改。
 * 標準公文的作法就是黑白 + 灰階層次，需要品牌感時由使用者自己套。
 */
const STYLE = `
<style>
  @page{margin:2cm 2.2cm;}
  @page WordSection1{size:21cm 29.7cm;margin:2cm 2.2cm;}
  div.WordSection1{page:WordSection1;}
  body{font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;color:#000;
       line-height:1.45;font-size:10.5pt;}
  h1{font-size:13pt;font-weight:700;margin:16pt 0 6pt;padding-bottom:3pt;
     border-bottom:1pt solid #000;letter-spacing:.5pt;}
  h2{font-size:11.5pt;font-weight:700;margin:14pt 0 5pt;padding:2pt 0 2pt 7pt;
     border-left:3pt solid #000;background:#f2f2f2;}
  h3{font-size:10.5pt;font-weight:700;margin:10pt 0 3pt;}
  p{margin:3pt 0;}
  table{border-collapse:collapse;width:100%;margin:4pt 0 8pt;
        font-size:9.5pt;table-layout:fixed;}
  th,td{border:.5pt solid #666;padding:3pt 5pt;text-align:left;
        vertical-align:top;line-height:1.35;word-wrap:break-word;}
  th{background:#e8e8e8;font-weight:700;}
  td ul{margin:2pt 0 2pt 16pt;padding:0;} td li{margin:1pt 0;}
  ul{margin:2pt 0 2pt 16pt;padding:0;} li{margin:1pt 0;line-height:1.4;}
  .tbc{color:#666;}
  .cover{padding:0 0 8pt;margin-bottom:4pt;border-bottom:1.5pt solid #000;}
  .cover .doc-title{font-size:19pt;font-weight:900;margin:0 0 4pt;letter-spacing:1pt;}
  .cover .meta-line{font-size:9.5pt;color:#333;margin:1pt 0;}
  .note{border:.5pt solid #999;background:#f7f7f7;padding:5pt 8pt;
        font-size:9.5pt;margin:5pt 0;}
  .part{color:#666;font-size:9pt;letter-spacing:1.5pt;font-weight:400;}
  .lvmark{margin-top:1pt;font-size:8.5pt;font-weight:700;color:#333;}
  .trait{font-size:8pt;border:.5pt solid #666;padding:0 3pt;color:#333;}
  /* 行為錨點卡：一個職能一張，整張不要被拆到兩頁 */
  .acard{margin:0 0 7pt;page-break-inside:avoid;}
  .ach{font-size:10.5pt;background:#dcdcdc;}
  /* 標題不要落在頁尾當孤行，表格列不要從中間被切斷 */
  h1,h2,h3,h4{page-break-after:avoid;}
  tr{page-break-inside:avoid;}
</style>`;

/**
 * 職務名稱、合作形式這些「三份文件都會用到」的資料，一律走這裡。
 * 之前封面讀 case.job_title_working、基本資料讀 m4.job_basic_info.job_title，
 * 使用者在基本資料改了名字，封面沒跟著改，同一份文件出現兩個職稱。
 */
function jobFacts(c) {
  const info = fieldVal(c, 'm4.job_basic_info') || {};
  return {
    title: info.job_title || fieldVal(c, 'case.job_title_working') || '',
    org: info.department || fieldVal(c, 'case.organization_name') || '',
    engagement: info.engagement || '',
    info,
  };
}

/**
 * 文件狀態由人決定，不由系統判定。預設草稿。
 * 系統只在使用者要改成「正式發布」時提醒還有幾項沒確認，不擋。
 */
export const DOC_STATUS = ['草稿', '審閱中', '正式發布'];
export const docStatus = (c) => c.doc_status || '草稿';

/**
 * 文件抬頭。只印客戶需要知道的四件事——
 * 案例路徑、文件版本、待確認數量那些是系統對自己說話，不放進交付文件。
 */
function coverPage(c, opts) {
  return `<section class="cover">
    <div class="doc-title">${esc(opts.title)}</div>
    <div class="meta-line">狀態：${esc(docStatus(c))}</div>
    <div class="meta-line">文件建立人：${esc(fieldVal(c, 'case.creator_role') || '—')}</div>
    <div class="meta-line">建立日期：${esc(fieldVal(c, 'case.created_date') || '—')}</div>
  </section>`;
}


/**
 * 企業理念。來自問題釐清開場「這個組織在做什麼」，只印在對外的職務招募說明上。
 * 候選人要判斷「我為什麼要來這裡」，這段就是答案。
 */
function orgIntro(c) {
  const what = fieldVal(c, 'm1.org_what');
  const who = fieldVal(c, 'm1.org_who');
  const value = fieldVal(c, 'm1.org_value');
  const beliefs = fieldVal(c, 'm1.org_beliefs');
  // 沒填也要出標題。這一段是文件的固定結構，看得到空位才知道要回去補。
  if (!what && !who && !value && (!beliefs || !beliefs.length)) {
    return `<h1>企業理念</h1><p class="tbc">待確認（在「問題釐清 · 這個組織在做什麼」回答後，這裡會自動帶入）</p>`;
  }
  const paras = [what, who, value].filter(x => x && String(x).trim())
    .map(x => `<p>${esc(x)}</p>`).join('');
  const b = (beliefs || []).filter(x => (x ?? '').toString().trim());
  return `<h1>企業理念</h1>${paras}${b.length ? '<p><b>我們在乎的事</b></p>' + listBlock(b) : ''}`;
}

/**
 * 第一人稱代換。
 * 口述時說話的是主管本人，所以整份逐字稿都是「我」。
 * 提示詞已經要求 AI 改寫，但既有資料是舊的、人工補打的也可能留下「我」，
 * 所以輸出時再收一次網。只動明顯的自稱，不動「我們」那種組織口吻。
 */
function depersonalize(html, roleName) {
  const r = roleName || '主管';
  return String(html)
    .replace(/由我審核/g, `由${r}審核`)
    .replace(/給我作最終審核/g, `交由${r}最終審核`)
    .replace(/需要我審核/g, `需要${r}審核`)
    .replace(/我與相關窗口/g, `${r}與相關窗口`)
    .replace(/提交給我/g, `提交給${r}`)
    .replace(/回報給我/g, `回報給${r}`)
    .replace(/由我(決定|負責|安排|協調)/g, (m, v) => `由${r}${v}`)
    .replace(/(^|[，。；、（\s])我(需要|會|要|來|是|的)/g, (m, p, v) => `${p}${r}${v}`);
}

/**
 * Word 的 HTML 引擎只吃得下最基本的樣式表：
 * 後代選擇器（`.cover .doc-title`、`td ul`）與 class 選擇器（`.tbc`、`.note`）
 * 一律被忽略，所以下載的 .doc 會把封面大標、meta 行、待確認灰字全部退回內文樣式，
 * 跟網頁預覽長得完全不一樣。
 *
 * 解法：輸出前把 STYLE 裡的視覺一份不漏地「攤平」成 inline style。
 * inline 優先權最高，所以預覽端的呈現不變；就算 Word 把整個 <style> 丟掉，
 * 版面依然正確。STYLE 保留，因為它仍是預覽與人工編輯時的基準。
 *
 * 只加 style 屬性，不動任何標籤、文字、class 或既有屬性；
 * 既有的 style（例如 `<th style="width:170px">`）擺在最後，維持原本的優先權。
 */
const TD_STYLE = 'border:.5pt solid #666;padding:3pt 5pt;text-align:left;vertical-align:top;line-height:1.35;word-wrap:break-word;';
const TAG_STYLE = {
  h1: 'font-size:13pt;font-weight:700;margin:16pt 0 6pt;padding-bottom:3pt;border-bottom:1pt solid #000;letter-spacing:.5pt;page-break-after:avoid;',
  h2: 'font-size:11.5pt;font-weight:700;margin:14pt 0 5pt;padding:2pt 0 2pt 7pt;border-left:3pt solid #000;background:#f2f2f2;page-break-after:avoid;',
  h3: 'font-size:10.5pt;font-weight:700;margin:10pt 0 3pt;page-break-after:avoid;',
  h4: 'font-size:10pt;font-weight:700;margin:9pt 0 3pt;page-break-after:avoid;',
  tr: 'page-break-inside:avoid;',
  p: 'margin:3pt 0;',
  table: 'border-collapse:collapse;width:100%;margin:4pt 0 8pt;font-size:9.5pt;table-layout:fixed;',
  th: TD_STYLE + 'background:#e8e8e8;font-weight:700;',
  td: TD_STYLE,
  ul: 'margin:2pt 0 2pt 16pt;padding:0;',
  li: 'margin:1pt 0;line-height:1.4;',
};
const CLASS_STYLE = {
  tbc: 'color:#666;',
  cover: 'padding:0 0 8pt;margin-bottom:4pt;border-bottom:1.5pt solid #000;',
  'doc-title': 'font-size:19pt;font-weight:900;line-height:1.2;margin:0 0 4pt;letter-spacing:1pt;',
  'meta-line': 'font-size:9.5pt;color:#333;margin:1pt 0;',
  note: 'border:.5pt solid #999;background:#f7f7f7;padding:5pt 8pt;font-size:9.5pt;margin:5pt 0;',
  part: 'color:#666;font-size:9pt;letter-spacing:1.5pt;font-weight:400;',
  lvmark: 'margin-top:1pt;font-size:8.5pt;font-weight:700;color:#333;',
  trait: 'font-size:8pt;border:.5pt solid #666;padding:0 3pt;color:#333;',
  acard: 'margin:0 0 7pt;page-break-inside:avoid;',
  ach: 'font-size:10.5pt;background:#dcdcdc;',
};
// 字體名稱用單引號：這串會被塞進 style="..." 屬性裡，用雙引號會把屬性提早收掉。
const BODY_STYLE = "font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;color:#000;line-height:1.45;font-size:10.5pt;";

function inlineStyles(html) {
  return String(html).replace(
    /<(h1|h2|h3|h4|p|table|tr|th|td|ul|li|div|span|section)\b([^>]*)>/gi,
    (m, tag, attrs) => {
      const cls = /class\s*=\s*"([^"]*)"/i.exec(attrs);
      const base = [TAG_STYLE[tag.toLowerCase()] || ''];
      if (cls) cls[1].trim().split(/\s+/).forEach(k => { if (CLASS_STYLE[k]) base.push(CLASS_STYLE[k]); });
      const add = base.join('');
      if (!add) return m;
      const own = /\sstyle\s*=\s*"([^"]*)"/i.exec(attrs);
      if (own) {
        const merged = add + (own[1].trim().endsWith(';') || !own[1].trim() ? own[1] : own[1] + ';');
        return `<${tag}${attrs.replace(own[0], ` style="${merged}"`)}>`;
      }
      return `<${tag}${attrs} style="${add}">`;
    }
  );
}

/** 讓 @page 邊界在 Word 生效：Word 只認 WordSection1 這個慣例名稱 */
const MSO_HEAD = `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->`;

const wrap = (inner, c) => `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="utf-8">${MSO_HEAD}${STYLE}</head><body style="${BODY_STYLE}"><div class="WordSection1">${inlineStyles(c ? depersonalize(inner, reporterRole(c)) : inner)}</div></body></html>`;

/** 對外要用的角色稱謂：優先用實際填的對接窗口職稱，否則統稱主管 */
function reporterRole(c) {
  const info = fieldVal(c, 'm4.job_basic_info') || {};
  return info.report_to_title || '主管';
}

// ═══════════ ① 引導與思考 ═══════════
export function buildGuideDoc(c) {
  const F = (id) => fieldVal(c, id);
  const isPathA = c.path_type === 'full_design';
  const workItems = F('m3.work_items') || [];

  const list = (id) => listBlock(F(id));
  const pathASections = `
  <h2><span class="part">第一部</span>　問題釐清定位</h2>
  <h3>需求背景與觸發</h3>
  <table>
    <tr><th style="width:170px">最近的觸發事件</th><td>${val(F('m1.trigger_event'))}</td></tr>
    <tr><th>問題開始或被注意到的時間</th><td>${val(F('m1.first_noticed_at'))}</td></tr>
    <tr><th>提出者與主要受影響角色</th><td>${list('m1.affected_roles')}</td></tr>
    <tr><th>需求性質</th><td>${val(F('m1.demand_nature'))}</td></tr>
  </table>
  <h3>已確認事實、證據與待驗證假設</h3>
  <table>
    <tr><th style="width:170px">已確認的事實與現象</th><td>${list('m1.confirmed_facts')}</td></tr>
    <tr><th>有資料或多人觀察支持</th><td>${list('m1.supporting_evidence')}</td></tr>
    <tr><th>合理但尚待驗證的推論</th><td>${list('m1.hypotheses_pending')}</td></tr>
    <tr><th>目前只有感受的說法</th><td>${list('m1.feelings_claims')}</td></tr>
    <tr><th>仍需補充的資料</th><td>${list('m1.information_gaps')}</td></tr>
  </table>
  <h3>優先問題與問題類型</h3>
  ${problemTable(F('m1.problem_statements'))}
  <p><b>若只處理局部問題，可能出現的下一個瓶頸：</b></p>${list('m1.next_bottleneck')}
  <h3>問題尺度、影響及不處理代價</h3>
  <table>
    <tr><th style="width:170px">主要影響對象與範圍</th><td>${val(F('m1.impact_scope'))}</td></tr>
    <tr><th>頻率、持續程度與是否擴大</th><td>${val(F('m1.frequency_duration'))}</td></tr>
    <tr><th>目前已發生的影響</th><td>${list('m1.current_impacts')}</td></tr>
    <tr><th>三至六個月的可能代價</th><td>${list('m1.inactivity_cost')}</td></tr>
    <tr><th>影響程度與判斷依據</th><td>${val(F('m1.importance'))}</td></tr>
    <tr><th>時間敏感性與關鍵期限</th><td>${val(F('m1.time_sensitivity'))}</td></tr>
    <tr><th>需求尺度</th><td>${val(F('m1.need_scale'))}</td></tr>
    <tr><th>尚未量化的風險</th><td>${list('m1.unquantified_risks')}</td></tr>
  </table>
  <h3>最低與理想改善結果</h3>
  <table>
    <tr><th style="width:170px">目前狀況</th><td>${val(F('m1.current_condition'))}</td></tr>
    <tr><th>期待改變</th><td>${val(F('m1.target_change'))}</td></tr>
    <tr><th>主要受益對象</th><td>${list('m1.beneficiaries')}</td></tr>
    <tr><th>判斷改善是否發生的依據</th><td>${list('m1.success_evidence')}</td></tr>
    <tr><th>最低可接受結果</th><td>${val(F('m1.minimum_result'))}</td></tr>
    <tr><th>理想結果</th><td>${val(F('m1.ideal_result'))}</td></tr>
    <tr><th>超出本次範圍的結果</th><td>${list('m1.out_of_scope')}</td></tr>
    <tr><th>無法由單一方案承擔的期待</th><td>${list('m1.beyond_single_solution')}</td></tr>
  </table>
  <h3>投入判斷、限制及下一步</h3>
  <table>
    <tr><th style="width:170px">預期價值與可避免的代價</th><td>${list('m1.expected_value')}</td></tr>
    <tr><th>可投入的資源範圍</th><td>${val(F('m1.available_resources'))}</td></tr>
    <tr><th>不可妥協的限制</th><td>${list('m1.nonnegotiables')}</td></tr>
    <tr><th>目前缺少的成功條件</th><td>${list('m1.missing_conditions')}</td></tr>
    <tr><th>投入不足的風險</th><td>${list('m1.underinvest_risk')}</td></tr>
    <tr><th>建議狀態</th><td>${val(F('m1.investment_status'))}</td></tr>
    <tr><th>理由</th><td>${val(F('m1.status_reason'))}</td></tr>
  </table>

  <h2><span class="part">第二部</span>　職務需求界定</h2>
  <h3>承接的優先問題</h3>
  <table>
    <tr><th style="width:170px">本次要處理的優先問題</th><td>${val(F('m2.upstream_problem'))}</td></tr>
    <tr><th>最低需要改善到什麼程度</th><td>${val(F('m2.upstream_minimum'))}</td></tr>
    <tr><th>理想希望改善到什麼程度</th><td>${val(F('m2.upstream_ideal'))}</td></tr>
    <tr><th>重要限制或不可犧牲條件</th><td>${val(F('m2.upstream_constraints'))}</td></tr>
    <tr><th>仍待驗證的假設或資訊</th><td>${val(F('m2.upstream_hypotheses'))}</td></tr>
    <tr><th>暫時不處理的問題</th><td>${val(F('m2.upstream_out_of_scope'))}</td></tr>
  </table>
  <h3>第一類：改善與重整既有資源</h3>
  ${strategyTable(c, '工作與流程改善', 'm2.strategies_a')}
  ${strategyTable(c, '人員配置與管理改善', 'm2.strategies_b')}
  <h3>第二類：增加新的能力或人力供給</h3>
  ${strategyTable(c, '引入外部專業與彈性人力', 'm2.strategies_c')}
  ${strategyTable(c, '增加內部人力與正式編制', 'm2.strategies_d')}
  <h3>合作形式與資源配置決策</h3>
  ${resourcePlanTable(c)}
  <table>
    <tr><th style="width:170px">預計採用的合作形式組合</th><td>${val(F('m2.engagement_mix'))}</td></tr>
    <tr><th>各自負責的範圍與分工</th><td>${val(F('m2.engagement_split'))}</td></tr>
    <tr><th>可投入的預算範圍與分配</th><td>${val(F('m2.budget_plan'))}</td></tr>
    <tr><th>增加人才前必須先完成的改善</th><td>${val(F('m2.prerequisite_improvements'))}</td></tr>
    <tr><th>決策理由</th><td>${val(F('m2.decision_reason'))}</td></tr>
    <tr><th>人力策略結論</th><td>${list('m2.staffing_decision')}</td></tr>
  </table>
  <h3>角色類型與層級理由</h3>
  <table>
    <tr><th style="width:170px">角色類型判斷</th><td>${list('m2.role_types')}</td></tr>
    <tr><th>管理問題的責任判斷</th><td>${list('m2.management_responsibility')}</td></tr>
    <tr><th>需求持續性</th><td>${val(F('m2.demand_duration'))}</td></tr>
    <tr><th>初步工作量或頻率</th><td>${val(F('m2.workload_frequency'))}</td></tr>
    <tr><th>主要合作角色</th><td>${val(F('m2.collaboration_roles'))}</td></tr>
    <tr><th>建議角色類型</th><td>${val(F('m2.suggested_role_type'))}</td></tr>
    <tr><th>為什麼需要這個層級</th><td>${val(F('m2.role_level_reason'))}</td></tr>
    <tr><th>只增加執行人力仍不會改善的問題</th><td>${val(F('m2.unresolved_by_executor'))}</td></tr>
  </table>
  <h3>人才任務範圍與組織責任</h3>
  <table>
    <tr><th style="width:170px">人才主要負責</th><td>${list('m2.primary_responsibilities')}</td></tr>
    <tr><th>需要共同處理</th><td>${list('m2.shared_responsibilities')}</td></tr>
    <tr><th>人才協助處理</th><td>${list('m2.support_responsibilities')}</td></tr>
    <tr><th>由主管或組織負責</th><td>${list('m2.organization_responsibilities')}</td></tr>
    <tr><th>不應期待人才解決</th><td>${list('m2.outside_role_scope')}</td></tr>
    <tr><th>組織可以提供的條件</th><td>${list('m2.organization_support')}</td></tr>
    <tr><th>目前仍缺少的條件</th><td>${val(F('m2.missing_conditions'))}</td></tr>
  </table>

  <h2><span class="part">第三部</span>　職務與人才規格定位</h2>`;

  const pathBSections = `
  <h2><span class="part">第一部</span>　既有職務基礎確認</h2>
  <h3>職務存在理由</h3><p>${val(F('existing.role_reason'))}</p>
  <h3>既有預期成果</h3>${listBlock(F('existing.expected_results'))}
  <h3>既有主要工作</h3>${listBlock(F('existing.main_work'))}
  <h3>現有職務問題</h3>${listBlock(F('existing.current_issues'))}
  <h3>正在改變的期待</h3><p>${val(F('existing.changed_expectations'))}</p>
  <h3>資源、授權與組織條件</h3><p>${val(F('existing.resources_authority'))}</p>
  <h2><span class="part">第二部</span>　職務與人才規格定位</h2>`;

  return wrap(`
  ${coverPage(c, { kind: '思考歷程紀錄', title: '引導與思考', external: false })}

  <h1>文件資訊與使用說明</h1>
  <p class="note">本文件記錄的是<strong>思考與引導的歷程</strong>，包含原始輸入、AI 整理與人工確認的差異，屬內部資料。正式對外或對內使用的文件請見另外三份：職務說明書、甄選流程設計書、JD 對外文案。</p>
  <p>尚未確認或待課堂討論項目數量：<strong>${countPending(c)}</strong> 項。</p>

  <h1>思考歷程紀錄</h1>
  ${isPathA ? pathASections : pathBSections}
  <h3>結果與價值</h3>
  <table>
    <tr><th style="width:170px">具體產出與實際結果</th><td>${listBlock(F('m3.concrete_outputs'))}</td></tr>
    <tr><th>可觀察的變化</th><td>${listBlock(F('m3.observable_changes'))}</td></tr>
    <tr><th>錯誤可能造成的後果</th><td>${listBlock(F('m3.error_consequences'))}</td></tr>
  </table>
  <h3>角色定位</h3><p>${val(F('m3.role_positioning'))}</p>
  <h3>預期價值產出</h3>${listBlock(F('m3.value_outputs'))}
  <h3>工作流程</h3>
  <table>
    <tr><th style="width:170px">主要步驟與順序</th><td>${listBlock(F('m3.work_steps'))}</td></tr>
    <tr><th>需要協作的內容</th><td>${listBlock(F('m3.collaboration_items'))}</td></tr>
    <tr><th>使用或處理的資料與物件</th><td>${listBlock(F('m3.data_objects'))}</td></tr>
  </table>
  <h3>主要工作項目</h3>
  <table><thead><tr><th>工作項目</th><th>責任區分</th><th>性質</th><th>頻率／占比</th></tr></thead>
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
  </table>`, c);
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
  ${c.case_summary && c.case_summary.text ? `
  <h3>2.1 職務需求來源</h3>
  <p>${esc(c.case_summary.text).replace(/\n+/g, '</p><p>')}</p>` : ''}

  <h1>三、預期價值產出</h1>
  ${listBlock(F('m3.value_outputs'))}

  <h1>四、主要工作內容</h1>
  <table><thead><tr><th>工作項目</th><th>責任區分</th><th>性質</th><th>頻率／占比</th></tr></thead>
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
  ${confirmTable(['職務主管確認', '招募／人力資源確認', '其他共同確認者'])}`, c);
}

// ═══════════ ③ 甄選流程設計書 ═══════════
export function buildSelectionDoc(c) {
  const F = (id) => fieldVal(c, id);
  return wrap(`
  ${coverPage(c, { kind: '正式輸出 ②', title: '甄選流程設計書', external: false })}

  <h1>一、職務基本資料</h1>
  ${jobBasicTable(F('m4.job_basic_info'), c)}

    <h1>二、甄選流程設計表</h1>
  ${processTable(F('m5.process_steps'))}

  <h1>三、候選人須知</h1>
  ${candidateInfo(F('m5.candidate_process_info'))}

  <h1>四、各職能結構化面試問題</h1>
  ${questionTable(F('m5.interview_questions'))}

  <h1>五、各職能的行為定錨等級</h1>
  ${anchorTable(allAnchors(c))}

  <h1>六、表現過度的可能風險</h1>
  ${riskTable(F('m5.overperformance_risks'))}

  <h1>七、可接受的培訓缺口</h1>
  ${gapTable(F('m5.training_gaps'))}

  <h1>八、文件確認</h1>
  ${confirmTable(['職務主管確認', '招募／人力資源確認', '其他面試角色確認'])}`, c);
}

// ═══════════ ④ JD 對外文案 ═══════════
// 唯一可對外的檔案。不得含完整題目、L1–L5、內部評分、風險假設。
export function buildJdDoc(c) {
  const F = (id) => fieldVal(c, id);
  return wrap(`
  ${coverPage(c, { kind: '正式輸出 ③', title: '職務招募說明', external: true })}

  <h1>職務名稱</h1>
  <p>${esc(jobFacts(c).title) || TBC}</p>

  <h1>基本資料</h1>
  ${jdBasicTable(F('m4.job_basic_info'), c)}

  ${orgIntro(c)}

  <h1>角色定位</h1>
  <p>${val(F('m6.role_positioning'))}</p>

  <h1>工作內容</h1>
  ${listBlock(F('m6.work_items'))}

  <h1>需要具備的職能</h1>
  ${listBlock(F('m6.minimum_competencies'))}

  <h1>期待的工作特質</h1>
  ${listBlock(F('m6.work_traits'))}

  <h1>面試流程</h1>
  ${listBlock(F('m6.interview_process'))}`, c);
}

// ── 共用表格片段 ────────────────────────────────────────
/**
 * 表格三：各職能的行為定錨等級（BARS）。
 * L1–L5 每一格的內容**就是**該等級的行為特徵，不另立欄位。
 * 最低／理想以 ✓ 標示於對應等級（打勾概念）。
 *
 * 為什麼不是一張九欄寬表（2026-07-23 改）
 *   原本一列塞「職能／定義／L1–L5／最低／理想」共九欄。A4 直式扣掉邊界只剩
 *   約 16.6cm，`table-layout:fixed` 又沒有 colgroup，九欄就是平均分配，
 *   每欄僅約 1.8cm——9.5pt 中文一行放不到 5 個字。示範資料的 L1–L5 中位數
 *   17 字、最長 28 字，等於每格被折成 4～7 行，整張表變成一片直排文字牆。
 *   欄再多也沒用，寬度是紙決定的。
 *
 * 改法：一個職能一張卡，等級改成直向兩欄（等級｜可觀察行為），
 * 行為描述獨佔約 14cm，一行放得下 40 字以上。卡片前面補一張索引表，
 * 保留原本寬表唯一的優點——一眼看完所有職能的最低／理想要求。
 */
function anchorTable(anchors) {
  if (!anchors || !anchors.length) return `<p class="tbc">待確認</p>`;
  const LV = ['L1', 'L2', 'L3', 'L4', 'L5'];
  const mark = (a, L) => {
    const tags = [];
    if (a.minimum_level === L) tags.push('✓最低');
    if (a.ideal_level === L) tags.push('✓理想');
    return tags.length ? `<div class="lvmark">${tags.join('　')}</div>` : '';
  };
  const index = '<table><thead><tr><th>職能名稱</th><th style="width:110px">最低可接受等級</th>'
    + '<th style="width:110px">理想適任等級</th></tr></thead>'
    + anchors.map(a => `<tr><td>${esc(a.competency)}${a.isTrait ? ' <span class="trait">成熟度</span>' : ''}</td>`
      + `<td>${a.minimum_level ? esc(a.minimum_level) : TBC}</td>`
      + `<td>${a.ideal_level ? esc(a.ideal_level) : TBC}</td></tr>`).join('')
    + '</table>';
  const cards = anchors.map(a => `<div class="acard"><table>
    <thead><tr><th colspan="2" class="ach">${esc(a.competency)}${a.isTrait ? ' <span class="trait">成熟度</span>' : ''}</th></tr></thead>
    <tr><th style="width:74px">職能定義</th><td>${a.definition ? esc(a.definition) : TBC}</td></tr>
    ${LV.map(L => `<tr><th style="width:74px">${L}${mark(a, L)}</th><td>${esc(a[L])}</td></tr>`).join('')}
  </table></div>`).join('');
  return index + cards
    + '<p class="note">L1–L5 每一格為該等級的可觀察行為特徵（行為錨定等級 BARS）；✓ 標示該職能的最低可接受與理想適任等級。</p>';
}

/**
 * 職務說明書 6.5：**五個維度全部寫入**（依《4.職務說明書》6.5 範本），
 * 但只寫「需要具備的內容與想法」，**不放等級**——
 * 凡是有等級的一律歸甄選流程設計書的表格三。（PO 釐清 2026-07-21）
 */
function maturitySummary(anchors) {
  const all = anchors || [];
  if (!all.length) return `<p class="tbc">待確認</p>`;
  return '<table><thead><tr><th style="width:180px">人才成熟度維度</th><th>需要具備的內容與想法</th></tr></thead>' +
    all.map(a => `<tr><td>${esc(a.competency)}</td><td>${a.description ? esc(a.description) : (a.why ? esc(a.why) : TBC)}</td></tr>`).join('') +
    '</table><p class="note">各職能與維度的分級標準與最低／理想要求，詳見《甄選流程設計書》表格三。</p>';
}

function jobBasicTable(info, c) {
  // 職務名稱／組織／合作形式一律走 jobFacts()，三份文件不會再分歧。
  // ALWAYS 的欄位就算空白也印出來（留白本身是資訊）；其餘沒填就不佔版面。
  const facts = jobFacts(c);
  const ALWAYS = new Set(['職務名稱', '合作形式', '招募人數']);
  const rows = [
    ['職務名稱', facts.title],
    ['合作形式', facts.engagement],
    ['招募人數', info?.headcount],
    ['同時在職人數', info?.concurrent],
    ['部門／團隊', info?.department],
    ['主要對接窗口', info?.report_to],
    ['工作地點', info?.location],
    ['工作模式', info?.work_mode],
    ['工作時間／投入量', info?.work_hours],
    ['報酬範圍', info?.salary_range],
  ].filter(([k, v]) => ALWAYS.has(k) || (v != null && String(v).trim() !== ''));
  return '<table>' + rows.map(([k, v]) => `<tr><th style="width:130px">${k}</th><td>${v ? esc(v) : TBC}</td></tr>`).join('') + '</table>';
}

function processTable(steps) {
  if (!steps || !steps.length) return `<p class="tbc">待確認</p>`;
  return '<table>'
    + '<colgroup><col style="width:18%"><col style="width:16%"><col style="width:10%"><col style="width:30%"><col style="width:26%"></colgroup>'
    + '<thead><tr><th>階段</th><th>負責角色</th><th>時長</th><th>任務</th><th>甄選重點</th></tr></thead>'
    + steps.map(s => `<tr><td>${esc(s.step)}</td><td>${esc(s.role)}</td><td>${s.duration ? esc(s.duration) : '—'}</td><td>${esc(s.task)}</td><td>${esc(s.focus)}</td></tr>`).join('') + '</table>';
}

function candidateInfo(info) {
  if (!info) return `<p class="tbc">待確認</p>`;
  const rows = [['整體期間', info.duration], ['形式', info.format], ['候選人準備事項', info.prep], ['結果通知方式', info.notify]];
  return '<table>' + rows.map(([k, v]) => `<tr><th style="width:140px">${k}</th><td>${v ? esc(v) : TBC}</td></tr>`).join('') + '</table>';
}

/**
 * 各職能結構化面試問題。
 * 「使用階段」已移除（這張表本來就全是結構化面試），「問題類型」遞補到第一欄。
 * 依職能分組，同一項職能的題目只在第一列印出職能名稱，表格不會一直重複。
 */
function questionTable(qs) {
  if (!qs || !qs.length) return `<p class="tbc">待確認</p>`;
  let prev = null;
  return '<table>'
    + '<colgroup><col style="width:12%"><col style="width:14%"><col style="width:26%"><col style="width:22%"><col style="width:19%"><col style="width:7%"></colgroup>'
    + '<thead><tr><th>問題類型</th><th>職能名稱</th><th>核心問題</th><th>結構化追問</th><th>需要取得的行為證據</th><th>等級</th></tr></thead>'
    + qs.map(q => {
      const same = q.competency === prev;
      prev = q.competency;
      return `<tr><td>${esc(q.qtype)}</td><td>${same ? '' : esc(q.competency)}</td><td>${esc(q.question)}</td><td>${esc(q.followup)}</td><td>${esc(q.evidence)}</td><td>${q.level ? esc(q.level) : '—'}</td></tr>`;
    }).join('') + '</table>';
}

// 組織關係與權責範圍（對上／對下／平行／對外）
/** JD 對外版的基本資料：只放候選人看了有用、也適合對外公開的欄位 */
function jdBasicTable(info, c) {
  const facts = jobFacts(c);
  const rows = [
    ['合作形式', facts.engagement],
    ['招募人數', info?.headcount],
    ['工作地點', info?.location],
    ['工作模式', info?.work_mode],
    ['工作時間／投入量', info?.work_hours],
    ['報酬範圍', info?.salary_range],
  ].filter(([, v]) => v != null && String(v).trim() !== '');
  if (!rows.length) return `<p class="tbc">待確認</p>`;
  return '<table>' + rows.map(([k, v]) => `<tr><th style="width:130px">${k}</th><td>${esc(v)}</td></tr>`).join('') + '</table>';
}

/**
 * 組織關係表。已簡化成「面向／主要對象／主要負責事項」三欄。
 * 舊資料若還有 support / decision / escalation，合併進「主要負責事項」不遺失。
 */
function relationsTable(rows) {
  if (!rows || !rows.length) return `<p class="tbc">待確認</p>`;
  const merged = (r) => [r.primary, r.support, r.decision, r.escalation]
    .filter(x => x && String(x).trim()).join('；');
  return '<table><thead><tr><th style="width:90px">關係面向</th><th style="width:180px">主要對象</th><th>主要負責事項</th></tr></thead>' +
    rows.map(r => `<tr><td>${esc(r.aspect)}</td><td>${r.target ? esc(r.target) : TBC}</td><td>${merged(r) ? esc(merged(r)) : TBC}</td></tr>`).join('') + '</table>';
}

/**
 * 人才成熟度五級錨點（含「為什麼需要」）。
 * 與 anchorTable 同樣的紙寬問題，所以同樣改成一維度一張卡；
 * 差別只在標題列多一條「為什麼需要」，那是這張表存在的理由，不能省。
 */
function maturityTable(anchors) {
  if (!anchors || !anchors.length) return `<p class="tbc">待確認</p>`;
  const LV = ['L1', 'L2', 'L3', 'L4', 'L5'];
  const mark = (a, L) => {
    const tags = [];
    if (a.minimum_level === L) tags.push('✓最低');
    if (a.ideal_level === L) tags.push('✓理想');
    return tags.length ? `<div class="lvmark">${tags.join('　')}</div>` : '';
  };
  return anchors.map(a => `<div class="acard"><table>
    <thead><tr><th colspan="2" class="ach">${esc(a.competency)}</th></tr></thead>
    <tr><th style="width:74px">為什麼需要</th><td>${a.why ? esc(a.why) : TBC}</td></tr>
    ${LV.map(L => `<tr><th style="width:74px">${L}${mark(a, L)}</th><td>${esc(a[L])}</td></tr>`).join('')}
  </table></div>`).join('')
    + '<p class="note">✓ 標示該維度的最低可接受與理想適任等級。</p>';
}

function riskTable(rows) {
  if (!rows || !rows.length) return `<p class="tbc">待確認</p>`;
  return '<table><thead><tr><th>職能名稱</th><th>可能出現的風險</th><th>需要透過面試核對的事項</th><th>可接受或可調整的條件</th></tr></thead>' +
    rows.map(r => `<tr><td>${esc(r.competency)}</td><td>${esc(r.risk)}</td><td>${esc(r.check)}</td><td>${esc(r.acceptable)}</td></tr>`).join('') + '</table>';
}

function gapTable(rows) {
  if (!rows || !rows.length) return `<p class="tbc">待確認</p>`;
  return '<table><thead><tr><th>職能名稱</th><th>到職時可接受的缺口</th><th>預計補足的程度與期間</th><th>組織提供的訓練或支持</th></tr></thead>' +
    rows.map(r => `<tr><td>${esc(r.competency)}</td><td>${esc(r.gap)}</td><td>${esc(r.period)}</td><td>${esc(r.support)}</td></tr>`).join('') + '</table>';
}

// M2 解法決策表：勾選的方案 ＋ 原因跟後續行動
function strategyTable(c, label, optionsId) {
  const picked = fieldVal(c, optionsId) || [];
  const notes = fieldVal(c, optionsId + '_notes') || {};
  if (!picked.length) return `<p><b>${label}</b>：<span class="tbc">未採用任何方案</span></p>`;
  const cell = (v, key) => {
    const t = typeof v === 'string' ? (key === 'reason' ? v : '') : (v?.[key] || '');
    return String(t).trim() ? esc(t) : TBC;
  };
  return `<p><b>${label}</b></p><table><thead><tr><th style="width:34%">採用的方案</th><th>原因</th><th>後續行動</th></tr></thead>` +
    picked.map(p => `<tr><td>${esc(p)}</td><td>${cell(notes[p], 'reason')}</td><td>${cell(notes[p], 'action')}</td></tr>`).join('') + '</table>';
}

/**
 * M2 整合決策：人力與資源配置表。
 *
 * 這是使用者實際要拿去談預算的一張表，所以照原樣印成表格，
 * 不要壓成一段文字——「1 位正職 + 2 位兼職 + 外包攝影」攤平成句子就沒法對帳了。
 */
function resourcePlanTable(c) {
  const rows = fieldVal(c, 'm2.resource_plan');
  if (!Array.isArray(rows) || !rows.length) return '';
  const cell = (v) => String(v ?? '').trim() ? esc(v) : TBC;
  return '<table><thead><tr><th style="width:24%">合作形式</th><th style="width:12%">人數</th><th>負責範圍</th><th style="width:22%">預估成本</th></tr></thead>'
    + rows.map(r => `<tr><td>${cell(r.form)}</td><td>${cell(r.count)}</td><td>${cell(r.scope)}</td><td>${cell(r.cost)}</td></tr>`).join('')
    + '</table>';
}

/**
 * M1 第二章：問題清單。
 *
 * 七欄在 A4 上本來就吃緊，而 `table-layout:fixed` 沒有 colgroup 時是平均分配，
 * 於是「問題類型」「主／次」這種四到五個字的欄位，跟二十幾個字的問題陳述
 * 拿到一樣寬——短欄留白，長欄被折成四行。給短欄一個合身的寬度，
 * 省下來的都還給敘述欄。
 */
function problemTable(rows) {
  if (!rows || !rows.length) return `<p class="tbc">待確認</p>`;
  return '<table>'
    + '<colgroup><col style="width:20%"><col style="width:9%"><col style="width:8%"><col style="width:15%">'
    + '<col style="width:20%"><col style="width:14%"><col style="width:14%"></colgroup>'
    + '<thead><tr><th>問題陳述</th><th>問題類型</th><th>主／次</th><th>可觀察現象及已知影響</th><th>可能原因</th><th>受影響的下游結果</th><th>已確認／待驗證</th></tr></thead>' +
    rows.map(r => `<tr><td>${esc(r.statement)}</td><td>${r.type ? esc(r.type) : TBC}</td><td>${esc(r.primary)}</td><td>${r.phenomena ? esc(r.phenomena) : TBC}</td><td>${r.causes ? esc(r.causes) : TBC}</td><td>${r.downstream ? esc(r.downstream) : TBC}</td><td>${r.confirmed_vs_hypo ? esc(r.confirmed_vs_hypo) : TBC}</td></tr>`).join('') + '</table>';
}

function confirmTable(roles) {
  return '<table><thead><tr><th style="width:180px">確認角色</th><th>姓名</th><th>確認日期</th></tr></thead>' +
    roles.map(r => `<tr><td>${esc(r)}</td><td class="tbc">待確認</td><td class="tbc">待確認</td></tr>`).join('') + '</table>';
}

// ── 待確認事項（只出現在①引導與思考）────────────────────
export function collectPending(c) {
  const out = [];
  const isPathA = c.path_type === 'full_design';
  // 依路徑決定前置模組：完整職務設計＝問題釐清／需求界定；職務優化＝既有職務盤點
  const upstream = isPathA
    ? [
        ['問題釐清定位', ['m1.trigger_event', 'm1.problem_statements', 'm1.minimum_result', 'm1.investment_status']],
        ['職務需求界定', ['m2.upstream_problem', 'm2.engagement_mix', 'm2.suggested_role_type', 'm2.primary_responsibilities']],
      ]
    : [
        ['既有職務基礎確認', ['existing.role_reason', 'existing.expected_results', 'existing.main_work', 'existing.resources_authority']],
      ];
  const checkList = [
    ...upstream,
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
  return '<table><thead><tr><th>模組</th><th>欄位／議題</th><th>為何待確認</th><th>建議由誰確認</th></tr></thead>' +
    items.map(i => `<tr><td>${esc(i.module)}</td><td>${esc(i.field)}</td><td>${esc(i.reason)}</td><td>${esc(i.by)}</td></tr>`).join('') + '</table>';
}

// ── 文件登記表 ──────────────────────────────────────────
export const DOCUMENTS = [
  { key: 'guide',     name: '引導與思考',       kind: '思考歷程紀錄', external: false, build: buildGuideDoc },
  { key: 'jobdesc',   name: '職務說明書',       kind: '正式輸出 ①',  external: false, build: buildJobDescriptionDoc },
  { key: 'selection', name: '甄選流程設計書',   kind: '正式輸出 ②',  external: false, build: buildSelectionDoc },
  { key: 'jd',        name: '職務招募說明',      kind: '正式輸出 ③',  external: true,  build: buildJdDoc },
];

export function getDocument(key) { return DOCUMENTS.find(d => d.key === key); }

// ── 下載 ────────────────────────────────────────────────
function safeName(s) { return String(s || '').replace(/[\\/:*?"<>|]/g, '_'); }

/**
 * 取得文件內容：人工改過就用人工版，否則用系統組裝的版本。
 * 使用者可以在畫面上直接改四份文件，改完的內容存在案例裡，下載時一併帶走。
 *
 * 人工版一律再過一次 inlineStyles（2026-07-23）
 *   系統組裝版是在 wrap() 裡就把樣式攤平成 inline 的，Word 才看得到大標題等格式。
 *   但人工版是把當時 iframe 的 outerHTML 整份存進 localStorage——瀏覽器渲染時
 *   靠的是 <style> 區塊的 class 選擇器，DOM 上並沒有 inline style，所以存下來的
 *   人工版元素身上是空的。這種人工版在**瀏覽器預覽**看起來正常（class 選擇器有效），
 *   一下載進 **Word 就退回內文樣式**（Word 不吃 class 選擇器）——正是「預覽有大標題、
 *   下載沒有」的來源，尤其是昨天 inlineStyles 修復之前就已經存好的舊人工版。
 *
 *   解法：輸出前替人工版補跑 inlineStyles。它會把 class／標籤對應的樣式攤平成
 *   inline，Word 就認得。已經有 inline 的（修復後存的人工版）也安全——inlineStyles
 *   把系統樣式擺在前、元素原有的 style 擺在後，CSS 後者優先，重跑不改變結果。
 *   使用者的手動文字編輯完全保留，只是替結構標籤補上 inline 樣式。
 */
export function documentHtml(c, key) {
  const doc = getDocument(key);
  if (!doc) return '';
  const override = c.doc_overrides && c.doc_overrides[key];
  return (override && override.html) ? inlineStyles(override.html) : doc.build(c);
}

export function isEdited(c, key) {
  return !!(c.doc_overrides && c.doc_overrides[key] && c.doc_overrides[key].html);
}

export function downloadDocument(c, key) {
  const doc = getDocument(key);
  if (!doc) return null;
  const html = documentHtml(c, key);
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
