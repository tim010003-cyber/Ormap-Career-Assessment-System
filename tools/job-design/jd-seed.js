/**
 * jd-seed.js — 導覽模式預建示範案例（完整規格版）
 * =====================================================================
 * ① 完整流程：晴光電商 · 資深客服專員 — 12 節 ＋ 五個成熟度維度全部填好並確認，可直接下載四份文件。
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
function anchor(name, l1, l2, l3, l4, l5, min, ideal, definition) {
  return {
    competency: name, definition: definition || '',
    L1: l1, L2: l2, L3: l3, L4: l4, L5: l5, minimum_level: min, ideal_level: ideal,
  };
}

const knowledgeAnchors = [
  anchor('客訴分級與升級判斷',
    '無法分辨一般抱怨與高風險客訴，常錯過升級時機。',
    '能依既有分級表處理常見客訴，遇邊界情況需請示。',
    '能獨立判斷客訴等級，知道何時該退讓、何時該升級。',
    '能處理分級表未涵蓋的爭議，並回頭修正分級標準。',
    '能建立客訴分級制度與升級規則，並指導團隊。', 'L3', 'L4',
    "判斷客訴的嚴重度與風險等級，決定自行處理、退讓或向上升級。"),
  anchor('消費者權益與退換貨規範',
    '不清楚基本法規，容易做出無法兌現的承諾。',
    '知道主要規範，實際適用時仍需查核。',
    '能正確援引規範說明給客戶，並守住公司立場。',
    '能在法規與商譽衝突時提出可行方案。',
    '能為團隊建立法規對應話術與判例庫。', 'L3', 'L4',
    "理解並正確援引消費者權益與退換貨相關規範。"),
];

const toolAnchors = [
  anchor('訂單與客服系統操作',
    '需他人代查資料，操作速度明顯影響通話。',
    '能完成基本查詢，複雜條件需協助。',
    '能獨立完成查詢、註記與工單流轉，紀錄完整。',
    '能運用系統交叉比對釐清爭議，並優化註記規範。',
    '能提出系統改善需求並主導導入。', 'L3', 'L4',
    "熟練操作訂單與客服工單系統以支援即時判斷。"),
  anchor('情緒安撫與談判技巧',
    '容易被情緒帶走，或以壓制方式回應。',
    '能照話術安撫，遇到高張力情境會僵住。',
    '能穩住高張力對話，引導回到問題本身。',
    '能在多方衝突中重新框定問題並找出可接受方案。',
    '能示範並訓練他人處理高難度對話。', 'L3', 'L4',
    "在高張力對話中安撫情緒並引導回到問題本身。"),
];

const attitudeAnchors = [
  anchor('資訊準確與不過度承諾',
    '為求結案給出不確定或無法兌現的資訊。',
    '多數情況會查證，趕時間時仍可能便宜行事。',
    '一律先查證再回覆，不確定就明說並約定回覆時間。',
    '能在壓力下守住準確性，並主動修正先前錯誤資訊。',
    '能建立查證規範與話術，讓團隊不需靠個人自律。', 'L3', 'L4',
    "確保對客戶提供的資訊準確，不做無法兌現的承諾。"),
  anchor('客戶個資保護',
    '對個資範圍認知模糊，可能在通話中不當揭露。',
    '知道規定，實際操作偶有疏漏。',
    '能穩定執行身分驗證與最小揭露原則。',
    '能辨識社交工程手法並適當拒絕。',
    '能建立個資保護流程並落實稽核。', 'L4', 'L5',
    "依規範驗證身分並以最小必要原則揭露客戶資料。"),
];

// 依 PO 釐清：五個維度全填（職務說明書五個都要寫，不含等級）；
// jd_selected 只決定要不要放進對外 JD（挑三個）。
const maturityAnchors = [
  { competency: '自主性與學習驅動', jd_selected: true,
    description: '客訴型態會隨檔期與新品變動，需要能自己更新產品與規則知識，不必等人交代就調整處理方式。',
    why: '客訴型態隨檔期與新品變動，需自行更新知識並調整處理方式。',
    L1: '需要明確指令與持續提醒才會行動。', L2: '能完成熟悉的客訴，遇新型態會等待指示。',
    L3: '能主動整理新型態客訴的處理方式，並補齊自己缺的產品知識。',
    L4: '在沒有前例的爭議上，能自行定義處理原則並推進。',
    L5: '能建立讓團隊持續更新知識的機制。', minimum_level: 'L3', ideal_level: 'L4' },
  { competency: '複雜問題解決', jd_selected: true,
    description: '進階客訴常牽涉物流、倉儲與金流多方責任，需要能從零碎資訊中釐清真正原因，而不是把問題轉給別的部門。',
    why: '進階客訴常牽涉物流、倉儲與金流多方責任，需釐清真正原因。',
    L1: '難以辨識原因，傾向把問題丟回其他部門。', L2: '能處理重複問題，套用舊經驗；失效後停滯。',
    L3: '能收集訂單、物流與對話紀錄，分析主因並提出替代方案。',
    L4: '能處理跨部門責任歸屬不清的爭議並讓執行落地。',
    L5: '能從重複客訴回推流程缺陷，推動制度修正。', minimum_level: 'L3', ideal_level: 'L4' },
  { competency: '團隊協作與影響力', jd_selected: true,
    description: '這個角色對物流、倉儲沒有指揮權，卻要讓他們配合處理客訴，需要靠說明與協調把事情推動。',
    why: '需在沒有職權的情況下推動物流與倉儲配合處理。',
    L1: '只顧自身邊界，不願分享資訊。', L2: '分工清楚時願配合，跨部門較被動。',
    L3: '能清楚表達需求、處理一般分歧並維持推進。',
    L4: '能在無直接職權下整合立場，促成可執行共識。',
    L5: '能建立跨部門長期協作機制。', minimum_level: 'L3', ideal_level: 'L4' },
  { competency: '情緒韌性與不確定性耐受', jd_selected: false,
    description: "每天面對高張力客訴與情緒衝擊，需要能察覺並調整自己的情緒，在壓力下維持判斷品質與合作，不把情緒帶進下一通電話。",
    why: '每日面對高張力客訴與情緒衝擊，需維持判斷品質。',
    L1: '面對批評容易防禦或停擺，明顯影響工作。', L2: '穩定環境可工作，劇烈衝突需較長恢復。',
    L3: '能察覺並調整情緒，在一般壓力下維持判斷與合作。',
    L4: '在高張力與資訊不足時仍能保持判斷，把挫折轉為改善。',
    L5: '能在集體壓力事件中穩定團隊。', minimum_level: 'L3', ideal_level: 'L4' },
  { competency: '商業敏捷與價值交付', jd_selected: false,
    description: "補償決策直接影響成本與客戶留存，需要理解留客價值與成本的關係，能依情況權衡，而不是一律退讓或一律拒絕。",
    why: '補償決策直接影響成本與客戶留存，需權衡而非一律退讓。',
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
    // 1.1 / 1.2 產出至甄選流程設計書的內容（doc 3 各節下游對應）
    'm3.sel_value_evidence': O(['候選人是否做出過「降低客戶流失」這類成果', '是否有沉澱知識、讓團隊變強的經驗'], 'M3-01'),
    'm3.sel_value_understanding': O(['候選人能否說出這個角色為什麼存在，以及為何要把經驗沉澱成標準'], 'M3-01'),
    'm3.sel_outcome_criteria': O(['以客戶是否留下、新人是否更快上手來判斷，而非處理了幾件客訴'], 'M3-01'),
    'm3.sel_key_experience': O(['是否實際處理過進階客訴', '是否跨部門協調過退換貨與補償'], 'M3-02'),
    'm3.sel_work_sample': O(['以一則高張力客訴設計情境演練', '請候選人試寫一則知識庫案例'], 'M3-02'),
    'm3.sel_stage_scope': O([
      '初步篩選：確認是否具備進階客訴處理的基本經驗',
      '結構化面試：了解客訴判斷與跨部門協調的實際做法',
      '情境演練：驗證處理品質與話術穩定度',
    ], 'M3-02'),
    // 第二章
    'm3.prehire_knowledge': O(['情緒安撫與談判基本能力', '消費者權益與退換貨規範'], 'M3-04'),
    'm3.alternative_knowledge': O(['其他零售或電商客服的進階客訴經驗可替代', '有客訴分級概念者可較快上手'], 'M3-04'),
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
      duration: '約 2 週', format: '初篩線上、結構化面試與情境演練為實體',
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
    // 套《6.JD對外文案》句型（你具備／你能使用／面對…你能…）
    'm6.minimum_competencies': O([
      '面對客訴分級與升級判斷的情況時，你能獨立判斷客訴等級，知道何時該退讓、何時該升級',
      '你具備消費者權益與退換貨規範相關知識，能夠正確援引規範說明給客戶，並守住公司立場',
      '你能使用訂單與客服系統操作，獨立完成查詢、註記與工單流轉，紀錄完整',
      '你能維持資訊準確與不過度承諾的標準，一律先查證再回覆，不確定就明說並約定回覆時間',
    ], 'M6-01'),
    // 只挑三個維度對外
    'm6.work_traits': O([
      '面對變動或沒有前例的情況，你能主動整理新型態客訴的處理方式，補齊自己缺的產品知識',
      '遇到原因不明或牽涉多方的問題時，你會收集訂單、物流與對話紀錄，分析主因並提出替代方案',
      '與其他部門合作時，你能清楚表達需求、處理一般分歧並維持推進',
    ], 'M6-01'),
    'm6.interview_process': O([
      '整體流程：預計包含 4 個階段，整體約於約 2 週內完成。',
      '第一階段｜初步篩選：由招募／HR 進行，主要會書面與經歷檢視；預計需要每階段約 45–60 分鐘。',
      '第二階段｜結構化面試：由客服部主管＋HR 進行，主要會行為事例訪談；預計需要每階段約 45–60 分鐘。',
      '第三階段｜情境演練：由資深客服進行，主要會高張力客訴模擬；預計需要每階段約 45–60 分鐘。',
      '第四階段｜最終確認：由客服部主管進行，主要會綜合評估與等級核對；預計需要每階段約 45–60 分鐘。',
      '事前準備：請準備一則實際處理過的客訴經驗（可匿名）。',
      '結果通知：預計於每階段結束後一週內以 Email 通知。',
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

// ═════════════════════════════════════════════════════════
// 示範案例 ③ 完整職務設計（青田文化 · 內容專案企劃）
// M1 問題釐清 → M2 需求界定 → M3 規格 → M4/M5/M6，全部填好並確認，
// 可從第一章一路走到下載四份文件。導覽時仍可現場按「重新整理本章」。
// ═════════════════════════════════════════════════════════
const PATHA_ID = 'case_demo_patha';

// ── 內容專案企劃：五級錨點 ──
const pa_knowledgeAnchors = [
  anchor('需求定案與變更控管',
    '分不出需求是否已定案，容易讓變更一路往下游走。',
    '知道要控管變更，實際遇到臨時需求仍難擋。',
    '能判斷需求是否可定案，並依流程處理後續變更。',
    '能在客戶臨時變更與交付風險間找出可行方案。',
    '能建立需求定案與變更控管機制，讓團隊不必逐案救火。', 'L3', 'L4',
    '判斷需求是否已具備定案條件，並控管後續變更對交付的影響。'),
  anchor('內容製程與品質標準',
    '不熟內容從企劃到上架的各階段與卡點。',
    '了解主要階段，遇到跨階段問題需請示。',
    '能掌握全流程，預判卡點並安排緩衝。',
    '能重整製程、縮短交付週期並維持品質。',
    '能建立可複製的製程與品質標準。', 'L3', 'L4',
    '掌握內容從企劃、編輯、設計到上架的製程與品質要求。'),
];
const pa_toolAnchors = [
  anchor('專案管理與排程工具',
    '需他人協助才能維護排程，資訊常過期。',
    '能維護基本排程，複雜相依需協助。',
    '能獨立維護跨專案排程與相依關係，資訊即時。',
    '能用工具建立可視化的進度與風險預警。',
    '能導入並優化團隊的專案管理制度。', 'L3', 'L4',
    '熟練使用專案管理與排程工具支援跨專案協調。'),
  anchor('內容協作與版本管理平台',
    '不熟平台，檔案與版本容易混亂。',
    '能完成基本協作，版本規則需提醒。',
    '能獨立維護協作規範與版本，交接清楚。',
    '能設計協作與權限規範，降低溝通成本。',
    '能建立平台使用標準並推動落實。', 'L3', 'L4',
    '運用內容協作平台維持版本與交接的清晰。'),
];
const pa_attitudeAnchors = [
  anchor('跨部門溝通與衝突處理',
    '面對分歧容易迴避或各做各的。',
    '分工清楚時能配合，衝突時較被動。',
    '能主動協調分歧，讓不同角色回到共同目標。',
    '能在無直接職權下促成可執行共識。',
    '能建立長期協作默契與衝突處理機制。', 'L3', 'L4',
    '在沒有直接職權下協調企劃、編輯、設計與業務的分歧。'),
  anchor('交付承諾與風險預警',
    '對交付風險後知後覺，常到最後才爆。',
    '能回報明顯風險，隱性風險較難察覺。',
    '能提前辨識風險並主動預警與調整。',
    '能在多專案間權衡並守住關鍵交付。',
    '能建立風險預警機制，讓延誤可被提早處理。', 'L3', 'L4',
    '主動辨識交付風險並在影響擴大前預警與處理。'),
];
const pa_maturity = [
  { competency: '自主性與學習驅動', jd_selected: false,
    description: '流程與客戶需求常在變，需要能主動調整協調方式，不必等人交代。',
    why: '內容需求與客戶檔期多變，需自行調整協調做法。',
    L1: '需要明確指令與持續提醒才會行動。', L2: '能完成熟悉工作，遇例外會等待指示。',
    L3: '能主動改善協調方式，並為需要進行有計畫的學習。',
    L4: '在沒有前例時能自行定義做法並推進。', L5: '能建立促進團隊自主的協作文化。',
    minimum_level: 'L3', ideal_level: 'L4' },
  { competency: '複雜問題解決', jd_selected: true,
    description: '交付延誤常同時牽涉需求、產能與跨部門協調，需要能釐清真正卡點，而不是只補人。',
    why: '延誤是多重成因交織，需釐清主因而非頭痛醫頭。',
    L1: '難以辨識原因，傾向把問題丟回他人。', L2: '能處理重複問題，套用舊經驗。',
    L3: '能收集各階段資訊、分析主因並提出替代方案。',
    L4: '能處理跨部門責任不清的問題並讓執行落地。', L5: '能從重複延誤回推制度缺陷並推動修正。',
    minimum_level: 'L3', ideal_level: 'L4' },
  { competency: '團隊協作與影響力', jd_selected: true,
    description: '這個角色對編輯與設計沒有直屬職權，卻要推動他們配合排程與需求控管。',
    why: '需在無直接職權下整合企劃、編輯、設計與業務。',
    L1: '只顧自身邊界，不願分享資訊。', L2: '分工清楚時願配合，跨部門較被動。',
    L3: '能清楚表達需求、處理一般分歧並維持推進。',
    L4: '能在無直接職權下整合立場，促成共識。', L5: '能建立跨部門長期協作機制。',
    minimum_level: 'L4', ideal_level: 'L5' },
  { competency: '情緒韌性與不確定性耐受', jd_selected: false,
    description: '面對客戶臨時變更與多方壓力，需要能穩住情緒維持判斷。',
    why: '臨時變更與交付壓力大，需維持判斷品質。',
    L1: '面對變動容易防禦或停擺。', L2: '穩定環境可工作，劇烈變動需較長適應。',
    L3: '能察覺並調整情緒，在壓力下維持工作與合作。',
    L4: '在高壓與資訊不足時仍能保持判斷。', L5: '能在危機中穩定團隊。',
    minimum_level: 'L3', ideal_level: 'L4' },
  { competency: '商業敏捷與價值交付', jd_selected: true,
    description: '排程與取捨要以客戶續約與交付價值為準，而不是只求把事情做完。',
    why: '交付直接影響客戶續約，需以價值權衡優先序。',
    L1: '只關注完成形式，說不出對客戶的價值。', L2: '以完成交辦為終點。',
    L3: '理解交付與續約的關係，能依價值調整優先序。',
    L4: '能辨識高價值專案、停止低效工作。', L5: '能提出新的內容交付模式。',
    minimum_level: 'L3', ideal_level: 'L4' },
];

const pa_workItems = [
  { work: '統籌內容專案排程與跨階段協調', responsibility_type: '主要負責', nature: '核心工作', frequency_share: '40%' },
  { work: '把關需求定案與變更控管', responsibility_type: '主要負責', nature: '核心工作', frequency_share: '25%' },
  { work: '追蹤交付進度並預警風險', responsibility_type: '主要負責', nature: '核心工作', frequency_share: '20%' },
  { work: '彙整專案回顧與流程改善', responsibility_type: '共同負責', nature: '支援工作', frequency_share: '15%' },
];
const pa_orgRelations = [
  { aspect: '對上', target: '內容主管', primary: '回報專案進度與交付風險', support: '提供決策所需的專案資料', decision: '可自行決定排程與資源調度', escalation: '重大延誤或需追加資源須上報' },
  { aspect: '對下', target: '編輯、設計（非直屬）', primary: '協調任務分派與優先序', support: '協助排解卡點', decision: '可決定專案任務的優先順序', escalation: '人員產能不足須回報主管' },
  { aspect: '平行', target: '企劃、業務', primary: '需求對接與定案把關', support: '提供交付時程資訊', decision: '可在授權範圍內判定需求是否定案', escalation: '需求爭議或客戶臨時變更須共同討論' },
  { aspect: '對外', target: '客戶（透過業務）', primary: '交付時程與變更影響溝通', support: '配合業務說明進度', decision: '可承諾授權範圍內的時程調整', escalation: '涉及合約範圍變更須先取得主管與業務同意' },
];
const pa_processSteps = [
  { step: '初步篩選', role: '招募／HR', task: '書面與作品檢視', focus: '專案協調經驗與動機' },
  { step: '結構化面試', role: '內容主管＋HR', task: '行為事例訪談', focus: '需求控管與跨部門協調' },
  { step: '情境演練', role: '資深企劃', task: '延誤與臨時變更情境模擬', focus: '判斷與風險預警' },
  { step: '最終確認', role: '內容主管', task: '綜合評估與等級核對', focus: '最低可接受等級核對' },
];
const pa_allAnchors = [...pa_knowledgeAnchors, ...pa_toolAnchors, ...pa_attitudeAnchors];
const pa_interviewQuestions = pa_allAnchors.flatMap(a => ([
  { stage: '結構化面試', competency: a.competency, qtype: '過去經驗',
    question: `請描述一次你實際處理「${a.competency}」的經驗，當時的情況、你的做法與結果。`,
    followup: '當時有哪些資訊不足或限制？你如何判斷要自己處理還是求助？',
    evidence: '能否獨立完成、面對例外情境的處理層級與求助時機。', level: a.minimum_level },
]));

// M1 五章的 AI 狀態（讓確認卡與推論／缺口提示能顯示）
const pa_m1Chapters = {
  '第一章': { inferences: [{ field: 'm1.demand_nature', note: '需求性質為推論，請確認。' }, { field: 'm1.hypotheses_pending', note: '此區為尚待驗證的推論，不可當成已確認事實。' }], gaps: [], warnings: ['偵測到「缺人／要找人」的說法。這只能列為**假設**，不能當成已證實的人力需求，也不能當成問題結論。'] },
  '第二章': { inferences: [{ field: 'm1.problem_statements', note: '問題類型與主／次為 AI 推論，請逐項確認。' }], gaps: [{ field: 'm1.next_bottleneck', message: '「下一個瓶頸」需人工判斷，AI 不補造。' }], warnings: ['不得把時間上先發生的事情直接判定為原因；不得用人格歸因替代問題分析。'] },
  '第三章': { inferences: [{ field: 'm1.inactivity_cost', note: '三至六個月的代價為推論，請確認。' }, { field: 'm1.need_scale', note: '需求尺度為推論，請人工選定。' }], gaps: [], warnings: ['緊急與重要必須分開。'] },
  '第四章': { inferences: [], gaps: [{ field: 'm1.minimum_result', message: '最低可接受結果須由人工決定。' }], warnings: [] },
  '第五章': { inferences: [], gaps: [{ field: 'm1.investment_status', message: '建議狀態須由人工決定（四選一）。' }], warnings: ['成本不只薪資或採購，還有管理、訓練、溝通、工具及轉換成本。'] },
};

export function buildPathACase() {
  const fields = {
    'case.title': cf('內容團隊交付延誤問題釐清（示範·完整職務設計）'),
    'case.organization_name': cf('青田文化（示範）'),
    'case.job_title_working': cf('內容專案企劃'),
    'case.optimization_goals': cf(['釐清權責邊界', '聚焦職能標準']),

    // ── M1 問題釐清定位 ──
    'm1._raw_ch1': cf('最近三個月，內容上架一直延誤，客戶開始抱怨。編輯說稿子卡在設計那邊，設計說需求一直改。我覺得是人不夠，但也可能是流程問題。有排程表可以看到延誤紀錄，客戶的抱怨信也有留存。大家都覺得很忙，不過忙在哪裡沒有人說得清楚。'),
    'm1.trigger_event': O('近三個月內容上架持續延誤，客戶開始抱怨。', 'M1-01'),
    'm1.first_noticed_at': O('近三個月', 'M1-01'),
    'm1.affected_roles': O(['內容主管（提出者）', '編輯', '設計', '長期客戶'], 'M1-01'),
    'm1.demand_nature': I('長期累積問題', 'M1-01'),
    'm1.confirmed_facts': O(['排程表顯示近三個月上架延誤率上升', '有客戶抱怨信留存'], 'M1-01'),
    'm1.supporting_evidence': O(['排程延誤紀錄', '客戶抱怨信'], 'M1-01'),
    'm1.hypotheses_pending': I(['延誤主因可能是需求反覆變更，而非單純人力不足'], 'M1-01'),
    'm1.feelings_claims': O(['大家覺得很忙，但說不清楚忙在哪裡', '主管覺得是人不夠'], 'M1-01'),
    'm1.information_gaps': I(['各製程階段的實際耗時尚無資料'], 'M1-01'),

    'm1._raw_ch2': cf('現在是做不完，還是做事的方法有問題，其實我不確定。如果明天多一個編輯來，稿子還是會卡在設計那關，因為需求一直改這件事沒有解決。需求反覆可能是更上游的問題，因為企劃階段沒有把規格定下來。主要問題應該是需求變更沒有控管，次要問題才是產能。'),
    'm1.problem_statements': O([
      { statement: '內容從企劃到設計，因需求反覆變更而無法如期產出', type: '流程問題', primary: '主要問題', phenomena: '上架延誤、返工增加', causes: '企劃階段未把規格定案；缺乏需求變更的控管窗口', downstream: '客戶抱怨、團隊加班', confirmed_vs_hypo: '已確認：延誤；待驗證：變更頻率' },
      { statement: '返工造成的額外工作量可能超過現有產能', type: '工作量問題', primary: '關聯問題', phenomena: '長期加班', causes: '返工是需求變更的結果', downstream: '編輯離職風險', confirmed_vs_hypo: '待驗證' },
    ], 'M1-02'),
    'm1.next_bottleneck': I(['即使增加產能，需求未控管仍會持續返工，瓶頸會轉移到品質與士氣'], 'M1-02'),

    'm1._raw_ch3': cf('影響到整個內容團隊五個人，還有三個長期客戶。幾乎每週都在發生，最近三個月越來越嚴重。已經有一個編輯提離職。如果再不處理，兩個大客戶季末要續約，可能會流失。這件事重要，因為直接影響續約。'),
    'm1.impact_scope': O('影響內容團隊 5 人與 3 個長期客戶。', 'M1-03'),
    'm1.frequency_duration': O('幾乎每週發生，近三個月持續擴大。', 'M1-03'),
    'm1.current_impacts': O(['上架延誤率上升', '團隊長期加班', '1 名編輯提出離職'], 'M1-03'),
    'm1.inactivity_cost': I(['季末兩個大客戶續約流失風險', '團隊士氣與留任惡化'], 'M1-03'),
    'm1.importance': cf('高：直接影響客戶續約與團隊留任。'),
    'm1.time_sensitivity': cf('中高：兩個大客戶約在季末續約，需在此之前見到改善。'),
    'm1.need_scale': I('長期能力建立', 'M1-03'),
    'm1.unquantified_risks': I(['品牌口碑受損的程度尚未量化'], 'M1-03'),

    'm1._raw_ch4': cf('如果改善了，上架應該要準時，需求在企劃階段就定案，返工要明顯減少。最低希望準時率回到八成，理想是有需求控管機制、準時率九成以上。既有內容全面翻新不在這次範圍。判斷依據就是看上架準時率跟返工次數。'),
    'm1.current_condition': O('內容產製缺乏需求控管，延誤與返工頻繁。', 'M1-04'),
    'm1.target_change': O('需求在企劃階段定案、跨階段有人負責協調，上架準時。', 'M1-04'),
    'm1.beneficiaries': O(['長期客戶', '內容團隊', '業務'], 'M1-04'),
    'm1.success_evidence': O(['上架準時率提升', '返工次數下降'], 'M1-04'),
    'm1.minimum_result': cf('上架準時率回到八成。'),
    'm1.ideal_result': cf('建立需求變更控管機制，準時率九成以上且返工顯著下降。'),
    'm1.out_of_scope': O(['既有內容全面翻新'], 'M1-04'),
    'm1.beyond_single_solution': I(['跨部門的商業策略與定價調整'], 'M1-04'),

    'm1._raw_ch5': cf('如果改善，可以留住客戶、減少加班跟返工成本。公司願意開一個職缺，也願意花時間調整流程。不能犧牲的是客戶交付風險。但需求控管的決策權要給誰，還沒確認。我覺得資訊夠了，可以進到需求界定去比較要改流程還是增聘。'),
    'm1.expected_value': O(['降低客戶流失', '減少加班與返工成本'], 'M1-05'),
    'm1.available_resources': O('願意投入一個職缺與流程調整的時間。', 'M1-05'),
    'm1.nonnegotiables': O(['不增加客戶交付風險'], 'M1-05'),
    'm1.missing_conditions': I(['需求控管的決策權歸屬尚未確認'], 'M1-05'),
    'm1.underinvest_risk': I(['只加人不改流程，問題會換人承擔'], 'M1-05'),
    'm1.investment_status': cf('進入《職務需求界定書》進行解法設計'),
    'm1.status_reason': cf('問題與改善目標已具備足夠資訊，且需比較流程改善與增聘兩種解法。'),

    // ── M2 職務需求界定（勾選式）──
    'm2.upstream_problem': cf('內容因需求反覆變更與缺乏跨階段協調而延誤。'),
    'm2.upstream_minimum': cf('上架準時率回到八成。'),
    'm2.upstream_ideal': cf('建立需求控管機制，準時率九成以上。'),
    'm2.upstream_constraints': cf('不增加客戶交付風險。'),
    'm2.upstream_hypotheses': cf('需求變更頻率與各階段耗時仍待驗證。'),
    'm2.upstream_out_of_scope': cf('既有內容全面翻新。'),
    'm2.environment_checks': cf([
      '流程反覆、重工、等待，或權責與交付標準不清楚。',
      '主管尚未清楚設定目標、優先順序、分工或回饋方式。',
      '重要決策、授權或跨部門合作經常卡住。',
    ]),
    'm2.priority_condition': cf('先建立需求定案與跨階段協調的責任歸屬。'),
    'm2.uncertain_points': cf('需求控管的決策權應放在哪個角色。'),
    'm2.need_consult_1': cf([]),
    'm2.process_strategies': cf(['釐清跨部門權責、合作界面及決策方式。', '建立文件、模板、資料規則或標準作業方式。']),
    'm2.people_management_strategies': cf(['建立更明確的目標、回饋及績效改善機制。']),
    'm2.external_strategies': cf([]),
    'm2.internal_staffing_strategies': cf(['增設管理、專案整合或跨部門協調角色。', '增加人力，並同步改善流程、工具、權責或既有分工。']),
    'm2.strategy_combination': cf('建立需求定案與變更控管流程，並增設一個內容專案協調角色。'),
    'm2.prerequisite_improvements': cf('先定義需求定案標準與變更處理流程。'),
    'm2.staffing_decision': cf(['需要人力與其他改善策略同步進行。']),
    'm2.role_types': cf(['管理／整合型角色：需要正式承擔目標、優先順序、分工、資源、決策或跨部門整合。']),
    'm2.management_responsibility': cf(['組織確實缺少一個具有正式責任與授權的管理／整合角色。']),
    'm2.demand_duration': cf('長期持續'),
    'm2.workload_frequency': cf('每週跨 3–4 個專案協調，需求控管為持續性工作。'),
    'm2.collaboration_roles': cf('企劃、編輯、設計、業務'),
    'm2.suggested_role_type': cf('內容專案企劃（協調整合型）'),
    'm2.role_level_reason': cf('需要正式承擔需求定案把關與跨階段協調的責任與授權，執行型角色無法承擔。'),
    'm2.unresolved_by_executor': cf('只增加編輯只能提升產能，無法解決需求變更未控管與跨部門協調缺口。'),
    'm2.primary_responsibilities': cf(['統籌內容專案排程', '把關需求定案與變更控管', '跨階段協調企劃、編輯與設計']),
    'm2.shared_responsibilities': cf(['與業務共同確認客戶需求與時程']),
    'm2.support_responsibilities': cf(['協助編輯排解卡點']),
    'm2.organization_responsibilities': cf(['賦予需求定案的決策權', '調整跨部門合作機制']),
    'm2.outside_role_scope': cf(['商業策略與定價']),
    'm2.organization_support': cf([
      '有明確主管或合作窗口。',
      '可以給予與責任相符的決策權與授權。',
      '可以同步完成必要的流程、制度或管理改善。',
    ]),
    'm2.missing_conditions': cf('需求定案決策權的正式授權範圍待主管確認。'),

    // ── M3 職務與人才規格 ──
    'm3.role_positioning': O('統籌內容專案的排程與跨階段協調，把關需求定案與變更，讓內容如期且穩定地交付。', 'M3-01'),
    'm3.value_outputs': O(['提升上架準時率', '降低返工與加班', '建立可複製的需求控管機制'], 'M3-01'),
    'm3.work_items': O(pa_workItems, 'M3-02'),
    'm3.organization_relations': O(pa_orgRelations, 'M3-03'),
    'm3.sel_value_evidence': O(['是否有把跨部門專案如期交付的成果', '是否建立過需求或變更控管機制'], 'M3-01'),
    'm3.sel_value_understanding': O(['候選人能否說出這個角色為什麼存在，以及需求控管為何比補人更關鍵'], 'M3-01'),
    'm3.sel_outcome_criteria': O(['以上架準時率與返工次數是否改善來判斷，而非做了多少協調'], 'M3-01'),
    'm3.sel_key_experience': O(['是否統籌過跨階段內容或專案排程', '是否處理過客戶臨時變更'], 'M3-02'),
    'm3.sel_work_sample': O(['以一個延誤情境設計排程與協調演練', '請候選人試擬需求定案標準'], 'M3-02'),
    'm3.sel_stage_scope': O(['初步篩選：確認跨專案協調的基本經驗', '結構化面試：了解需求控管與協調做法', '情境演練：驗證判斷與風險預警'], 'M3-02'),
    'm3.prehire_knowledge': O(['內容製程與品質基本認識', '專案協調與排程方法'], 'M3-04'),
    'm3.alternative_knowledge': O(['有其他跨部門專案協調經驗者可替代', '有需求管理概念者可較快上手'], 'M3-04'),
    'm3.trainable_knowledge': O(['公司內容類型與客戶脈絡'], 'M3-04'),
    'm3.organization_specific_knowledge': O(['內部製程現況與各角色默契', '客戶歷史需求與雷點'], 'M3-04'),
    'm3.core_judgments': O(['判斷需求是否可定案', '判斷延誤風險與是否需升級'], 'M3-05'),
    'm3.work_principles': O(['決定前先看排程、相依與客戶承諾'], 'M3-05'),
    'm3.high_risk_escalations': O(['涉及合約範圍或重大延誤須停下並上報'], 'M3-05'),
    'm3.knowledge_anchors': I(pa_knowledgeAnchors, 'M3-08'),
    'm3.required_tools': O(['專案管理與排程工具', '內容協作平台'], 'M3-06'),
    'm3.alternative_tools': O(['用過其他專案管理工具者可替代'], 'M3-06'),
    'm3.trainable_tools': O(['公司內部的內容平台設定'], 'M3-06'),
    'm3.professional_methods': O(['需求定案與變更控管方法', '跨階段排程與相依管理'], 'M3-06'),
    'm3.work_methods': O(['以里程碑與緩衝安排排程'], 'M3-06'),
    'm3.exception_methods': O(['客戶臨時變更時，先評估交付影響再決定是否接受'], 'M3-06'),
    'm3.tool_anchors': I(pa_toolAnchors, 'M3-08'),
    'm3.quality_requirements': O(['交付時程與內容品質同時守住'], 'M3-07'),
    'm3.error_responsibility': O(['延誤發生時主動說明原因、影響與補救'], 'M3-07'),
    'm3.tradeoff_principles': O(['時程與範圍衝突時，優先守住客戶承諾與品質底線'], 'M3-07'),
    'm3.ethics_nonnegotiables': O(['不對客戶或團隊做無法兌現的時程承諾'], 'M3-07'),
    'm3.gray_area_principles': O(['規則未涵蓋時，以不傷害交付與不誤導客戶為原則'], 'M3-07'),
    'm3.escalation_required': O(['被要求接受明顯做不到的時程時，須回報而非私下答應'], 'M3-07'),
    'm3.attitude_anchors': I(pa_attitudeAnchors, 'M3-08'),
    'm3.maturity_anchors': I(pa_maturity, 'M3-09'),

    // ── M4 職務基本資料 ──
    'm4.job_basic_info': cf({
      job_title: '內容專案企劃', department: '內容部', report_to: '內容主管',
      is_manager: '否', manage_count: '', location: '台北',
      work_mode: '混合', employment: '全職', work_hours: '週一至週五 09:30–18:30', salary_range: '面議',
    }),
    'm4.role_positioning': O('統籌內容專案排程與跨階段協調，把關需求定案與變更，讓內容如期且穩定地交付。', 'M4-01'),

    // ── M5 甄選流程 ──
    'm5.candidate_process_info': cf({
      duration: '約 2 週', format: '初篩線上、結構化面試與情境演練為實體',
      prep: '請準備一個你統籌過、曾遇到延誤或臨時變更的專案經驗（可匿名）。', stage_time: '每階段約 45–60 分鐘',
      notify: '每階段結束後一週內以 Email 通知',
    }),
    'm5.process_steps': I(pa_processSteps, 'M5-01'),
    'm5.interview_questions': I(pa_interviewQuestions, 'M5-02'),
    'm5.overperformance_risks': I([{ competency: '跨部門溝通與衝突處理', risk: '能力遠高於需求時，可能對現有流程不耐或急於改動。', check: '面試確認其推動改變的節奏與方式。', acceptable: '若能循序推動並帶團隊，可接受。' }], 'M5-03'),
    'm5.training_gaps': I([{ competency: '內容製程與品質標準', gap: '可接受到職時僅具備一般專案經驗、對內容製程尚不熟。', period: '到職 1–2 個月內達 L3。', support: '安排製程輪流見習與資深企劃帶領。' }], 'M5-03'),

    // ── M6 JD 對外文案 ──
    'm6.job_title': O('內容專案企劃', 'M6-01'),
    'm6.role_positioning': O('統籌內容專案排程與跨階段協調，把關需求定案與變更，讓內容如期且穩定地交付。', 'M6-01'),
    'm6.work_items': O(pa_workItems.map(w => `【${w.responsibility_type}｜${w.nature}｜${w.frequency_share}】${w.work}`), 'M6-01'),
    'm6.minimum_competencies': O([
      '面對需求定案與變更控管的情況時，你能判斷需求是否可定案，並依流程處理後續變更',
      '你具備內容製程與品質標準相關知識，能夠掌握全流程並預判卡點',
      '你能使用專案管理與排程工具，獨立維護跨專案排程與相依關係',
    ], 'M6-01'),
    'm6.work_traits': O([
      '遇到原因不明或牽涉多方的問題時，你會收集各階段資訊、分析主因並提出替代方案',
      '與其他部門合作時，你能在沒有直接職權下整合立場，促成共識',
      '你能理解工作與客戶及組織價值的關係，並依此調整優先序',
    ], 'M6-01'),
    'm6.interview_process': O([
      '整體流程：預計包含 4 個階段，整體約於約 2 週內完成。',
      '第一階段｜初步篩選：由招募／HR 進行，主要會書面與作品檢視；預計需要每階段約 45–60 分鐘。',
      '第二階段｜結構化面試：由內容主管＋HR 進行，主要會行為事例訪談；預計需要每階段約 45–60 分鐘。',
      '第三階段｜情境演練：由資深企劃進行，主要會延誤與臨時變更情境模擬；預計需要每階段約 45–60 分鐘。',
      '第四階段｜最終確認：由內容主管進行，主要會綜合評估與等級核對；預計需要每階段約 45–60 分鐘。',
      '事前準備：請準備一個你統籌過、曾遇到延誤或臨時變更的專案經驗（可匿名）。',
      '結果通知：預計於每階段結束後一週內以 Email 通知。',
    ], 'M6-01'),
    'm6.publish_confirmation': cf({ confirmed: true, at: NOW }),
  };

  return {
    case_id: PATHA_ID, owner: 'demo-student', path_type: 'full_design',
    is_demo: true, demo_kind: 'path_a', doc_version: 1, fields,
    modules: {
      m1: { status: 'confirmed', structured_values: {}, chapters: pa_m1Chapters, updated_at: NOW },
      m2: { status: 'confirmed', structured_values: {}, updated_at: NOW },
      m3: { status: 'confirmed', structured_values: {}, sections: sectionStates, updated_at: NOW },
      m4: { status: 'confirmed', structured_values: {}, updated_at: NOW },
      m5: { status: 'confirmed', structured_values: {}, updated_at: NOW },
      m6: { status: 'confirmed', structured_values: {}, updated_at: NOW },
    },
    access: { opens_at: NOW, submission_due_at: null, first_final_download_at: null, scheduled_close_at: null, closed_at: null, reopened_until: null, reopen_reason: null },
    exports: [], discussion_items: [], audit_events: [],
    ai_jobs: [{ ai_job_id: 'aijob_pa', task_code: 'DEMO', prompt_version: '1.0.0', provider: 'mock', model: 'mock-1', input_tokens: 0, output_tokens: 0, estimated_cost: 0, completed_at: NOW }],
    overall_status: 'output_ready', current_module: 'm1',
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
export function seedPathACase() { return put(PATHA_ID, buildPathACase()); }

export const DEMO_CASE_ID = DEMO_ID;
export const CONTRA_CASE_ID = CONTRA_ID;
export const PATHA_CASE_ID = PATHA_ID;
