/**
 * jd-seed.js — 導覽模式預建示範案例（完整規格版）
 * =====================================================================
 * ① 完整流程：晴光電商 · 資深客服專員 — 五章 14 節全部填好並確認，可直接下載四份文件。
 * ② 權責矛盾：禾原品牌 · 行銷企劃主管 — 停在基礎確認，現場按檢查才跳出矛盾。
 * 內容皆為虛構示範，不含真實個資。每次載入覆蓋成乾淨起點。
 */

const DEMO_ID = 'case_demo_customer';
const CONTRA_ID = 'case_demo_contradiction';
const LS_KEY = 'ormap_jobdesign_cases_v1';
const NOW = '2026-07-19T02:00:00.000Z';

function cf(value, source = 'user_input', task = null) {
  return { value, source_type: source, ai_task: task, confirmed: true, confirmed_by: 'demo', confirmed_at: NOW, version: 1 };
}
const O = (v, t) => cf(v, 'ai_organized', t);   // AI 整理
const I = (v, t) => cf(v, 'ai_inference', t);   // AI 推論

// ── 錨點產生器 ─────────────────────────────────────────
function anchor(name, l1, l2, l3, l4, l5, min, ideal) {
  return { competency: name, definition: '', L1: l1, L2: l2, L3: l3, L4: l4, L5: l5, minimum_level: min, ideal_level: ideal };
}

const knowledgeAnchors = [
  anchor('客訴分級與升級判斷',
    '無法分辨一般抱怨與高風險客訴，常錯過升級時機。',
    '能依既有分級表處理常見客訴，遇邊界情況需請示。',
    '能獨立判斷客訴等級，知道何時該退讓、何時該升級。',
    '能處理分級表未涵蓋的爭議，並回頭修正分級標準。',
    '能建立客訴分級制度與升級規則，並指導團隊。', 'L3', 'L4'),
  anchor('消費者權益與退換貨規範',
    '不清楚基本法規，容易做出無法兌現的承諾。',
    '知道主要規範，實際適用時仍需查核。',
    '能正確援引規範說明給客戶，並守住公司立場。',
    '能在法規與商譽衝突時提出可行方案。',
    '能為團隊建立法規對應話術與判例庫。', 'L3', 'L4'),
];

const toolAnchors = [
  anchor('訂單與客服系統操作',
    '需他人代查資料，操作速度明顯影響通話。',
    '能完成基本查詢，複雜조件需協助。',
    '能獨立完成查詢、註記與工單流轉，紀錄完整。',
    '能運用系統交叉比對釐清爭議，並優化註記規範。',
    '能提出系統改善需求並主導導入。', 'L3', 'L4'),
  anchor('情緒安撫與談判技巧',
    '容易被情緒帶走，或以壓制方式回應。',
    '能照話術安撫，遇到高張力情境會僵住。',
    '能穩住高張力對話，引導回到問題本身。',
    '能在多方衝突中重新框定問題並找出可接受方案。',
    '能示範並訓練他人處理高難度對話。', 'L3', 'L4'),
];

const attitudeAnchors = [
  anchor('資訊準確與不過度承諾',
    '為求結案給出不確定或無法兌現的資訊。',
    '多數情況會查證，趕時間時仍可能便宜行事。',
    '一律先查證再回覆，不確定就明說並約定回覆時間。',
    '能在壓力下守住準確性，並主動修正先前錯誤資訊。',
    '能建立查證規範與話術，讓團隊不需靠個人自律。', 'L3', 'L4'),
  anchor('客戶個資保護',
    '對個資範圍認知模糊，可能在通話中不當揭露。',
    '知道規定，實際操作偶有疏漏。',
    '能穩定執行身分驗證與最小揭露原則。',
    '能辨識社交工程手法並適當拒絕。',
    '能建立個資保護流程並落實稽核。', 'L4', 'L5'),
];

const maturityAnchors = [
  { competency: '自主性與學習驅動', why: '客訴型態隨檔期與新品變動，需自行更新知識並調整處理方式。',
    L1: '需要明確指令與持續提醒才會行動。', L2: '能完成熟悉的客訴，遇新型態會等待指示。',
    L3: '能主動整理新型態客訴的處理方式，並補齊自己缺的產品知識。',
    L4: '在沒有前例的爭議上，能自行定義處理原則並推進。',
    L5: '能建立讓團隊持續更新知識的機制。', minimum_level: 'L3', ideal_level: 'L4' },
  { competency: '複雜問題解決', why: '進階客訴常牽涉物流、倉儲與金流多方責任，需釐清真正原因。',
    L1: '難以辨識原因，傾向把問題丟回其他部門。', L2: '能處理重複問題，套用舊經驗；失效後停滯。',
    L3: '能收集訂單、物流與對話紀錄，分析主因並提出替代方案。',
    L4: '能處理跨部門責任歸屬不清的爭議並讓執行落地。',
    L5: '能從重複客訴回推流程缺陷，推動制度修正。', minimum_level: 'L3', ideal_level: 'L4' },
  { competency: '團隊協作與影響力', why: '需在沒有職權的情況下推動物流與倉儲配合處理。',
    L1: '只顧自身邊界，不願分享資訊。', L2: '分工清楚時願配合，跨部門較被動。',
    L3: '能清楚表達需求、處理一般分歧並維持推進。',
    L4: '能在無直接職權下整合立場，促成可執行共識。',
    L5: '能建立跨部門長期協作機制。', minimum_level: 'L3', ideal_level: 'L4' },
  { competency: '情緒韌性與不確定性耐受', why: '每日面對高張力客訴與情緒衝擊，需維持判斷品質。',
    L1: '面對批評容易防禦或停擺，明顯影響工作。', L2: '穩定環境可工作，劇烈衝突需較長恢復。',
    L3: '能察覺並調整情緒，在一般壓力下維持判斷與合作。',
    L4: '在高張力與資訊不足時仍能保持判斷，把挫折轉為改善。',
    L5: '能在集體壓力事件中穩定團隊。', minimum_level: 'L3', ideal_level: 'L4' },
  { competency: '商業敏捷與價值交付', why: '補償決策直接影響成本與客戶留存，需權衡而非一律退讓。',
    L1: '只關注結案，說不出對組織的影響。', L2: '以完成交辦為終點，少確認實際成果。',
    L3: '理解留客與成本的關係，能依價值調整補償與處理優先序。',
    L4: '能辨識高價值客戶與低效處理，調整資源配置。',
    L5: '能從客訴資料提出新的服務模式。', minimum_level: 'L3', ideal_level: 'L4' },
];

const workItems = [
  { work: '接聽並處理進階客訴電話與信件', responsibility_type: '主要負責', nature: '核心工作', frequency_share: '45%' },
  { work: '跨部門協調退換貨與補償方案', responsibility_type: '主要負責', nature: '核心工作', frequency_share: '20%' },
  { work: '帶新人並維護服務知識庫', responsibility_type: '共同負責', nature: '支援工作', frequency_share: '20%' },
  { work: '每週彙整客訴趨勢並回報', responsibility_type: '主要負責', nature: '支援工作', frequency_share: '15%' },
];

const orgRelations = [
  { aspect: '對上', target: '客服部主管', primary: '回報客訴趨勢與重大爭議', support: '提供決策所需的個案資料', decision: '500 元以內補償可自行決定', escalation: '超過 500 元補償、媒體或法律風險個案須上報' },
  { aspect: '對下', target: '新進客服專員', primary: '帶教與案例回顧', support: '協助處理其無法獨立完成的客訴', decision: '可決定新人可處理的案件範圍', escalation: '人員適任問題須回報主管' },
  { aspect: '平行', target: '物流、倉儲、金流窗口', primary: '協調退換貨與補償執行', support: '提供客訴事實與佐證', decision: '可決定對客戶的處理方案與時程承諾', escalation: '跨部門責任歸屬爭議須共同討論' },
  { aspect: '對外', target: '消費者、電商平台客服', primary: '代表公司回應與處理爭議', support: '配合平台調查提供資料', decision: '可在授權範圍內承諾處理方式', escalation: '涉及法規申訴須先取得主管與法務意見' },
];

const processSteps = [
  { step: '初步篩選', role: '招募／HR', task: '書面與經歷檢視', focus: '到職底線與動機' },
  { step: '結構化面試', role: '客服部主管＋HR', task: '行為事例訪談', focus: '客訴判斷與情緒韌性' },
  { step: '情境演練', role: '資深客服', task: '高張力客訴模擬', focus: '處理品質與話術穩定度' },
  { step: '最終確認', role: '客服部主管', task: '綜合評估與等級核對', focus: '最低可接受等級核對' },
];

const allAnchors = [...knowledgeAnchors, ...toolAnchors, ...attitudeAnchors];
const interviewQuestions = allAnchors.flatMap(a => ([
  { stage: '結構化面試', competency: a.competency, qtype: '過去經驗',
    question: `請描述一次你實際處理「${a.competency}」的經驗，當時的情況、你的做法與結果。`,
    followup: '當時有哪些資訊不足或限制？你如何判斷要自己處理還是求助？',
    evidence: '能否獨立完成、面對例外情境的處理層級與求助時機。', level: a.minimum_level },
]));

// M3 各節口述原文（示範用）
const rawInputs = {
  'm3._raw_1_1': '最重要的是穩住難搞的客訴、不讓客戶跑掉。要降低客戶流失。要縮短新人上手時間。要把處理過的案例整理成知識，讓整個團隊變強。',
  'm3._raw_1_2': '每天接進階客訴電話和信件，大概占四成五。跟物流、倉儲協調退換貨與補償，大概兩成。每週帶新人、維護知識庫，跟人一起做，大概兩成。每週彙整客訴趨勢回報，大概一成五。',
  'm3._raw_1_3': '對主管要回報客訴趨勢跟重大爭議，500 元以內的補償我可以自己決定，超過要上報。對下要帶新人、做案例回顧。跟物流倉儲金流是平行協調，我可以決定給客戶的方案跟時程。對外面對消費者跟平台客服，涉及法規申訴要先問主管跟法務。',
  'm3._raw_2_1': '到職前一定要會基本的情緒安撫跟談判，不然接不了進階客訴。消費者權益跟退換貨規範是必備的。產品細節可以到職後教。我們自己的補償權限跟話術是內部才有的，要交接。',
  'm3._raw_2_2': '判斷什麼時候該退讓、什麼時候要往上報是核心。做決定前要先看訂單紀錄、物流狀態跟客戶過去的往來。最容易出錯的是為了結案亂承諾。涉及法規申訴或媒體風險一定要停下來上報。',
  'm3._raw_2_3': '新手常常分不出一般抱怨跟高風險客訴，錯過升級時機。成熟的人可以自己判斷客訴等級、知道何時退讓何時升級。高階的人能處理分級表沒寫到的爭議，還會回頭修正標準。',
  'm3._raw_3_1': '訂單系統跟客服系統一定要熟，到職前要會。用過其他電商客服系統的可以替代。內部的知識庫工具到職後再學就好。',
  'm3._raw_3_2': '要會客訴分級跟升級流程。跨部門協調退換貨有固定做法。系統當機或查不到資料的時候，要知道怎麼先安撫並給替代方案。',
  'm3._raw_3_3': '新手查資料要人幫，速度會影響通話。成熟的人可以獨立完成查詢、註記跟工單流轉，紀錄完整。高階的人會提系統改善需求。',
  'm3._raw_4_1': '品質上回覆資訊一定要準確，不能給錯。發現自己講錯要主動回頭修正。時間跟準確衝突時，寧可先說要查再回覆。',
  'm3._raw_4_2': '不能為了結案亂承諾做不到的事。客戶個資一定要保護，要先驗證身分。沒規定到的灰色地帶，原則是以不傷害客戶跟不欺騙為準。遇到有人要求繞過驗證，不能自己處理，要通報。',
  'm3._raw_4_3': '不成熟的人為了結案會亂給資訊。成熟的人一律先查證再回覆，不確定就明說。高階的人在壓力下還守得住，還會建立規範讓大家不用靠自律。',
  'm3._raw_5_1': '客訴型態會隨檔期跟新品變動，要自己更新知識、調整處理方式。',
  'm3._raw_5_2': '進階客訴常常牽涉物流、倉儲、金流多方責任，要能釐清真正原因。',
  'm3._raw_5_3': '要在沒有職權的情況下推動物流跟倉儲配合處理。',
  'm3._raw_5_4': '每天面對高張力客訴跟情緒衝擊，要維持判斷品質。',
  'm3._raw_5_5': '補償決策直接影響成本跟客戶留存，要能權衡而不是一律退讓。',
};

// 每節的 AI 狀態（讓確認卡與推論／缺口提示能顯示）
const sectionStates = {
  '1.1': { inferences: [], gaps: [], warnings: ['角色存在理由屬人工確認項，請確認整理是否忠實，且未把所有組織問題塞入同一個角色。'] },
  '1.2': { inferences: [{ field: 'm3.work_items', note: '「責任區分／工作性質」為 AI 初步推論，請逐項確認。「負責」代表要對結果承擔主要責任，「協助」不得寫成主要責任。' }], gaps: [], warnings: [] },
  '1.3': { inferences: [{ field: 'm3.organization_relations', note: '關係面向的歸類為 AI 推論，請逐列確認並補齊主要對象。' }], gaps: [], warnings: ['若出現「需要負責，但沒有相應資訊或授權」，屬待確認的組織設計問題，不可直接轉成人才條件。'] },
  '2.1': { inferences: [{ field: 'm3.prehire_knowledge', note: '「到職前必備 vs. 可培訓」為推論。可培訓內容不應被誤設為招募門檻，請確認。' }], gaps: [], warnings: [] },
  '2.2': { inferences: [], gaps: [], warnings: ['重要工作原則避免只寫「憑經驗」或「看情況」。'] },
  '2.3': { inferences: [{ field: 'm3.knowledge_anchors', note: 'L1–L5 為依口述推論的連續行為，最低／理想等級一律由人工確認。' }], gaps: [], warnings: ['不以年資、學歷、職稱或術語量判定等級。'] },
  '3.1': { inferences: [{ field: 'm3.required_tools', note: '除非確實無法以其他工具經驗替代，不得把單一品牌工具寫成硬性要求。' }], gaps: [], warnings: [] },
  '3.2': { inferences: [], gaps: [], warnings: [] },
  '3.3': { inferences: [{ field: 'm3.tool_anchors', note: 'L1–L5 為推論，最低／理想等級由人工確認。' }], gaps: [], warnings: [] },
  '4.1': { inferences: [], gaps: [], warnings: ['避免只寫「細心、負責、有責任感」，必須轉成實際情境與行為。'] },
  '4.2': { inferences: [], gaps: [], warnings: ['請確認已區分「真正的法律或倫理底線」與「主管個人偏好」。'] },
  '4.3': { inferences: [{ field: 'm3.attitude_anchors', note: 'L1–L5 為推論，最低／理想等級由人工確認。' }], gaps: [], warnings: [] },
  '5.6': { inferences: [{ field: 'm3.maturity_anchors', note: '成熟度錨點由泛用定義改寫，最低／理想等級與理由一律由人工確認。' }], gaps: [], warnings: ['不因職稱高或薪資高就把所有維度設為 L5。'] },
};

export function buildDemoCase() {
  const fields = {
    'case.title': cf('客服團隊資深專員優化（示範）'),
    'case.organization_name': cf('晴光電商（示範）'),
    'case.job_title_working': cf('資深客服專員'),
    'case.optimization_goals': cf(['聚焦職能標準', '重寫面試流程', '更新 JD 對外文案']),

    'existing.role_reason': cf('處理進階客訴與跨部門協調，穩住高風險客戶關係，並把處理經驗沉澱為團隊可用的服務知識。'),
    'existing.expected_results': cf(['進階客訴解決率提升', '客戶流失下降', '新進客服上手時間縮短', '服務知識庫持續更新']),
    'existing.main_work': cf(['接聽並處理進階客訴', '跨部門協調退換貨', '帶新人與整理知識庫', '每週回報客訴趨勢']),
    'existing.current_issues': cf(['進階客訴集中在少數資深人身上', '知識沒有沉澱、新人重複踩雷']),
    'existing.changed_expectations': cf('公司希望這個角色從「救火」轉為「建立可複製的處理標準」。'),
    'existing.resources_authority': cf('可調閱訂單系統，能自行決定 500 元內補償，超過需客服部主管核可。'),

    // 第一章
    'm3.role_positioning': O('穩住高風險客訴關係，並將處理經驗轉化為團隊可複製的服務標準。（承接既有職務存在理由）', 'M3-01'),
    'm3.value_outputs': O(['降低客戶流失', '縮短新人上手時間', '沉澱可複製的服務知識'], 'M3-01'),
    'm3.work_items': O(workItems, 'M3-02'),
    'm3.organization_relations': O(orgRelations, 'M3-03'),
    // 第二章
    'm3.prehire_knowledge': O(['情緒安撫與談判基本能力', '消費者權益與退換貨規範'], 'M3-04'),
    'm3.trainable_knowledge': O(['產品細節與檔期規則'], 'M3-04'),
    'm3.organization_specific_knowledge': O(['內部補償權限與話術', '歷史客訴判例'], 'M3-04'),
    'm3.core_judgments': O(['判斷何時退讓、何時升級', '決定補償額度與風險'], 'M3-05'),
    'm3.work_principles': O(['決定前先看訂單紀錄、物流狀態與客戶往來歷史'], 'M3-05'),
    'm3.high_risk_escalations': O(['涉及法規申訴或媒體風險須停止並上報'], 'M3-05'),
    'm3.knowledge_anchors': I(knowledgeAnchors, 'M3-08'),
    // 第三章
    'm3.required_tools': O(['訂單系統操作', '客服工單系統操作'], 'M3-06'),
    'm3.alternative_tools': O(['其他電商客服系統經驗可替代'], 'M3-06'),
    'm3.trainable_tools': O(['內部知識庫工具'], 'M3-06'),
    'm3.professional_methods': O(['客訴分級與升級流程'], 'M3-06'),
    'm3.work_methods': O(['跨部門退換貨協調的固定作法'], 'M3-06'),
    'm3.exception_methods': O(['系統當機或查無資料時，先安撫並提供替代方案與回覆時限'], 'M3-06'),
    'm3.tool_anchors': I(toolAnchors, 'M3-08'),
    // 第四章
    'm3.quality_requirements': O(['回覆資訊必須準確，不得給錯'], 'M3-07'),
    'm3.error_responsibility': O(['發現自己講錯要主動回頭修正並告知客戶'], 'M3-07'),
    'm3.tradeoff_principles': O(['時間與準確衝突時，寧可先說要查再回覆'], 'M3-07'),
    'm3.ethics_nonnegotiables': O(['不得為結案做無法兌現的承諾', '客戶個資須先驗證身分才揭露'], 'M3-07'),
    'm3.gray_area_principles': O(['規定未涵蓋時，以不傷害客戶與不欺騙為判斷原則'], 'M3-07'),
    'm3.escalation_required': O(['有人要求繞過身分驗證時，不得自行處理，須通報'], 'M3-07'),
    'm3.attitude_anchors': I(attitudeAnchors, 'M3-08'),
    // 第五章
    'm3.maturity_anchors': I(maturityAnchors, 'M3-09'),

    // M4 職務基本資料
    'm4.job_basic_info': cf({
      job_title: '資深客服專員', department: '客服部', report_to: '客服部主管',
      is_manager: '否', manage_count: '', location: '台北總部',
      work_mode: '混合', employment: '全職', work_hours: '週一至週五 09:00–18:00', salary_range: '面議',
    }),
    'm4.role_positioning': O('穩住高風險客訴關係，並將處理經驗轉化為團隊可複製的服務標準。', 'M4-01'),

    // M5
    'm5.candidate_process_info': cf({
      duration: '約 2 週，共 4 個階段', format: '初篩線上、結構化面試與情境演練為實體',
      prep: '請準備一則實際處理過的客訴經驗（可匿名）。', stage_time: '每階段約 45–60 分鐘',
      notify: '每階段結束後一週內以 Email 通知',
    }),
    'm5.process_steps': I(processSteps, 'M5-01'),
    'm5.interview_questions': I(interviewQuestions, 'M5-02'),
    'm5.overperformance_risks': I([{ competency: '情緒安撫與談判技巧', risk: '能力遠高於職務需求時，可能對重複性客訴失去耐性或提早離職。', check: '面試時確認其對日常重複工作的預期與動機。', acceptable: '若有明確的知識沉澱與帶人意願，可接受。' }], 'M5-03'),
    'm5.training_gaps': I([{ competency: '消費者權益與退換貨規範', gap: '可接受到職時僅具備基本認知。', period: '到職 1 個月內達 L3。', support: '提供法規教育訓練與判例庫，並由主管每週回顧。' }], 'M5-03'),

    // M6
    'm6.job_title': O('資深客服專員', 'M6-01'),
    'm6.role_positioning': O('穩住高風險客訴關係，並把處理經驗變成團隊可複製的服務標準。', 'M6-01'),
    'm6.work_items': O(workItems.map(w => `【${w.responsibility_type}｜${w.nature}｜${w.frequency_share}】${w.work}`), 'M6-01'),
    'm6.minimum_competencies': O([
      '具備「客訴分級與升級判斷」，能獨立判斷客訴等級，知道何時該退讓、何時該升級',
      '具備「訂單與客服系統操作」，能獨立完成查詢、註記與工單流轉',
      '具備「資訊準確與不過度承諾」，一律先查證再回覆',
    ], 'M6-01'),
    'm6.work_traits': O([
      '能主動整理新型態客訴的處理方式，並補齊自己缺的產品知識',
      '能收集訂單、物流與對話紀錄，分析主因並提出替代方案',
      '能清楚表達需求、處理一般分歧並維持推進',
      '能察覺並調整情緒，在一般壓力下維持判斷與合作',
    ], 'M6-01'),
    'm6.interview_process': O([
      '整體流程：約 2 週，共 4 個階段',
      '第一階段｜初步篩選：由招募／HR 進行，主要會書面與經歷檢視。',
      '第二階段｜結構化面試：由客服部主管＋HR 進行，主要會行為事例訪談。',
      '第三階段｜情境演練：由資深客服進行，主要會高張力客訴模擬。',
      '第四階段｜最終確認：由客服部主管進行，主要會綜合評估與等級核對。',
      '事前準備：請準備一則實際處理過的客訴經驗（可匿名）。',
      '結果通知：每階段結束後一週內以 Email 通知',
    ], 'M6-01'),
    'm6.publish_confirmation': cf({ confirmed: true, at: NOW }),
  };
  Object.entries(rawInputs).forEach(([k, v]) => { fields[k] = cf(v); });

  return {
    case_id: DEMO_ID, owner: 'demo-student', path_type: 'existing_role_focus',
    is_demo: true, doc_version: 1, fields,
    modules: {
      existing: { status: 'confirmed', structured_values: {}, updated_at: NOW },
      m3: { status: 'confirmed', structured_values: {}, updated_at: NOW, sections: sectionStates },
      m4: { status: 'confirmed', structured_values: {}, updated_at: NOW },
      m5: { status: 'confirmed', structured_values: {}, updated_at: NOW },
      m6: { status: 'confirmed', structured_values: {}, updated_at: NOW },
    },
    access: { opens_at: NOW, submission_due_at: null, first_final_download_at: null, scheduled_close_at: null, closed_at: null, reopened_until: null, reopen_reason: null },
    exports: [], discussion_items: [], audit_events: [],
    ai_jobs: [{ ai_job_id: 'aijob_demo', task_code: 'DEMO', prompt_version: '1.0.0', provider: 'mock', model: 'mock-1', input_tokens: 0, output_tokens: 0, estimated_cost: 0, completed_at: NOW }],
    overall_status: 'output_ready', current_module: 'existing',
    created_at: NOW, updated_at: NOW,
  };
}

// ── 示範② 權責矛盾 ──────────────────────────────────────
export function buildContradictionCase() {
  return {
    case_id: CONTRA_ID, owner: 'demo-student', path_type: 'existing_role_focus',
    is_demo: true, demo_kind: 'contradiction', doc_version: 1,
    fields: {
      'case.title': cf('行銷企劃主管增聘評估（示範·權責矛盾）'),
      'case.organization_name': cf('禾原品牌（示範）'),
      'case.job_title_working': cf('行銷企劃主管'),
      'case.optimization_goals': cf(['釐清權責邊界', '聚焦職能標準']),
      'existing.role_reason': cf('希望有人統籌跨部門行銷專案，讓活動如期上線並對成效負責。'),
      'existing.expected_results': cf(['季度行銷專案準時上線', '各通路成效可被追蹤', '跨部門溝通成本下降']),
      'existing.main_work': cf(['規劃季度行銷專案', '協調設計、業務、通路配合', '追蹤成效並回報總經理']),
      'existing.current_issues': cf([
        '跨部門專案常常延宕，這個角色要扛最終成敗',
        '被要求負責專案成效，卻無法調度其他部門的人力',
        '前一任在半年內離職',
      ]),
      'existing.changed_expectations': cf('總經理希望這個角色未來能直接對營收數字負責。'),
      'existing.resources_authority': cf('沒有預算決定權，也不能決定其他部門的人力配置，重要事情都要等總經理裁示。'),
    },
    modules: { existing: { status: 'drafting', structured_values: {}, sections: {}, updated_at: NOW } },
    access: { opens_at: NOW, submission_due_at: null, first_final_download_at: null, scheduled_close_at: null, closed_at: null, reopened_until: null, reopen_reason: null },
    exports: [], ai_jobs: [], discussion_items: [], audit_events: [],
    overall_status: 'active', current_module: 'existing',
    created_at: NOW, updated_at: NOW,
  };
}

function put(id, obj) {
  let all;
  try { all = JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { all = {}; }
  all[id] = obj;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  return id;
}

export function seedDemoCase() { return put(DEMO_ID, buildDemoCase()); }
export function seedContradictionCase() { return put(CONTRA_ID, buildContradictionCase()); }

export const DEMO_CASE_ID = DEMO_ID;
export const CONTRA_CASE_ID = CONTRA_ID;
