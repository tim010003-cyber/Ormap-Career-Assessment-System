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
  .lvmark{margin-top:3pt;font-size:9pt;font-weight:700;color:#136E68;}
  .trait{font-size:8.5pt;color:#a4551f;background:#FDF3EA;border:1px solid #E88A55;padding:0 4pt;border-radius:3px;}
</style>`;

/** 四份文件共用的封面 */
function coverPage(c, opts) {
  const pathLabel = c.path_type === 'full_design' ? '完整職務設計' : '職務優化';
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
  <h3>人力與工作環境盤點摘要</h3>${list('m2.environment_checks')}
  <table>
    <tr><th style="width:170px">目前最需要先處理的狀況</th><td>${val(F('m2.priority_condition'))}</td></tr>
    <tr><th>目前最不確定的地方</th><td>${val(F('m2.uncertain_points'))}</td></tr>
  </table>
  <h3>四類策略比較及採用組合</h3>
  <table>
    <tr><th style="width:170px">工作、流程、工具與制度</th><td>${list('m2.process_strategies')}</td></tr>
    <tr><th>既有人員配置與管理</th><td>${list('m2.people_management_strategies')}</td></tr>
    <tr><th>外部專業與彈性資源</th><td>${list('m2.external_strategies')}</td></tr>
    <tr><th>內部人力與正式編制</th><td>${list('m2.internal_staffing_strategies')}</td></tr>
    <tr><th>預計採用的策略組合</th><td>${val(F('m2.strategy_combination'))}</td></tr>
    <tr><th>增加人才前必須先完成的改善</th><td>${val(F('m2.prerequisite_improvements'))}</td></tr>
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
/**
 * 表格三：各職能的行為定錨等級（BARS）。
 * L1–L5 每一格的內容**就是**該等級的行為特徵，不另立欄位。
 * 最低／理想以 ✓ 標示於對應等級（打勾概念）。
 */
function anchorTable(anchors) {
  if (!anchors || !anchors.length) return `<p class="tbc">待確認</p>`;
  const mark = (a, L) => {
    const tags = [];
    if (a.minimum_level === L) tags.push('✓最低');
    if (a.ideal_level === L) tags.push('✓理想');
    return tags.length ? `<div class="lvmark">${tags.join('　')}</div>` : '';
  };
  return '<table><tr><th>職能名稱</th><th>職能定義</th><th>L1</th><th>L2</th><th>L3</th><th>L4</th><th>L5</th><th>最低可接受等級</th><th>理想適任等級</th></tr>' +
    anchors.map(a => `<tr>
      <td>${esc(a.competency)}${a.isTrait ? '<br><span class="trait">成熟度</span>' : ''}</td>
      <td>${a.definition ? esc(a.definition) : TBC}</td>
      ${['L1', 'L2', 'L3', 'L4', 'L5'].map(L => `<td>${esc(a[L])}${mark(a, L)}</td>`).join('')}
      <td>${a.minimum_level ? esc(a.minimum_level) : TBC}</td>
      <td>${a.ideal_level ? esc(a.ideal_level) : TBC}</td></tr>`).join('') +
    '</table><p class="note">L1–L5 每一格為該等級的可觀察行為特徵（行為錨定等級 BARS）。</p>';
}

/**
 * 職務說明書 6.5：**五個維度全部寫入**（依《4.職務說明書》6.5 範本），
 * 但只寫「需要具備的內容與想法」，**不放等級**——
 * 凡是有等級的一律歸甄選流程設計書的表格三。（PO 釐清 2026-07-21）
 */
function maturitySummary(anchors) {
  const all = anchors || [];
  if (!all.length) return `<p class="tbc">待確認</p>`;
  return '<table><tr><th style="width:180px">人才成熟度維度</th><th>需要具備的內容與想法</th></tr>' +
    all.map(a => `<tr><td>${esc(a.competency)}</td><td>${a.description ? esc(a.description) : (a.why ? esc(a.why) : TBC)}</td></tr>`).join('') +
    '</table><p class="note">各職能與維度的分級標準與最低／理想要求，詳見《甄選流程設計書》表格三。</p>';
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

// M1 第二章：問題清單
function problemTable(rows) {
  if (!rows || !rows.length) return `<p class="tbc">待確認</p>`;
  return '<table><tr><th>問題陳述</th><th>問題類型</th><th>主／次</th><th>可觀察現象及已知影響</th><th>可能原因</th><th>受影響的下游結果</th><th>已確認／待驗證</th></tr>' +
    rows.map(r => `<tr><td>${esc(r.statement)}</td><td>${r.type ? esc(r.type) : TBC}</td><td>${esc(r.primary)}</td><td>${r.phenomena ? esc(r.phenomena) : TBC}</td><td>${r.causes ? esc(r.causes) : TBC}</td><td>${r.downstream ? esc(r.downstream) : TBC}</td><td>${r.confirmed_vs_hypo ? esc(r.confirmed_vs_hypo) : TBC}</td></tr>`).join('') + '</table>';
}

function confirmTable(roles) {
  return '<table><tr><th style="width:180px">確認角色</th><th>姓名</th><th>確認日期</th></tr>' +
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
        ['職務需求界定', ['m2.upstream_problem', 'm2.strategy_combination', 'm2.suggested_role_type', 'm2.primary_responsibilities']],
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
