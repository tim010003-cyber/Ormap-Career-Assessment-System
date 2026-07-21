/**
 * jd-fields.js — 職務設計與甄選 Web App｜欄位字典與引導題（完整規格）
 * =====================================================================
 * 單一真實來源。內容嚴格對齊課程正式工具文件：
 *   《3.職務與人才規格定位》《4.職務說明書》《5.甄選流程設計書》《6.JD對外文案》
 * 欄位 ID 對齊《02_欄位字典_v1》。核心引導問題、AI 轉換原則
 * 一律照抄正式文件，不自行改寫語意。
 *
 * 結構
 *   M3_CHAPTERS  — 五章 14 節，每節含：核心引導問題／口述回應提示／AI 產出欄位
 *   MATURITY_DIMENSIONS — 第五章五個成熟度維度（含定義與泛用五級參考）
 *   M4_SECTIONS / M5_TABLES / M6_SECTIONS — 三份正式輸出的章節結構
 */

// ── 流程 ────────────────────────────────────────────────
export const PATH_B_MODULES = ['existing', 'm3', 'm4', 'm5', 'm6', 'output'];
export const PATH_A_MODULES = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'output'];

export function modulesForPath(pathType) {
  return pathType === 'full_design' ? PATH_A_MODULES : PATH_B_MODULES;
}

/**
 * 兩條路徑的對外名稱（PO 定案 2026-07-21）。
 * 畫面一律用這裡的名稱，不使用「路徑 A／B」這種內部代號。
 */
export const PATHS = {
  existing_role_focus: {
    key: 'existing_role_focus',
    name: '職務優化',
    when: '這個職務已經存在，工作和責任大致確定，想把職能標準、面試流程或 JD 做得更好。',
    steps: '既有職務盤點 → 職務與人才規格 → 三份正式文件',
    icon: 'sliders-horizontal',
  },
  full_design: {
    key: 'full_design',
    name: '完整職務設計',
    when: '還不確定要不要增加這個職務，或想先釐清組織真正的問題，再談要不要找人。',
    steps: '問題釐清 → 需求界定 → 職務與人才規格 → 三份正式文件',
    icon: 'lightbulb',
  },
};
export const pathName = (t) => PATHS[t]?.name || PATHS.existing_role_focus.name;

// 步進器分組：思考 → 正式文件 → 輸出
export const GROUP_THINKING = '思考';
export const GROUP_DOCUMENT = '正式文件';
export const GROUP_OUTPUT = '輸出';

export const MODULE_META = {
  m1:       { code: 'm1',       title: '問題釐清',         subtitle: '先確認問題，再談要不要找人', group: GROUP_THINKING },
  m2:       { code: 'm2',       title: '職務需求界定',     subtitle: '比較策略，判斷是否真的要增聘', group: GROUP_THINKING },
  existing: { code: 'existing', title: '既有職務盤點',     subtitle: '先把這個職務目前的樣子講清楚', group: GROUP_THINKING },
  m3:       { code: 'm3',       title: '職務與人才規格',   subtitle: '五章：12 節 ＋ 五維人才成熟度', group: GROUP_THINKING },
  m4:       { code: 'm4',       title: '職務說明書',       subtitle: '組織內部對齊角色、權責與適任條件', group: GROUP_DOCUMENT },
  m5:       { code: 'm5',       title: '甄選流程設計書',   subtitle: '流程、面試題、行為定錨與等級', group: GROUP_DOCUMENT },
  m6:       { code: 'm6',       title: 'JD 對外文案',      subtitle: '通過揭露檢查後才能發布', group: GROUP_DOCUMENT },
  output:   { code: 'output',   title: '預覽與下載',       subtitle: '四份獨立文件、記錄下載與關閉倒數', group: GROUP_OUTPUT },
};

/** 步進器上的小字：思考／正式文件／輸出 */
export function groupLabel(moduleCode) {
  return MODULE_META[moduleCode]?.group || '';
}

/**
 * 「引導與思考」文件裡的部別編號（沿用課程文件的章節結構）。
 * 只用於產生文件，不顯示在步進器上。
 */
export function partLabel(moduleCode, pathType) {
  const A = { m1: '第一部', m2: '第二部', m3: '第三部' };
  const B = { existing: '第一部', m3: '第二部' };
  const map = pathType === 'full_design' ? A : B;
  return map[moduleCode] || '';
}

export const AI_ROLE_LABEL = {
  U: '使用者輸入', 'AI-O': 'AI 整理', 'AI-I': 'AI 推論·待確認', H: '人工決定',
};

// 責任區分／工作性質選項（依《3.職務與人才規格定位》1.2）
export const RESPONSIBILITY_TYPES = ['主要負責', '共同負責', '協助'];
export const WORK_NATURE = ['核心工作', '支援工作'];
export const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'];

// ── 案例層欄位 ──────────────────────────────────────────
export const CASE_FIELDS = [
  { id: 'case.title',             name: '案例名稱',     type: 'text',        required: true, ai: 'H', help: '例如：客服團隊資深專員優化' },
  { id: 'case.organization_name', name: '組織顯示名稱', type: 'text',        required: true, ai: 'H', help: '真實企業請考慮匿名化' },
  { id: 'case.job_title_working', name: '職務暫定名稱', type: 'text',        required: true, ai: 'H', help: '之後可再校準' },
  { id: 'case.optimization_goals', name: '本次優化目標', type: 'multiselect', required: true, ai: 'U',
    options: ['聚焦職能標準', '重寫面試流程', '更新 JD 對外文案', '釐清權責邊界', '設定最低適任等級'] },
];

// ── existing.*：既有職務盤點（職務優化路線，純人工）────────
export const EXISTING_FIELDS = [
  { id: 'existing.role_reason',          name: '職務存在理由',   type: 'textarea', required: true,  ai: 'U', help: '這個職務為什麼需要存在？解決什麼？' },
  { id: 'existing.expected_results',     name: '既有預期成果',   type: 'list',     required: true,  ai: 'U', help: '一條一個成果' },
  { id: 'existing.main_work',            name: '既有主要工作',   type: 'list',     required: true,  ai: 'U' },
  { id: 'existing.current_issues',       name: '現有職務問題',   type: 'list',     required: false, ai: 'U', help: '目前運作有什麼卡點' },
  { id: 'existing.changed_expectations', name: '正在改變的期待', type: 'textarea', required: false, ai: 'U' },
  { id: 'existing.resources_authority',  name: '現有資源與授權', type: 'textarea', required: true,  ai: 'U', help: '手上有哪些資源、能決定什麼、要往上報什麼' },
];

/* ═══════════════════════════════════════════════════════
   M1 問題釐清定位書（依《1.問題釐清定位書》）
   五章訪談式：每章 核心引導問題 → 口述回應區 → AI 轉換原則
   ═══════════════════════════════════════════════════════ */

// 第二章的問題類型參考（照抄正式文件）
export const PROBLEM_TYPES = [
  { name: '工作量問題', desc: '任務持續超過合理容量、排程延誤或長期加班。' },
  { name: '能力問題', desc: '有人執行，但缺少必要知識、技術或判斷，造成品質與風險問題。' },
  { name: '流程問題', desc: '重工、等待、資訊斷裂、交付點或責任不清。' },
  { name: '工具問題', desc: '大量人工處理、資料分散，或現有系統無法支持工作。' },
  { name: '管理問題', desc: '目標反覆、優先順序混亂、決策延遲、分工或回饋不足。' },
  { name: '激勵問題', desc: '責任增加，但薪酬、授權、認可或發展沒有相應調整。' },
  { name: '商業問題', desc: '產品、市場、需求或獲利模式尚未被驗證。' },
  { name: '組織結構問題', desc: '工作放在不適合的部門或角色，合作界面與權責配置失衡。' },
];

export const NEED_SCALE_OPTIONS = ['短期止血', '局部改善', '長期能力建立', '尚待判斷'];

// 第五章的建議狀態（只能是這四個）
export const INVESTMENT_STATUS_OPTIONS = [
  '進入《職務需求界定書》進行解法設計',
  '先補充證據或驗證重要假設',
  '暫緩處理並設定重新檢視條件',
  '目前不投入，並保留決策理由',
];

export const M1_CHAPTERS = [
  {
    code: '第一章', title: '需求觸發與現況', rawId: 'm1._raw_ch1', task: 'M1-01',
    purpose: '確認組織為什麼在這個時間點開始想投入資源，以及目前實際發生了什麼，而不是直接跳到「需要找一個人」。',
    questions: [
      '最近發生了什麼事情，讓你開始覺得這件事需要被處理？',
      '現在具體看見哪些異常、延誤、損失、抱怨、機會或工作卡點？',
      '問題通常在什麼情境、流程階段或對象身上出現；已經持續多久？',
      '哪些內容已有資料、紀錄或多人觀察支持，哪些仍只是感受或推測？',
    ],
    responseHint: '可以從工作量增加、交付延誤、品質下降、客戶反映、人員離開、新服務啟動，或企業主長期被特定工作綁住等具體事件開始。沒有數字也可以先說明實際案例，但不要為了完整而猜測。',
    guard: '不得把「主管想找人」直接改寫成已證實的人力需求。',
    outputs: [
      { id: 'm1.trigger_event', name: '需求觸發：最近的觸發事件', type: 'textarea', ai: 'AI-O' },
      { id: 'm1.first_noticed_at', name: '問題開始或被注意到的時間', type: 'text', ai: 'AI-O' },
      { id: 'm1.affected_roles', name: '最先注意到問題及主要受影響的角色', type: 'list', ai: 'AI-O' },
      { id: 'm1.demand_nature', name: '需求性質', type: 'select', ai: 'AI-I',
        options: ['新需求', '長期累積問題', '人員異動後的缺口', '新的商業機會'] },
      { id: 'm1.confirmed_facts', name: '已確認的事實與可觀察現象', type: 'list', ai: 'AI-O' },
      { id: 'm1.supporting_evidence', name: '有資料、紀錄、案例或多人觀察支持的內容', type: 'list', ai: 'AI-O' },
      { id: 'm1.hypotheses_pending', name: '合理但尚待驗證的推論', type: 'list', ai: 'AI-I' },
      { id: 'm1.feelings_claims', name: '目前只有感受、尚無法確認範圍與頻率的說法', type: 'list', ai: 'AI-O' },
      { id: 'm1.information_gaps', name: '仍需要補充的資料', type: 'list', ai: 'AI-I' },
    ],
  },
  {
    code: '第二章', title: '問題定義與成因假設', rawId: 'm1._raw_ch2', task: 'M1-02',
    purpose: '把表面症狀拆成可以處理的問題，辨識真正卡住的是工作量、能力、流程、工具、管理、激勵、商業或組織結構，而不是把所有問題都歸因於個人。',
    showProblemTypes: true,
    questions: [
      '目前是沒有人做、做不完、做不好，還是做事的方法與決策機制有問題？',
      '如果明天多一個人報到，但流程、工具、權責與管理方式都不變，哪些問題會改善，哪些仍然不會？',
      '眼前看見的問題，可能是哪個更上游問題的結果；不同問題之間可能如何互相影響？',
      '目前主要問題與次要問題分別是什麼；哪些成因已確認，哪些仍只是待驗證假設？',
    ],
    responseHint: '可以同時提出多種可能，不需要現在就選出唯一答案。請說明為什麼會這樣判斷、有哪些反例或不同看法，以及問題曾經暫時消失後又重新出現的情況。',
    guard: '不得把時間上先發生的事情直接判定為原因，也不得使用「員工不夠積極」「團隊抗壓性不足」等人格歸因替代問題分析。',
    outputs: [
      { id: 'm1.problem_statements', name: '問題清單', type: 'repeat', ai: 'AI-O',
        rule: '拆成一項主要問題與必要的關聯問題，不把不同問題合併成一個模糊需求。',
        columns: [
          { key: 'statement', name: '問題陳述', type: 'text', placeholder: '什麼對象在什麼情境下，無法產生什麼結果' },
          { key: 'type', name: '問題類型', type: 'text', placeholder: '可一至兩類' },
          { key: 'primary', name: '主／次', type: 'select', options: ['主要問題', '關聯問題'] },
          { key: 'phenomena', name: '可觀察現象及已知影響', type: 'text' },
          { key: 'causes', name: '可能的直接原因與更上游原因', type: 'text' },
          { key: 'downstream', name: '受影響的下游結果', type: 'text' },
          { key: 'confirmed_vs_hypo', name: '已確認成因／待驗證假設', type: 'text' },
        ] },
      { id: 'm1.next_bottleneck', name: '若只處理局部問題，可能出現的下一個瓶頸', type: 'list', ai: 'AI-I' },
    ],
  },
  {
    code: '第三章', title: '問題尺度、影響與不處理代價', rawId: 'm1._raw_ch3', task: 'M1-03',
    purpose: '確認問題影響的範圍、持續時間與嚴重程度，並區分重要程度與時間敏感性。',
    questions: [
      '這個問題影響哪些人、客戶、部門、成果或決策；範圍正在縮小、穩定還是擴大？',
      '這是偶發問題、週期性問題，還是持續發生的組織問題？',
      '如果未來三至六個月不處理，最可能發生哪些具體後果？',
      '有沒有不能延後處理的期限、法規、安全、客戶或商業時機？',
    ],
    responseHint: '可以從營收、成本、客戶、品質、工時、離職、企業主時間、商機、商譽、安全及合規風險說明。若無法估算金額，可以先描述影響方式、持續程度與嚴重性。',
    guard: '緊急與重要必須分開：事情很急，不代表值得建立長期職務；事情目前不急，也不代表沒有高額累積成本。',
    outputs: [
      { id: 'm1.impact_scope', name: '主要影響對象與範圍', type: 'textarea', ai: 'AI-O' },
      { id: 'm1.frequency_duration', name: '發生頻率、持續程度及是否正在擴大', type: 'textarea', ai: 'AI-O' },
      { id: 'm1.current_impacts', name: '目前已經發生的影響', type: 'list', ai: 'AI-O' },
      { id: 'm1.inactivity_cost', name: '三至六個月內可能出現的代價', type: 'list', ai: 'AI-I' },
      { id: 'm1.importance', name: '影響程度及判斷依據', type: 'textarea', ai: 'H' },
      { id: 'm1.time_sensitivity', name: '時間敏感性及關鍵期限', type: 'textarea', ai: 'H' },
      { id: 'm1.need_scale', name: '需求尺度', type: 'select', ai: 'AI-I', options: NEED_SCALE_OPTIONS },
      { id: 'm1.unquantified_risks', name: '尚未量化或仍待確認的風險', type: 'list', ai: 'AI-I' },
    ],
  },
  {
    code: '第四章', title: '改善目標', rawId: 'm1._raw_ch4', task: 'M1-04',
    purpose: '把問題轉成清楚的改善目標，說明希望從什麼狀況改變成什麼狀況，而不先指定解法。',
    questions: [
      '如果問題獲得合理改善，哪些現象、成果或風險應該發生改變？',
      '最低可以接受的改善結果是什麼，理想結果又是什麼？',
      '可以透過哪些觀察、資料或事件，確認改善真的發生，而不只是多做了事情？',
      '哪些期待不屬於這次處理範圍，或不應由單一方案承擔？',
    ],
    responseHint: '請使用「從什麼狀況改善成什麼狀況」描述。此處先定義結果，不需要決定由誰做、購買什麼工具或採用哪一種合作形式。',
    guard: '不得把「招到一個人」「完成系統導入」等活動直接當成改善成果。',
    outputs: [
      { id: 'm1.current_condition', name: '目前狀況', type: 'textarea', ai: 'AI-O' },
      { id: 'm1.target_change', name: '期待改變', type: 'textarea', ai: 'AI-O' },
      { id: 'm1.beneficiaries', name: '主要受益對象', type: 'list', ai: 'AI-O' },
      { id: 'm1.success_evidence', name: '判斷改善是否發生的依據', type: 'list', ai: 'AI-O' },
      { id: 'm1.minimum_result', name: '最低可接受結果', type: 'textarea', ai: 'H' },
      { id: 'm1.ideal_result', name: '理想結果', type: 'textarea', ai: 'H' },
      { id: 'm1.out_of_scope', name: '暫時不追求或超出本次範圍的結果', type: 'list', ai: 'AI-O' },
      { id: 'm1.beyond_single_solution', name: '無法由單一方案或單一人才承擔的期待', type: 'list', ai: 'AI-I' },
    ],
  },
  {
    code: '第五章', title: '投入判斷與下一步', rawId: 'm1._raw_ch5', task: 'M1-05',
    purpose: '確認這個問題是否值得繼續投入、組織願意承擔哪些資源，以及是否具備進入解法設計的最低資訊。',
    questions: [
      '這個問題若被改善，可能帶來哪些價值、避免哪些代價？',
      '組織目前願意投入哪些時間、預算、管理注意力與協作資源；有哪些不可妥協的限制？',
      '哪些條件或資訊尚未具備，可能使這次投入無法成功？',
      '現在應進入解法設計、先補充資訊、暫緩處理，還是決定不投入？為什麼？',
    ],
    responseHint: '可以說明可接受的投入範圍、不能犧牲的條件、現有資源及管理限制。無法估算投資報酬時，不需要硬填金額。不同角色看法不一致時，可以分別保留。',
    guard: '不得只計算薪資或採購成本，也需提醒管理、訓練、溝通、工具及轉換成本，但沒有依據時不可自行估價。若問題、改善目標或投入邊界仍高度矛盾，不得直接建議建立職務。',
    outputs: [
      { id: 'm1.expected_value', name: '預期價值與可避免的代價', type: 'list', ai: 'AI-O' },
      { id: 'm1.available_resources', name: '可投入的資源範圍', type: 'textarea', ai: 'AI-O' },
      { id: 'm1.nonnegotiables', name: '不可妥協的限制', type: 'list', ai: 'AI-O' },
      { id: 'm1.missing_conditions', name: '目前缺少的成功條件或資訊', type: 'list', ai: 'AI-I' },
      { id: 'm1.underinvest_risk', name: '投入不足可能造成的風險', type: 'list', ai: 'AI-I' },
      { id: 'm1.investment_status', name: '建議狀態', type: 'select', ai: 'H', options: INVESTMENT_STATUS_OPTIONS },
      { id: 'm1.status_reason', name: '建議狀態的理由', type: 'textarea', ai: 'H' },
    ],
  },
];

// 正式輸出前的 AI 檢查（doc 1 §三）
export const M1_PRE_OUTPUT_CHECKS = [
  '已有明確證據支持的內容。',
  '由受訪者提出但尚待驗證的推論。',
  '不同角色之間互相矛盾的說法。',
  '把流程、工具、管理或授權問題歸因於個人的情況。',
  '把「招募」當成問題本身或唯一答案的情況。',
  '缺乏依據的成本、時程或緊急程度。',
  '需要補充資料後才能進入解法設計的事項。',
];

export const M1_FINAL_CHECKLIST = [
  '已說明具體觸發事件，而不只寫「缺人」或「大家很忙」。',
  '已區分事實、感受與待驗證假設。',
  '已把不同問題拆開，不塞成一個模糊需求。',
  '已辨識工作量、能力、流程、工具、管理、激勵、商業及組織結構因素。',
  '已檢查增加一個人後，哪些問題仍不會改善。',
  '已說明問題尺度、影響及不處理代價。',
  '已區分重要程度與時間敏感性。',
  '改善目標描述結果改變，而不是先指定解法。',
  '已說明最低可接受結果、理想結果及判斷依據。',
  '已確認投入價值、資源限制及缺少的成功條件。',
  '已決定進入解法設計、先補資訊、暫緩或不投入。',
  '交接內容足以讓《職務需求界定書》比較不同解法。',
];

/* ═══════════════════════════════════════════════════════
   M2 職務需求界定書（依《2.職務需求界定書》）
   **勾選式作業**，不是口述訪談。先自行勾選並簡短補充；
   無法判斷時保留問題並標示「需要進一步確認／諮詢」。
   ═══════════════════════════════════════════════════════ */

export const M2_PARTS = [
  {
    code: '第一部分', title: '目前的人力與工作環境',
    blocks: [
      { type: 'fields', title: '上游問題', note: '若此處無法說清楚，請先回到《問題釐清定位書》，不要直接開始設計職務。',
        fields: [
          { id: 'm2.upstream_problem', name: '本次要處理的優先問題', type: 'textarea' },
          { id: 'm2.upstream_minimum', name: '最低需要改善到什麼程度', type: 'textarea' },
          { id: 'm2.upstream_ideal', name: '理想希望改善到什麼程度', type: 'textarea' },
          { id: 'm2.upstream_constraints', name: '重要限制或不可犧牲條件', type: 'textarea' },
          { id: 'm2.upstream_hypotheses', name: '仍待驗證的假設或資訊', type: 'textarea' },
          { id: 'm2.upstream_out_of_scope', name: '暫時不處理的問題', type: 'textarea' },
        ] },
      { type: 'checklist', title: '現況盤點', id: 'm2.environment_checks',
        options: [
          '工作量持續超過現有人力可以合理完成的容量。',
          '工作分配不平均，少數人長期補位或收尾。',
          '現有人員的角色或能力與工作要求不相符。',
          '工作量或需求頻率可能不足以形成完整職務。',
          '流程反覆、重工、等待，或權責與交付標準不清楚。',
          '工具、系統、資料或文件無法支持實際工作。',
          '主管尚未清楚設定目標、優先順序、分工或回饋方式。',
          '重要決策、授權或跨部門合作經常卡住。',
          '主管目前沒有足夠時間或能力管理及培養新人。',
          '責任增加後，薪酬、職等、授權或資源沒有同步調整。',
          '產品、市場、服務或工作需求仍在變動，尚未形成穩定範圍。',
          '需求屬於一次性、階段性或短期專案。',
          '問題同時涉及策略、管理、專業與執行，可能不是一個角色可以合理承擔。',
        ] },
      { type: 'fields', fields: [
          { id: 'm2.priority_condition', name: '目前最需要先處理的狀況', type: 'textarea' },
          { id: 'm2.uncertain_points', name: '目前最不確定的地方', type: 'textarea' },
        ] },
      { type: 'checklist', id: 'm2.need_consult_1', options: ['需要進一步確認或帶入諮詢。'] },
    ],
  },
  {
    code: '第二部分', title: '可能採用的改善策略',
    note: '四類策略都需要快速看過；只勾選本次可能採用或需要進一步評估的項目。',
    blocks: [
      { type: 'checklist', title: '工作、流程、工具與制度改善', id: 'm2.process_strategies',
        options: [
          '停止或刪除低價值、重複或不再必要的工作。',
          '重整工作流程、交付方式或品質標準。',
          '釐清跨部門權責、合作界面及決策方式。',
          '建立文件、模板、資料規則或標準作業方式。',
          '導入工具、系統或自動化。',
        ] },
      { type: 'checklist', title: '既有人員配置與管理改善', id: 'm2.people_management_strategies',
        options: [
          '重新分工、內部輪調或調整角色配置。',
          '提供教育訓練、工作指導或必要資源。',
          '建立更明確的目標、回饋及績效改善機制。',
          '調整薪酬、職等、授權或工作範圍。',
          '調整主管職責、管理關係，或依制度處理持續不適任情況。',
        ] },
      { type: 'checklist', title: '外部專業與彈性資源', id: 'm2.external_strategies',
        options: [
          '單次顧問諮詢或專業診斷。',
          '專案型、按件計酬或階段性合作。',
          '固定週期的外包、顧問或彈性人力。',
          '由外部專業者建置，再將知識、流程或系統移轉給內部。',
        ] },
      { type: 'checklist', title: '內部人力與正式編制', id: 'm2.internal_staffing_strategies',
        options: [
          '增加部分工時、定期或試行性人力。',
          '增加全職執行型人力。',
          '增加全職專業型人力。',
          '增設管理、專案整合或跨部門協調角色。',
          '分階段增加不同角色或建立小型團隊。',
          '增加人力，並同步改善流程、工具、權責或既有分工。',
        ] },
      { type: 'fields', title: '初步策略結論', fields: [
          { id: 'm2.strategy_combination', name: '預計採用的策略組合', type: 'textarea' },
          { id: 'm2.prerequisite_improvements', name: '增加人才前必須先完成的改善', type: 'textarea' },
        ] },
      { type: 'checklist', id: 'm2.staffing_decision',
        options: [
          '先改善現有環境，暫不增加人才。',
          '先使用外部或彈性資源測試需求。',
          '需要新增內部人力。',
          '需要人力與其他改善策略同步進行。',
          '目前無法判斷，需要進一步諮詢。',
        ] },
    ],
  },
  {
    code: '第三部分', title: '需要哪一種角色層級',
    blocks: [
      { type: 'checklist', title: '角色類型判斷', id: 'm2.role_types',
        options: [
          '執行型角色：目標、流程與標準已經清楚，主要缺少穩定執行容量。',
          '專業型角色：需要持續運用專業知識、方法與判斷處理問題。',
          '管理／整合型角色：需要正式承擔目標、優先順序、分工、資源、決策或跨部門整合。',
          '外部／專案型角色：需求短期、階段性或尚未穩定，不適合立即建立正式編制。',
          '多角色／小型團隊：需要不同專業或不同層級，無法合理集中在一人身上。',
          '暫不建立角色：應先改善流程、工具、管理或既有人員配置。',
          '目前無法判斷，需要進一步諮詢。',
        ] },
      { type: 'checklist', title: '管理問題的責任判斷', id: 'm2.management_responsibility',
        note: '若前面有勾選管理、決策、分工或合作問題，請確認。',
        guard: '不能建立一個沒有相應授權的執行職務，卻期待他解決主管、決策或跨部門管理問題。',
        options: [
          '應由現任主管改善，不轉成新職務的責任。',
          '需要調整現有主管職責、授權或管理關係。',
          '組織確實缺少一個具有正式責任與授權的管理／整合角色。',
          '目前無法判斷，需要進一步諮詢。',
        ] },
      { type: 'fields', fields: [
          { id: 'm2.demand_duration', name: '需求持續性', type: 'select', options: ['一次性', '階段性', '週期性', '長期持續', '待確認'] },
          { id: 'm2.workload_frequency', name: '初步工作量或頻率', type: 'textarea' },
          { id: 'm2.collaboration_roles', name: '主要合作角色', type: 'textarea' },
          { id: 'm2.suggested_role_type', name: '建議角色類型', type: 'text' },
          { id: 'm2.role_level_reason', name: '為什麼需要這個層級', type: 'textarea' },
          { id: 'm2.unresolved_by_executor', name: '若只增加執行人力，哪些問題仍不會改善', type: 'textarea' },
        ] },
    ],
  },
  {
    code: '第四部分', title: '人才任務範圍與組織責任',
    blocks: [
      { type: 'fields', fields: [
          { id: 'm2.primary_responsibilities', name: '人才主要負責', type: 'list', help: '人才需要主導並對結果承擔主要責任' },
          { id: 'm2.shared_responsibilities', name: '需要共同處理', type: 'list', help: '需要與主管、同事、跨部門或外部角色共同完成' },
          { id: 'm2.support_responsibilities', name: '人才協助處理', type: 'list', help: '提供資訊、執行支援或專業建議，但不承擔最終結果' },
          { id: 'm2.organization_responsibilities', name: '由主管或組織負責', type: 'list', help: '不應轉嫁給人才，應由主管或組織承擔' },
          { id: 'm2.outside_role_scope', name: '不應期待人才解決', type: 'list', help: '超出角色工作量、專業、責任或授權範圍' },
        ] },
      { type: 'checklist', title: '組織可以提供的條件', id: 'm2.organization_support',
        options: [
          '有明確主管或合作窗口。',
          '可以提供必要資訊、資料、工具及系統。',
          '可以給予與責任相符的決策權與授權。',
          '可以提供訓練、交接、回饋及成果驗收。',
          '可以同步完成必要的流程、制度或管理改善。',
          '尚有重要條件無法確認，需要進一步諮詢。',
        ] },
      { type: 'fields', fields: [
          { id: 'm2.missing_conditions', name: '目前仍缺少的條件', type: 'textarea' },
        ] },
    ],
  },
];

// AI 整理原則（doc 2）
export const M2_AI_RULES = [
  '只根據勾選及補充內容整理，不自行補造問題、策略或職務。',
  '若勾選結果互相矛盾，先列出矛盾，不急著產出職務建議。',
  '區分人才主要負責、需要共同處理，以及主管或組織負責的事項。',
  '若主要問題來自管理、流程、工具或授權，不得只建議新增執行人力。',
  '若工作量、需求持續性或角色層級不明確，標示「需要進一步確認／諮詢」。',
  '不在本文件產出年資、學歷、人格特質、職能等級或面試條件。',
];

// AI 最終輸出的九項（doc 2）
export const M2_OUTPUT_ITEMS = [
  '目前主要的人力與工作環境狀況。',
  '建議採用的改善策略組合。',
  '增加人才前必須先完成的改善。',
  '是否需要額外人才及適合的合作形式。',
  '建議角色類型與判斷理由。',
  '需求持續性、初步工作量與主要合作角色。',
  '人才主要負責、共同處理、協助處理及不應承擔的範圍。',
  '主管與組織必須同步提供的條件。',
  '需要進一步諮詢確認的問題。',
];

// 交接至《職務與人才規格定位》的對應（doc 2）
export const M2_HANDOFF = [
  { to: '1.1 角色定位與預期價值產出', items: ['建議角色類型及必要功能。', '主要需要處理的問題與預期改善結果。'] },
  { to: '1.2 主要工作內容與頻率', items: ['人才主要負責、共同處理及協助事項。', '需求持續性、工作量及使用頻率。'] },
  { to: '1.3 組織關係、責任與專業決策範圍', items: ['由主管或組織負責的事項。', '主要合作角色及必要資訊、資源與授權。', '不應期待人才單獨解決的問題。'] },
];

export const M2_HANDOFF_NOTE = '本文件不直接交接人才特質、職能名稱或能力等級，避免在工作範圍尚未確定前先對人才下結論。';

/** M1 全部產出欄位 */
export function m1OutputFields() {
  return M1_CHAPTERS.flatMap(ch => ch.outputs);
}

/** M2 全部欄位（勾選清單 ＋ 填寫欄位） */
export function m2AllFieldIds() {
  const ids = [];
  M2_PARTS.forEach(p => p.blocks.forEach(b => {
    if (b.type === 'checklist') ids.push(b.id);
    else (b.fields || []).forEach(f => ids.push(f.id));
  }));
  return ids;
}

/* ═══════════════════════════════════════════════════════
   M3 職務與人才規格定位 — 五章 14 節
   每節：核心引導問題（照抄正式文件）→ 口述回應區 → AI 產出欄位
   ═══════════════════════════════════════════════════════ */

export const M3_CHAPTERS = [
  {
    code: 'ch1', title: '第一章　工作內容與情境',
    purpose: '以完整職務為單位，說清楚這個角色為什麼存在、預期創造什麼價值、主要負責哪些工作，以及與其他角色的責任和決策關係。',
    sections: [
      {
        code: '1.1', title: '角色定位與預期價值產出',
        questions: [
          '為什麼組織需要這個角色？希望他主要解決什麼問題？',
          '這個角色最重要的服務或合作對象是誰？',
          '如果這個角色做得好，應該產生哪些具體成果或改變？',
          '如果沒有做到，最可能造成什麼影響？',
        ],
        responseHint: '可以從實際需求、過去經驗、期待改善的狀況或具體成果開始說明。此處不需要先整理文字，也不需要使用正式用語。',
        rawId: 'm3._raw_1_1', task: 'M3-01',
        outputs: [
          { id: 'm3.role_positioning', name: '角色定位', type: 'textarea', ai: 'AI-O',
            rule: '用一小段文字說明這個角色在組織中的功能、主要服務對象及存在理由。不使用口號或空泛形容詞，不把所有組織問題都塞入同一個角色。' },
          { id: 'm3.value_outputs', name: '預期價值產出', type: 'list', ai: 'AI-O',
            rule: '三至六項主要價值或成果，每項盡量說明產出後會帶來什麼改變。' },
        ],
        // 《3.職務與人才規格定位》1.1「產出至甄選流程設計書的內容」
        m5Outputs: [
          { id: 'm3.sel_value_evidence', name: '需要驗證的成果經驗', type: 'list', ai: 'AI-O' },
          { id: 'm3.sel_value_understanding', name: '候選人是否理解工作價值', type: 'list', ai: 'AI-O' },
          { id: 'm3.sel_outcome_criteria', name: '過去經驗與未來情境問題的成果判斷依據', type: 'list', ai: 'AI-O' },
        ],
      },
      {
        code: '1.2', title: '主要工作內容與頻率',
        questions: [
          '為了產生前述價值，這個角色平常要完成哪些主要工作？',
          '哪些工作由這個角色主要負責，哪些只是協助他人完成？',
          '哪些是核心工作，哪些是支援、行政或臨時性工作？',
          '各項工作大約多久發生一次，或約占多少工作時間？',
        ],
        responseHint: '可以依照一天、一週、一個月或一個完整專案的實際運作方式描述。若無法估算精確比例，可以先說明哪些工作最多、其次及偶爾發生。',
        rawId: 'm3._raw_1_2', task: 'M3-02',
        outputs: [
          { id: 'm3.work_items', name: '主要工作內容', type: 'repeat', ai: 'AI-O',
            rule: '「負責」代表需要對完成結果承擔主要責任；「協助」代表提供資訊或支援他人，不得寫成主要責任。採用百分比時總和應接近 100%，無法合理估算時不應硬填數字。',
            columns: [
              { key: 'work', name: '工作項目', type: 'text' },
              { key: 'responsibility_type', name: '責任區分', type: 'select', options: RESPONSIBILITY_TYPES },
              { key: 'nature', name: '工作性質', type: 'select', options: WORK_NATURE },
              { key: 'frequency_share', name: '頻率／時間占比', type: 'text', placeholder: '如 30% 或 每週' },
            ] },
        ],
        // 《3.職務與人才規格定位》1.2「產出至甄選流程設計書的內容」
        m5Outputs: [
          { id: 'm3.sel_key_experience', name: '需要驗證的關鍵工作經驗', type: 'list', ai: 'AI-O' },
          { id: 'm3.sel_work_sample', name: '適合採用工作樣本或實作測驗的內容', type: 'list', ai: 'AI-O' },
          { id: 'm3.sel_stage_scope', name: '各甄選階段需要了解的工作範圍', type: 'list', ai: 'AI-O' },
        ],
      },
      {
        code: '1.3', title: '組織關係、責任與專業決策範圍',
        questions: [
          '這個角色需要與哪些上級、下屬、平行角色及外部對象合作？',
          '在這些關係中，自己主要負責什麼、協助什麼？',
          '哪些專業事項可以自行判斷或決定？',
          '哪些事情必須回報、共同討論或取得授權？',
        ],
        responseHint: '請依照對上、對下、平行及對外關係描述。可以補充實際合作方式、容易混淆的責任，以及決策曾經卡住的地方。',
        rawId: 'm3._raw_1_3', task: 'M3-03',
        guard: '若出現「需要負責，但沒有相應資訊或授權」的狀況，應標示為待確認的組織設計問題，不能直接轉換成人才條件。',
        outputs: [
          { id: 'm3.organization_relations', name: '組織關係與權責範圍', type: 'fixedrows', ai: 'AI-O',
            rows: ['對上', '對下', '平行', '對外'], rowKey: 'aspect', rowName: '關係面向',
            columns: [
              { key: 'target', name: '主要對象', type: 'text' },
              { key: 'primary', name: '主要負責事項', type: 'text' },
              { key: 'support', name: '協助事項', type: 'text' },
              { key: 'decision', name: '專業決策範圍', type: 'text' },
              { key: 'escalation', name: '需要回報、協作或授權的情況', type: 'text' },
            ] },
        ],
      },
    ],
  },
  {
    code: 'ch2', title: '第二章　知識與判斷原則',
    purpose: '找出工作者要把第一章的工作做對，必須先理解哪些知識、看懂哪些訊號，以及依什麼原則做專業判斷。',
    sections: [
      {
        code: '2.1', title: '必要知識與學習可能性',
        questions: [
          '要開始做這份工作，哪些知識如果完全不知道，會很難安全或有效地工作？',
          '哪些知識只要核心基礎到位，可以在到職後透過訓練學會？',
          '哪些知識與資訊只有進入這個組織後才有機會接觸？',
          '如果候選人沒有完全相同的產業經驗，哪些相關知識或學習能力可以替代？',
        ],
        responseHint: '可以直接列舉知識、舉出曾經犯錯的例子，或說明一位外部人才最可能不知道什麼。此處不需要先分類。',
        rawId: 'm3._raw_2_1', task: 'M3-04',
        guard: '若現任人員具有非常特殊的能力，應先拆解其背後真正需要的核心知識，不得直接要求外部人才複製完全相同的經歷。',
        outputs: [
          { id: 'm3.prehire_knowledge', name: '到職前核心必備知識', type: 'list', ai: 'AI-O',
            rule: '缺乏時會直接影響基本工作、安全、法規或重大判斷，並說明為什麼必須在到職前具備。' },
          { id: 'm3.alternative_knowledge', name: '可接受的相關或替代知識', type: 'list', ai: 'AI-O',
            rule: '候選人沒有完全相同的產業經驗時，哪些相關知識或學習能力可以替代。不得要求外部人才複製完全相同的經歷。' },
          { id: 'm3.trainable_knowledge', name: '到職後可培訓知識', type: 'list', ai: 'AI-O',
            rule: '核心基礎到位後可透過課程、實作、導師或工作經驗補足。避免把可培訓內容設成不必要的招募門檻。' },
          { id: 'm3.organization_specific_knowledge', name: '組織特有知識', type: 'list', ai: 'AI-O',
            rule: '內部制度、產品、客戶、系統、歷史脈絡。組織應承擔合理的教育與交接責任。' },
        ],
      },
      {
        code: '2.2', title: '核心專業判斷',
        questions: [
          '這個角色面對哪些情況時，不能只照著固定程序做？',
          '做重要決定前，必須先看哪些資訊、訊號或限制？',
          '哪些判斷最容易出錯，或出錯後影響最大？',
          '什麼情況可以自行處理，什麼情況必須停止、回報或尋求協助？',
        ],
        responseHint: '可以描述實際案例、常見誤判、新手容易忽略的事情，以及成熟工作者會多看見哪些資訊。',
        rawId: 'm3._raw_2_2', task: 'M3-05',
        outputs: [
          { id: 'm3.core_judgments', name: '核心專業判斷', type: 'list', ai: 'AI-O',
            rule: '說明需要面對的判斷情境、應觀察的資訊，以及如何形成決定。' },
          { id: 'm3.work_principles', name: '重要工作原則', type: 'list', ai: 'AI-O',
            rule: '不同情況下可重複使用的判斷原則。避免只寫「憑經驗」或「看情況」。' },
          { id: 'm3.high_risk_escalations', name: '高風險判斷與升級條件', type: 'list', ai: 'AI-O',
            rule: '哪些錯誤可能造成重大成本、法律、安全、客戶或聲譽風險；什麼情況必須停止、覆核或向上升級。' },
        ],
      },
      {
        code: '2.3', title: '知識與判斷等級', isAnchor: true,
        questions: [
          '初學者通常只知道什麼，最容易在哪裡誤判？',
          '能獨立工作的成熟工作者，可以做到哪些判斷？',
          '更高階的工作者，能否整合複雜資訊、改善標準或建立新的判斷框架？',
          '這個職務最低需要到哪一級，理想上需要到哪一級？為什麼？',
        ],
        responseHint: '請先描述新手、成熟工作者及高階工作者的差異，不必自行拆成五級。AI 會根據口述內容補成連續的五級行為。',
        rawId: 'm3._raw_2_3', task: 'M3-08',
        guard: '不以年資、學歷、職稱或知道多少術語直接判定等級。每一級應呈現理解深度、獨立判斷、例外處理及影響範圍的差異。',
        outputs: [
          { id: 'm3.knowledge_anchors', name: '知識與判斷五級錨點', type: 'anchors', ai: 'AI-I', itemName: '知識或判斷項目' },
        ],
      },
    ],
  },
  {
    code: 'ch3', title: '第三章　工具與技術方法',
    purpose: '將「使用什麼工具」與「運用什麼技術方法」分開，理解工作者如何把工作實際完成。',
    sections: [
      {
        code: '3.1', title: '工具與系統',
        questions: [
          '這份工作最常使用哪些軟體、系統、設備、儀器或表單？',
          '使用這些工具要做到什麼程度，才能獨立完成工作？',
          '哪些工具可以替代或到職後學習，哪些必須事前熟悉？',
        ],
        responseHint: '可以依工作流程描述使用工具的時機、用途、操作難度與常見錯誤，不需要先整理清單。',
        rawId: 'm3._raw_3_1', task: 'M3-06',
        guard: '不得把單一品牌工具寫成硬性要求，除非工作確實無法以其他工具經驗替代。',
        outputs: [
          { id: 'm3.required_tools', name: '到職前需要具備的工具能力', type: 'list', ai: 'AI-O', rule: '說明使用情境及需要達到的程度。' },
          { id: 'm3.alternative_tools', name: '可接受替代經驗的工具', type: 'list', ai: 'AI-O', rule: '說明可以用哪些相近工具或可轉移能力替代。' },
          { id: 'm3.trainable_tools', name: '到職後可學習的工具', type: 'list', ai: 'AI-O', rule: '說明合理的訓練方式及學習難度。' },
        ],
      },
      {
        code: '3.2', title: '專業技術與工作方法',
        questions: [
          '除了會使用工具，工作者還需要掌握哪些專業方法或操作技術？',
          '這些方法用來解決什麼問題，適用於哪些情況？',
          '哪些技術需要反覆練習，才能維持品質與穩定性？',
          '遇到例外或工具受限時，成熟工作者如何調整方法？',
        ],
        responseHint: '可以描述實際操作、使用方法的理由、品質要求，以及曾經需要改變方法的情況。',
        rawId: 'm3._raw_3_2', task: 'M3-06',
        outputs: [
          { id: 'm3.professional_methods', name: '必要專業技術', type: 'list', ai: 'AI-O', rule: '說明技術用在哪項工作及需要產生什麼結果。' },
          { id: 'm3.work_methods', name: '主要工作方法', type: 'list', ai: 'AI-O', rule: '說明方法的適用情境、關鍵步驟及品質要求。' },
          { id: 'm3.exception_methods', name: '例外處理與替代方法', type: 'list', ai: 'AI-O', rule: '說明情況改變時如何調整，而不是只會照固定流程操作。' },
        ],
      },
      {
        code: '3.3', title: '工具與技術熟練等級', isAnchor: true,
        questions: [
          '新手使用這些工具或方法時，通常需要哪些協助？',
          '什麼表現代表已經能獨立、穩定完成工作？',
          '高階工作者是否能調整、整合、改善方法或建立標準？',
          '這個職務最低與理想需要到哪一級？',
        ],
        responseHint: '請描述具體速度、品質、獨立程度、例外處理與改善能力，不需要自行拆成五級。',
        rawId: 'm3._raw_3_3', task: 'M3-08',
        guard: '不以使用年數直接判定熟練程度。每一級應呈現操作獨立性、品質穩定度、例外處理及改善能力的差異。',
        outputs: [
          { id: 'm3.tool_anchors', name: '工具與技術五級錨點', type: 'anchors', ai: 'AI-I', itemName: '工具或技術項目' },
        ],
      },
    ],
  },
  {
    code: 'ch4', title: '第四章　專業態度與工作原則',
    purpose: '理解工作者如何看待品質、責任、倫理與專業價值，以及這些認知如何表現在實際行為中。',
    sections: [
      {
        code: '4.1', title: '專業品質與責任',
        questions: [
          '這份工作最不能犧牲的品質或價值是什麼？',
          '什麼樣的成果才真的可以交付，而不只是形式上完成？',
          '速度、成本、品質與風險發生衝突時，應如何取捨？',
          '發現錯誤時，成熟工作者應如何說明、修正與承擔結果？',
        ],
        responseHint: '可以描述曾經不能交件的情況、品質取捨、錯誤處理或對結果負責的實際案例。',
        rawId: 'm3._raw_4_1', task: 'M3-07',
        guard: '避免只寫「細心、負責、有責任感」，必須轉成實際情境與行為。',
        outputs: [
          { id: 'm3.quality_requirements', name: '專業品質要求', type: 'list', ai: 'AI-O', rule: '說明成果需要達到的品質及判斷方式。' },
          { id: 'm3.error_responsibility', name: '責任與錯誤處理原則', type: 'list', ai: 'AI-O', rule: '說明發現問題後應採取的行動、回報及後續追蹤。' },
          { id: 'm3.tradeoff_principles', name: '重要取捨原則', type: 'list', ai: 'AI-O', rule: '說明面對時間、成本、品質或風險衝突時如何做選擇。' },
        ],
      },
      {
        code: '4.2', title: '專業倫理與不可妥協原則',
        questions: [
          '這份工作有哪些事情即使能快速達成結果，也不能做？',
          '有哪些法律、保密、安全、公平、誠信或利益衝突要求？',
          '遇到主管、客戶或同事提出不合理要求時，應如何處理？',
          '哪些錯誤可以學習修正，哪些行為會直接破壞信任？',
        ],
        responseHint: '可以描述灰色地帶、兩難情境、曾經發生的風險，或一位成熟專業者應如何守住底線。',
        rawId: 'm3._raw_4_2', task: 'M3-07',
        guard: '應區分真正的法律或倫理底線，以及主管個人偏好或服從期待。',
        outputs: [
          { id: 'm3.ethics_nonnegotiables', name: '專業倫理與底線', type: 'list', ai: 'AI-O', rule: '說明不可接受的行為及其原因。' },
          { id: 'm3.gray_area_principles', name: '灰區判斷原則', type: 'list', ai: 'AI-O', rule: '說明規則未涵蓋時，工作者應依什麼原則判斷。' },
          { id: 'm3.escalation_required', name: '必須回報或升級的情況', type: 'list', ai: 'AI-O', rule: '說明何時不能自行承擔或私下處理。' },
        ],
      },
      {
        code: '4.3', title: '專業認知成熟等級', isAnchor: true,
        questions: [
          '不成熟的工作者通常如何看待規則、品質、責任與錯誤？',
          '能獨立工作的成熟專業者，會展現哪些穩定行為？',
          '高階工作者是否能處理兩難、守住原則並影響他人？',
          '這個職務最低與理想需要到哪一級？',
        ],
        responseHint: '請描述不同成熟程度的認知與行為差異，不需要先自行拆成五級。',
        rawId: 'm3._raw_4_3', task: 'M3-08',
        guard: '真正不可妥協的倫理或安全紅線應另外標示，不能由其他高分補償。',
        outputs: [
          { id: 'm3.attitude_anchors', name: '專業態度五級錨點', type: 'anchors', ai: 'AI-I', itemName: '專業態度或工作原則' },
        ],
      },
    ],
  },
];

/* ── 第五章　組織合作、溝通與人才成熟度 ─────────────────
   五個維度，各含定義、泛用五級參考、核心引導問題。
   最低／理想等級與理由一律由人工決定（H）。 */
export const MATURITY_DIMENSIONS = [
  {
    code: '5.1', name: '自主性與學習驅動',
    definition: '面對未知或變動時，工作者能否主動行動、學習、調整做法，並逐步承擔更大的工作自主性。',
    generic: {
      L1: '需要明確指令、步驟及持續提醒才會行動。',
      L2: '能完成熟悉工作，遇到例外或超出範圍時會等待指示。',
      L3: '能主動改善工作，並為目前工作需要進行有計畫的學習。',
      L4: '在目標模糊或沒有前例時，能自行定義目標、跨域學習並推進工作。',
      L5: '能建立促進他人自主與學習的制度、方法或文化。',
    },
    questions: [
      '這個職務需要工作者在多不明確的情況下自行推進工作？',
      '工作內容變動多快，需要多強的主動學習與調整能力？',
      '為什麼這個職務需要你選擇的最低與理想等級？',
    ],
  },
  {
    code: '5.2', name: '複雜問題解決',
    definition: '面對資訊不完整、多重原因或利益衝突時，工作者能否釐清真正問題、整合資訊並形成可執行的解法。',
    generic: {
      L1: '難以辨識問題原因，容易怪罪外部、放棄或把問題丟回他人。',
      L2: '能處理重複問題，主要套用舊經驗；方法失效後容易停滯。',
      L3: '能收集資訊、分析主要原因、提出替代方案並預估直接影響。',
      L4: '能處理模糊、跨領域及利益衝突問題，使分析與執行同時落地。',
      L5: '能重新定義問題，建立制度或系統，降低問題重複發生。',
    },
    questions: [
      '這個職務面對的問題通常有多複雜、多模糊或多高風險？',
      '工作者只需要處理問題，還是需要重新定義問題、建立制度？',
      '為什麼這個職務需要你選擇的最低與理想等級？',
    ],
  },
  {
    code: '5.3', name: '團隊協作與影響力',
    definition: '工作者能否傾聽、表達、處理分歧、交換資訊，並在不同角色之間推進共同成果。',
    generic: {
      L1: '只關注自身邊界，不願分享資訊，容易把不同意見視為攻擊。',
      L2: '在分工清楚時願意配合；面對分歧或跨部門合作時較被動。',
      L3: '能傾聽、清楚表達觀點、處理一般分歧並維持工作推進。',
      L4: '能在沒有直接職權下整合不同立場，引導形成可執行共識。',
      L5: '能整合組織內外多方資源，處理結構性衝突並建立長期合作。',
    },
    questions: [
      '這個職務需要與多少不同角色合作，彼此的利益與專業差異有多大？',
      '工作者只需要配合分工，還是需要主動協調、影響或引導他人？',
      '為什麼這個職務需要你選擇的最低與理想等級？',
    ],
  },
  {
    code: '5.4', name: '情緒韌性與不確定性耐受',
    definition: '面對壓力、批評、變動或資訊不明時，工作者能否調整情緒、維持判斷、適當求助並持續工作。',
    generic: {
      L1: '面對變動或批評容易陷入防禦、抱怨或停擺，明顯影響工作。',
      L2: '在穩定環境中可以工作；劇烈變動時需要較長時間適應。',
      L3: '能察覺並調整情緒，在一般壓力與變動下維持工作及合作。',
      L4: '在高風險與資訊不完整時仍能保持判斷，並把挫折轉化為改善。',
      L5: '在重大危機或集體焦慮時，能穩定團隊並協助恢復行動。',
    },
    questions: [
      '這個職務平常會面對多大的壓力、變動、批評或資訊不完整？',
      '工作者只需管理自己，還是也需要穩定團隊與協助他人前進？',
      '為什麼這個職務需要你選擇的最低與理想等級？',
    ],
    note: '不要把正常情緒、單次反應或身心狀況直接視為人格缺陷。',
  },
  {
    code: '5.5', name: '商業敏捷與價值交付',
    definition: '工作者能否理解工作對客戶、使用者或組織的價值，並依成果、成本、時效與外部變化調整行動。',
    generic: {
      L1: '專注自己完成的形式，無法說明工作對使用者或組織有何作用。',
      L2: '以完成交辦為終點，較少確認是否產生實際成果。',
      L3: '理解職務目標，能依價值、時間與資源調整工作優先順序。',
      L4: '能辨識高價值任務、停止低效工作，並依外部變化調整資源。',
      L5: '能建立新的價值來源、服務模式或工作方式，改變組織運作。',
    },
    questions: [
      '這個職務需要多深入理解客戶、使用者、成本或組織目標？',
      '工作者只需完成交辦，還是需要自行調整優先順序、停止無效工作或創造新價值？',
      '為什麼這個職務需要你選擇的最低與理想等級？',
    ],
  },
];

/**
 * 第五章的規則（PO 釐清，2026-07-21）
 *   - 成熟度**五個維度全填**，不是只挑核心的。
 *   - 職務說明書 6.5：五個維度**全部都要寫**，但只寫「需要具備的內容與想法」，**不放等級**。
 *   - 甄選流程設計書表格三：五個維度都列，含 L1–L5 與最低／理想（等級只出現在這裡）。
 *   - **只有 JD 對外文案**才從五個裡挑三個，改寫成情境化的「期待的工作特質」。
 */
export const JD_TRAIT_COUNT = 3;
export const MATURITY_FILL_NOTE = '五個維度都要填寫。職務說明書會寫入全部五個（不含等級）；等級進甄選流程設計書表格三；對外 JD 再從中挑三個。';

// 第五章 AI 彙整產出的守則（照抄正式文件 5.6）
export const MATURITY_RULES = [
  '使用本職務的真實情境改寫行為錨點，不能只複製泛用定義。',
  '最低與理想等級必須有工作理由。',
  '不因為職稱高或薪資高，就把所有維度都設為 L5。',
  '程度超過職務需要時，先列為面試核對事項，不能直接判定不適任。',
  '區分到職前必備與可以透過教練、訓練或任務發展的能力。',
];

// 三張錨點表的欄位 ID（供 M5 表格三合併使用）
export const ANCHOR_FIELD_IDS = ['m3.knowledge_anchors', 'm3.tool_anchors', 'm3.attitude_anchors'];

/**
 * 表格三：各職能的行為定錨等級（甄選流程設計書），欄位依《5.甄選流程設計書》。
 *
 * 重要（PO 釐清 2026-07-21）：**L1–L5 每一格的內容本身就是「行為特徵」**，
 * 也就是行為錨定等級（BARS, Behaviorally Anchored Rating Scales）。
 * 不需要、也不應該另立一個獨立的「行為特徵」欄位——那會變成重複。
 *
 * 等級只出現在這張表；職務說明書不放等級。
 * 人才成熟度五個維度也一併列入這張表。
 */
export const ANCHOR_TABLE_COLUMNS = [
  { key: 'competency',    name: '職能名稱' },
  { key: 'definition',    name: '職能定義' },
  { key: 'L1', name: 'L1' }, { key: 'L2', name: 'L2' }, { key: 'L3', name: 'L3' },
  { key: 'L4', name: 'L4' }, { key: 'L5', name: 'L5' },
  { key: 'minimum_level', name: '最低可接受等級' },
  { key: 'ideal_level',   name: '理想適任等級' },
];
export const BARS_NOTE = 'L1–L5 每一格填的就是該等級的可觀察行為特徵（行為錨定等級 BARS）。';

/** 攤平 M3 所有小節（供進度計算、逐節渲染） */
export function m3Sections() {
  return M3_CHAPTERS.flatMap(ch => ch.sections.map(s => ({ ...s, chapter: ch.title })));
}

/** 一節的全部產出欄位（職務說明書 ＋ 甄選流程設計書） */
export function sectionOutputs(s) {
  return [...(s.outputs || []), ...(s.m5Outputs || [])];
}

/** M3 全部 AI 產出欄位 */
export function m3OutputFields() {
  return m3Sections().flatMap(sectionOutputs);
}

/* ═══════════ M4 職務說明書（依《4.職務說明書》）═══════════ */

// 一、職務基本資料 — 由組織直接填寫，不由 AI 推論
export const M4_BASIC_INFO_FIELDS = [
  { key: 'job_title',    name: '職務名稱',     type: 'text' },
  { key: 'department',   name: '所屬部門／單位', type: 'text' },
  { key: 'report_to',    name: '直屬主管職務', type: 'text' },
  { key: 'is_manager',   name: '是否管理人員', type: 'select', options: ['否', '是'] },
  { key: 'manage_count', name: '預計管理人數', type: 'text' },
  { key: 'location',     name: '工作地點',     type: 'text' },
  { key: 'work_mode',    name: '工作模式',     type: 'select', options: ['現場', '遠距', '混合', '其他'] },
  { key: 'employment',   name: '僱用形式',     type: 'select', options: ['全職', '兼職', '約聘', '專案合作', '其他'] },
  { key: 'work_hours',   name: '工作時間',     type: 'text' },
  { key: 'salary_range', name: '薪酬範圍',     type: 'text' },
];

// 七大章節，來源對應《3.職務與人才規格定位》的最終轉換規格
export const M4_SECTIONS = [
  { key: 'basic',     title: '一、職務基本資料', source: 'H' },
  { key: 'role',      title: '二、角色定位',     source: ['m3.role_positioning'] },
  { key: 'value',     title: '三、預期價值產出', source: ['m3.value_outputs'] },
  { key: 'work',      title: '四、主要工作內容', source: ['m3.work_items'] },
  { key: 'relations', title: '五、組織關係與權責範圍', source: ['m3.organization_relations'] },
  { key: 'fit',       title: '六、適任條件', subsections: [
      { key: '6.1', title: '6.1 必要知識', source: ['m3.prehire_knowledge', 'm3.trainable_knowledge', 'm3.organization_specific_knowledge'] },
      { key: '6.2', title: '6.2 工具與專業技術', source: ['m3.required_tools', 'm3.professional_methods', 'm3.work_methods', 'm3.alternative_tools', 'm3.trainable_tools'] },
      { key: '6.3', title: '6.3 核心專業判斷與工作原則', source: ['m3.core_judgments', 'm3.work_principles', 'm3.high_risk_escalations', 'm3.exception_methods'] },
      { key: '6.4', title: '6.4 專業品質、責任與倫理', source: ['m3.quality_requirements', 'm3.error_responsibility', 'm3.ethics_nonnegotiables', 'm3.tradeoff_principles', 'm3.gray_area_principles'] },
      // 只放「選為核心的特質 ＋ 描述」，不放等級（等級一律在甄選流程設計書表格三）
      { key: '6.5', title: '6.5 組織合作、溝通與人才成熟度', source: ['m3.maturity_anchors'], levelsExcluded: true },
    ] },
  { key: 'confirm',   title: '七、文件確認', source: 'H' },
];

// 七、文件確認
export const M4_CONFIRMATIONS = [
  { key: 'manager', name: '職務主管確認' },
  { key: 'hr',      name: '招募／人力資源確認' },
  { key: 'other',   name: '其他共同確認者' },
];

// 職務說明書不放的內容（正式文件明訂）
export const M4_EXCLUSIONS = '完整行為錨點、面試題目與評分標準不放入職務說明書。';

/* ═══════════ M5 甄選流程設計書（依《5.甄選流程設計書》）═══════════ */

export const M5_PROCESS_TABLE = {
  id: 'm5.process_steps', name: '表格一：甄選流程設計', ai: 'AI-I', task: 'M5-01',
  rule: '每一環節需有明確目的；不同角色只負責自己有能力觀察與判斷的事項。',
  columns: [
    { key: 'step', name: '流程名稱', type: 'text' },
    { key: 'role', name: '負責角色', type: 'text' },
    { key: 'task', name: '負責任務', type: 'text' },
    { key: 'focus', name: '甄選重點', type: 'text' },
  ],
};

// 候選人流程說明資訊 — 由組織直接確認，不由 AI 補造
export const M5_CANDIDATE_INFO_FIELDS = [
  { key: 'duration',  name: '整體流程與預計完成期間', type: 'text' },
  { key: 'format',    name: '各階段形式、地點或使用工具', type: 'textarea' },
  { key: 'prep',      name: '候選人需要事前準備的內容', type: 'textarea' },
  { key: 'stage_time', name: '各階段預計時間', type: 'text' },
  { key: 'notify',    name: '結果或下一步的通知方式與時間', type: 'text' },
];

export const M5_QUESTION_TABLE = {
  id: 'm5.interview_questions', name: '表格二：各職能對應的結構化面試問題', ai: 'AI-I', task: 'M5-02',
  rule: '每道問題必須對應職能、行為錨點及使用階段；所有候選人接受一致的核心問題與主要追問。',
  columns: [
    { key: 'stage', name: '使用階段', type: 'text' },
    { key: 'competency', name: '職能名稱', type: 'text' },
    { key: 'qtype', name: '問題類型', type: 'select', options: ['過去經驗', '未來情境'] },
    { key: 'question', name: '核心問題', type: 'text' },
    { key: 'followup', name: '結構化追問', type: 'text' },
    { key: 'evidence', name: '需要取得的行為證據', type: 'text' },
    { key: 'level', name: '對應等級', type: 'select', options: LEVELS },
  ],
};

export const M5_OVERPERFORMANCE_FIELDS = [
  { key: 'competency', name: '職能名稱', type: 'text' },
  { key: 'risk',       name: '可能出現的風險', type: 'text' },
  { key: 'check',      name: '需要透過面試核對的事項', type: 'text' },
  { key: 'acceptable', name: '可接受或可調整的條件', type: 'text' },
];

export const M5_TRAINING_GAP_FIELDS = [
  { key: 'competency', name: '職能名稱', type: 'text' },
  { key: 'gap',        name: '到職時可接受的缺口', type: 'text' },
  { key: 'period',     name: '預計補足的程度與期間', type: 'text' },
  { key: 'support',    name: '組織提供的訓練或支持', type: 'text' },
];

export const M5_CONFIRMATIONS = [
  { key: 'manager', name: '職務主管確認' },
  { key: 'hr',      name: '招募／人力資源確認' },
  { key: 'other',   name: '其他面試角色確認' },
];

/* ═══════════ M6 JD 對外文案（依《6.JD對外文案》）═══════════ */

/**
 * 《6.JD對外文案》的句型模板。JD 是填空句型，不是自由造句——
 * AI 需把上游內容套進這些句型，維持對外文案的一致語氣。
 */
export const M6_COMPETENCY_TEMPLATES = [
  '你具備{知識}相關知識，能夠{做到什麼}。',
  '你能使用{工具}，完成{什麼工作}。',
  '你能運用{方法}方法，處理{什麼問題}。',
  '面對{情境}時，你能依{判斷依據}做出判斷。',
  '你能維持{品質標準}的品質，並在發現問題時{處理方式}。',
];

export const M6_TRAIT_TEMPLATES = [
  '面對{情況}的情況，你能主動{行為}。',
  '遇到{問題類型}類型的問題時，你會{行為}。',
  '與{對象}合作時，你能{行為}。',
  '面對變動、壓力或資訊不完整時，你能{行為}。',
  '你能理解工作與{價值對象}的關係，並依{依據}調整行動。',
];

// 四、面試流程的句型（doc 6）
export const M6_PROCESS_TEMPLATES = {
  overall: '整體流程：預計包含 {階段數} 個階段，整體約於 {期間} 內完成。',
  stage: '第{序}階段｜{階段名稱}：由{負責角色}進行，主要會{任務}；預計需要{時間}。',
  prep: '事前準備：{內容}（若不需要，請明確寫「無」）。',
  notify: '結果通知：預計於 {期間} 內通知結果或下一步安排。',
};

export const M6_SECTIONS = [
  { id: 'm6.role_positioning', name: '一、角色定位', type: 'textarea', ai: 'AI-O',
    rule: '取自職務說明書，使用一至兩段描述。' },
  { id: 'm6.work_items', name: '二、工作內容', type: 'list', ai: 'AI-O',
    rule: '取自職務說明書，以條列呈現，保留責任區分與頻率／占比標示。' },
  { id: 'm6.minimum_competencies', name: '三之1、我們需要你具備的職能', type: 'list', ai: 'AI-O',
    rule: '整合職務說明書適任條件與甄選最低可接受等級，只保留到職底線。' },
  { id: 'm6.work_traits', name: '三之2、我們期待你具備的工作特質', type: 'list', ai: 'AI-O',
    rule: '將第五章與甄選行為錨點改寫成工作情境及可觀察行為，不公開 L1–L5。' },
  { id: 'm6.interview_process', name: '四、面試流程', type: 'list', ai: 'AI-O',
    rule: '取自甄選流程及候選人流程說明資訊，含階段、負責角色、預計時間、事前準備與結果通知。' },
];

export const M6_FORBIDDEN = '不得公開完整題目、行為錨點、內部評分方式、表現過度風險或組織內部敏感資訊。';

// 對外揭露檢查（QA-02）
export const DISCLOSURE_FORBIDDEN = [
  { key: 'full_questions',   label: '完整面試題目' },
  { key: 'anchors_l1l5',     label: 'L1–L5 行為錨點' },
  { key: 'internal_scoring', label: '內部評分方式／最低等級代碼' },
  { key: 'risk_hypotheses',  label: '表現過度風險假設' },
  { key: 'sensitive',        label: '組織內部敏感資訊' },
];

/* ═══════════ 正式輸出前的 AI 檢查（M3 文件第四節）═══════════ */
export const PRE_OUTPUT_CHECKS = [
  '有明確口述或上游文件依據的內容。',
  '由 AI 推論、需要使用者確認的內容。',
  '尚無法建立行為錨點的內容。',
  '彼此矛盾的要求，例如要求高度自主卻不提供授權。',
  '疑似來自主管偏好、單次負面經驗或不合理組織設計的條件。',
  '對外必備要求是否高於甄選最低可接受等級。',
];

/* ═══════════ 最終檢核（M3 文件最末）═══════════ */
export const FINAL_CHECKLIST = [
  '前置問題、角色層級、任務邊界及組織責任已確認。',
  '所有回應區都可直接口述，不要求使用者先填表。',
  '主要負責、共同負責與協助工作已清楚區分。',
  '核心工作、支援工作及頻率或時間占比已整理。',
  '權責關係及行為特徵分級才使用表格。',
  '五個人才成熟度維度都已選定最低與理想等級並說明理由。',
  '未使用抽象人格標籤取代實際工作行為。',
  '三份輸出使用一致的職能名稱與責任邊界。',
  '對外 JD 只保留最低必要要求。',
  '表現過度風險仍需透過面試核對。',
  '已列出可接受培訓缺口及組織需要提供的支持。',
];

export function moduleFields(moduleCode) {
  switch (moduleCode) {
    case 'existing': return EXISTING_FIELDS;
    case 'm3': return m3OutputFields();
    case 'm6': return M6_SECTIONS;
    default: return [];
  }
}
