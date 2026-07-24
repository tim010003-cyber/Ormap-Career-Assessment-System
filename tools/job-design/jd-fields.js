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
  output:   { code: 'output',   title: '文件預覽',       subtitle: '四份獨立文件的完整預覽', group: GROUP_OUTPUT },
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
/**
 * 建立案例時要填的基本資料（PO 定案 2026-07-21）。
 * 案例名稱與本次優化目標已移除：前者由組織＋職務自動組成，後者在流程中自然會談到。
 */
/**
 * 外面（清單頁）建立／編輯時填的基本資訊。順序即畫面順序。
 * - case.title（專案名稱）改為可編輯，留白時由「組織＋職務」自動命名。
 * - case.client_name（客戶名稱）放最後、選填：顧問專用欄位，學員留空即可。
 * - case.creator_role（建立人）不放這裡：只給內部文件用，建立時由登入者自動帶入。
 */
export const CASE_FIELDS = [
  { id: 'case.title',             name: '專案名稱',     type: 'text', required: false, ai: 'H', help: '選填；留白會自動用「組織＋職務」命名' },
  { id: 'case.created_date',      name: '建立日期',     type: 'date', required: true,  ai: 'H' },
  { id: 'case.organization_name', name: '組織名稱',     type: 'text', required: false, ai: 'H', help: '選填；真實企業請考慮匿名化' },
  { id: 'case.job_title_working', name: '職稱／職務名稱', type: 'text', required: false, ai: 'H', help: '選填；之後可再校準' },
  { id: 'case.client_name',       name: '客戶名稱',     type: 'text', required: false, ai: 'H', help: '選填；顧問專用，學員可留空' },
];

/** 專案手動狀態（獨立於評測流程的 overall_status，由使用者自己管理）。 */
export const PROJECT_STATUS = {
  not_started: '還沒開始',
  in_progress: '進行中',
  done: '已完成',
};
export const PROJECT_STATUS_ORDER = ['not_started', 'in_progress', 'done'];
export const projectStatusLabel = (s) => PROJECT_STATUS[s] || PROJECT_STATUS.in_progress;

// 既有職務盤點的追問（右欄給引導者用）
export const EXISTING_QUESTIONS = [
  '這個職務現在是誰在做？做多久了？',
  '他平常一天、一週實際在做哪些事？',
  '公司當初為什麼會有這個職務？',
  '做得好的時候，會產生什麼結果？',
  '現在運作上最卡的是什麼？',
  '最近有什麼期待改變了嗎？',
  '他手上有哪些資源？能自己決定什麼？什麼要往上報？',
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
    // 先問組織在做什麼、給市場什麼價值。這一段最後會成為「職務招募說明」的企業理念，
    // 也讓後面每一次整理都知道這是什麼樣的組織。
    code: '開場', title: '這個組織在做什麼', coreQuestion: '你們在做什麼？為什麼這件事對別人有價值？',
    rawId: 'm1._raw_ch0', task: 'M1-00',
    purpose: '讓後續整理知道這是什麼組織、服務誰、憑什麼被選擇；這段也會用在對外的招募說明上。',
    questions: [
      '你們是什麼樣的組織？主要在做什麼？',
      '服務的對象是誰？他們原本有什麼困難或需求？',
      '你們提供的價值是什麼？跟別人比起來，為什麼有人會選你們？',
      '有沒有什麼是你們特別在乎、不會妥協的？',
    ],
    responseHint: '講給一個完全不認識你們的人聽就好。不用寫成官網文案，之後會幫你整理。',
    outputs: [
      { id: 'm1.org_what', name: '組織在做什麼', type: 'textarea', ai: 'AI-O' },
      { id: 'm1.org_who', name: '服務對象與他們的需求', type: 'textarea', ai: 'AI-O' },
      { id: 'm1.org_value', name: '提供的價值與被選擇的理由', type: 'textarea', ai: 'AI-O' },
      { id: 'm1.org_beliefs', name: '在乎的事與不妥協的原則', type: 'list', ai: 'AI-O' },
    ],
  },
  {
    code: '第一章', title: '需求觸發與現況', coreQuestion: "最近發生了什麼事，讓你覺得這件事需要被處理？", rawId: 'm1._raw_ch1', task: 'M1-01',
    purpose: '整理組織為什麼在這個時間點開始投入資源，以及目前實際發生了什麼；若增員已經確認，保留這項決策並補上背景即可。',
    questions: [
      '最近發生了什麼事情，讓你開始覺得這件事需要被處理？',
      '現在具體看見哪些異常、延誤、損失、抱怨、機會或工作卡點？',
      '問題通常在什麼情境、流程階段或對象身上出現；已經持續多久？',
      '哪些內容已有資料、紀錄或多人觀察支持，哪些仍只是感受或推測？',
    ],
    responseHint: '可以從工作量增加、交付延誤、品質下降、客戶反映、人員離開、新服務啟動，或企業主長期被特定工作綁住等具體事件開始。沒有數字也可以先說明實際案例；如果不確定，保留空白比猜測更有幫助。',
    guard: '忠實區分已確認的增員決策、仍在探索的想法與 AI 補充角度；任何一種都可以保留並繼續。',
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
    code: '第二章', title: '問題定義與成因假設', coreQuestion: "真正卡住的是什麼？", rawId: 'm1._raw_ch2', task: 'M1-02',
    purpose: '把表面症狀拆成可以處理的問題，辨識真正卡住的是工作量、能力、流程、工具、管理、激勵、商業或組織結構，而不是把所有問題都歸因於個人。',
    showProblemTypes: true,
    questions: [
      '目前是沒有人做、做不完、做不好，還是做事的方法與決策機制有問題？',
      '如果明天多一個人報到，但流程、工具、權責與管理方式都不變，哪些問題會改善，哪些仍然不會？',
      '眼前看見的問題，可能是哪個更上游問題的結果；不同問題之間可能如何互相影響？',
      '目前主要問題與次要問題分別是什麼；哪些成因已確認，哪些仍只是待驗證假設？',
    ],
    responseHint: '可以同時提出多種可能，不需要現在就選出唯一答案。請說明為什麼會這樣判斷、有哪些反例或不同看法，以及問題曾經暫時消失後又重新出現的情況。',
    guard: '時間先後、可能原因與人格描述可原樣保留；AI 若提供另一種解讀，需標示為補充角度而非裁決。',
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
    code: '第三章', title: '問題尺度、影響與不處理代價', coreQuestion: "這個問題影響多大？不處理會怎樣？", rawId: 'm1._raw_ch3', task: 'M1-03',
    purpose: '確認問題影響的範圍、持續時間與嚴重程度，並區分重要程度與時間敏感性。',
    questions: [
      '這個問題影響哪些人、客戶、部門、成果或決策；範圍正在縮小、穩定還是擴大？',
      '這是偶發問題、週期性問題，還是持續發生的組織問題？',
      '如果未來三至六個月不處理，最可能發生哪些具體後果？',
      '有沒有不能延後處理的期限、法規、安全、客戶或商業時機？',
    ],
    responseHint: '可以從營收、成本、客戶、品質、工時、離職、企業主時間、商機、商譽、安全及合規風險說明。若無法估算金額，可以先描述影響方式、持續程度與嚴重性。',
    guard: '可視需要分別記錄緊急程度與重要程度；未能區分時仍保留原始回應並繼續。',
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
    code: '第四章', title: '改善目標', coreQuestion: "希望從什麼狀況，改善成什麼狀況？", rawId: 'm1._raw_ch4', task: 'M1-04',
    purpose: '把問題轉成清楚的改善目標，說明希望從什麼狀況改變成什麼狀況，而不先指定解法。',
    questions: [
      '如果問題獲得合理改善，哪些現象、成果或風險應該發生改變？',
      '最低可以接受的改善結果是什麼，理想結果又是什麼？',
      '可以透過哪些觀察、資料或事件，確認改善真的發生，而不只是多做了事情？',
      '哪些期待不屬於這次處理範圍，或不應由單一方案承擔？',
    ],
    responseHint: '請使用「從什麼狀況改善成什麼狀況」描述。此處先定義結果，不需要決定由誰做、購買什麼工具或採用哪一種合作形式。',
    guard: '若使用者以「招到人」「完成導入」描述成果，先忠實保留，再提供可選的結果變化追問。',
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
    code: '第五章', title: '投入判斷與下一步', coreQuestion: "這件事值得投入嗎？下一步要做什麼？", rawId: 'm1._raw_ch5', task: 'M1-05',
    purpose: '確認這個問題是否值得繼續投入、組織願意承擔哪些資源，以及是否具備進入解法設計的最低資訊。',
    questions: [
      '這個問題若被改善，可能帶來哪些價值、避免哪些代價？',
      '組織目前願意投入哪些時間、預算、管理注意力與協作資源；有哪些不可妥協的限制？',
      '哪些條件或資訊尚未具備，可能使這次投入無法成功？',
      '現在應進入解法設計、先補充資訊、暫緩處理，還是決定不投入？為什麼？',
    ],
    responseHint: '可以說明可接受的投入範圍、不能犧牲的條件、現有資源及管理限制。無法估算投資報酬時，不需要硬填金額。不同角色看法不一致時，可以分別保留。',
    guard: '可提醒管理、訓練、溝通、工具及轉換成本；沒有依據時留白。不同意見或矛盾並列保留，由使用者決定是否建立職務。',
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
  '增員若已由使用者確認，保留為決策背景；若仍在探索，再並列其他可能解法。',
  '缺乏依據的成本、時程或緊急程度。',
  '需要補充資料後才能進入解法設計的事項。',
];

export const M1_FINAL_CHECKLIST = [
  '已保留使用者確認的增員決策；若有具體觸發事件，也一併記錄。',
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
   M2 職務需求界定書（依《2.職務需求界定書》v2.0）
   結構還原自原始設計稿：兩層分類 × 每類引導問題 × 決策表
   （選擇／方案／條件／原因跟後續行動）× 檢核提醒 × 合作形式決策。
   ═══════════════════════════════════════════════════════ */

/**
 * 一個解法類別：引導問題 + 決策表
 * 決策表一格一格填（PO 釐清 2026-07-21）：
 *   勾選 ｜ 條件（系統提供的判斷鷹架）｜ 原因（為什麼選它）｜ 後續行動（接下來做什麼）
 * 「條件」是預先寫好的提示，用意是降低思考負擔——全部留白對使用者負擔太大。
 */
const optionSet = (code, title, coreQuestion, purpose, questions, rawId, optionsId, options, reminder) =>
  ({ code, title, coreQuestion, purpose, questions, rawId, optionsId, options, reminder });

export const M2_CATEGORY_A = optionSet(
  'A', '工作與流程改善',
  "這些工作本身，被合理設計了嗎？", '處理「事情本身是否被合理設計」。',
  [
    '這些工作真的都需要做嗎？',
    '哪些工作沒有產生足夠價值？',
    '工作量大，是因為事情太多，還是流程反覆、資訊不清？',
    '是否有人一直重做、等待或協調同一件事情？',
    '如果流程不改，再增加一個人會不會只是多一個人一起混亂？',
    '哪些工作可以由系統、工具或更清楚的規則取代？',
  ],
  'm2._raw_a', 'm2.strategies_a',
  [
    { name: '刪除低價值、重複或已失去必要性的工作', when: '該工作的內容沒有任何對於團隊或是業務帶來幫助' },
    { name: '重整工作流程，建構工作流程', when: '過往都沒有整理工作流程，在教育新人或是在工作時容易反覆重新思考' },
    { name: '釐清跨部門權責與交付標準', when: '不知道團隊合作的界線在哪裡，容易特定工作者會越做越多，造成工作量不平衡' },
    { name: '建構文件模板或導入系統化工具與自動化', when: '已經有工作流程了，但作業文件跟系統不符合業務流程與需求' },
    { name: '暫停、刪除或調整低效益的會議、產品、服務或專案', when: '該會議、產品、服務或專案，明顯增加的是成本，難以讓企業感覺到有意義' },
  ]);

export const M2_CATEGORY_B = optionSet(
  'B', '人員配置與管理改善',
  "在已確認的人力方向下，現有人員與管理安排還需要補上什麼？", '整理現有人員、分工與管理方式，作為增員後能順利合作的背景。',
  [
    '增員方向已確認時，現有人員還有哪些分工或產出情況值得一起記錄？',
    '工作是否交給了能力、經驗或角色不適合的人？',
    '是否有少數員工長期替其他人補位、收尾或承擔額外責任？',
    '主管是否有清楚分工、設定目標、提供回饋與處理績效問題？',
    '員工表現不佳，是能力不足、意願不足、角色不適合，還是缺乏管理與資源支持？',
    '現有人員承擔的責任增加後，薪酬、職等、授權與資源是否同步調整？',
    '如果再增加一個人，現有主管是否有能力管理、培養與合理分配工作？',
    '問題是否來自不適任員工或主管長期占用編制，導致其他成員持續承擔成本？',
  ],
  'm2._raw_b', 'm2.strategies_b',
  [
    { name: '重新分工、內部輪調或調整角色配置', when: '工作分配與成員能力不相符；部分人工作過量、部分人無法發揮；角色之間有重疊或空缺' },
    { name: '建立更明確的管理與績效改善機制', when: '工作目標、品質標準或責任不清；主管缺乏固定回饋；問題長期存在但未被正式處理' },
    { name: '提供教育訓練、工作指導或必要資源', when: '員工具有發展意願與基礎能力，但缺乏知識、方法、工具或實務指導' },
    { name: '調整薪資、職等、獎勵、授權或工作範圍', when: '現有人員已實質承擔更高責任或產生更高價值，但待遇、權限與職務定位未同步調整' },
    { name: '調整主管職責、管理關係或主管配置', when: '問題主要來自主管分工失當、決策反覆、缺乏管理能力，或持續造成團隊耗損與人才流失' },
    { name: '評估轉任、調整職務，或依法處理不適任人員與主管', when: '已提供合理期待、支持與改善機會，但仍無法達到職務要求；或持續對團隊與營運造成重大負擔' },
  ]);

export const M2_CATEGORY_C = optionSet(
  'C', '引入外部專業與彈性人力',
  "這個需求，一定要養一個人嗎？", '處理「組織需要額外能力，但未必適合立即建立長期正式編制」。',
  [
    '這項需求是一次性、階段性，還是長期持續發生？',
    '公司真正需要的是固定工時，還是特定成果與專業判斷？',
    '工作內容是否能清楚定義範圍、交付成果與驗收標準？',
    '這項專業的使用頻率，是否足以聘用一位全職人員？',
    '是否可以先用外部合作測試需求，再決定是否建立正式職務？',
    '工作是否涉及大量內部機密、即時協作或長期組織知識累積？',
    '外部合作完成後，哪些知識、流程與資料需要留在公司？',
    '公司內部由誰負責提出需求、協作、驗收與管理合作關係？',
  ],
  'm2._raw_c', 'm2.strategies_c',
  [
    { name: '尋求單次顧問諮詢或專業診斷', when: '問題尚未釐清，不確定需要增加人力、改善流程，還是調整策略；需要外部觀點協助判斷' },
    { name: '採用專案型或按件計酬合作', when: '工作範圍與成果可明確定義；需求屬短期、階段性或非固定頻率，不需長期留任一位員工' },
    { name: '採用固定週期的外包、顧問或彈性人力', when: '需求會持續出現，但工作量尚不足以形成全職職務；需要定期取得專業服務或執行支援' },
    { name: '委託專業公司、代理商或外部團隊承接', when: '需求需要多項專業、完整設備或成熟流程，公司自行建立團隊的成本與時間過高' },
    { name: '先由外部專業者建置，再移轉給內部人員', when: '公司缺乏初期設計與建置能力，但相關流程、知識或系統未來需要由內部長期維運' },
  ],
  '外部合作不只是「把事情丟出去」，仍需有人負責定義需求、提供資訊、做出決策與驗收成果。建議要有一定程度的專業窗口，進行需求釐清與專業分工，並確認合約協議，避免雙方落差太大。');

export const M2_CATEGORY_D = optionSet(
  'D', '增加內部人力與正式編制',
  "這個需求，需要有人長期在組織內承擔嗎？", '處理「需求具有持續性，需要由組織內部長期承擔、累積知識與建立責任歸屬」。',
  [
    '這項工作是否會長期、穩定且高頻率地發生？',
    '工作量是否足以形成一個合理而完整的職務？',
    '這個角色是否需要持續參與內部會議、決策與跨部門合作？',
    '是否需要長期累積公司的產品、客戶、流程與產業知識？',
    '組織缺的是執行人力、專業判斷，還是管理與整合能力？',
    '這些工作適合由一個人承擔，還是其實需要兩種以上不同專業？',
    '新人進入後，原有流程、分工與權責是否也需要同步調整？',
    '誰負責新人到職後的管理、訓練、回饋與成果驗收？',
    '公司是否能提供與要求相符的薪資、工具、權限與發展空間？',
    '這是一個合理職務，還是把各部門不想處理的工作集中給一個人？',
  ],
  'm2._raw_d', 'm2.strategies_d',
  [
    { name: '增加部分工時、定期或試行性人力', when: '工作需求固定但尚不足以形成全職工作量；或需求仍在驗證，需要先觀察實際工作內容與效益' },
    { name: '增加全職執行型人力', when: '工作高頻、持續且可建立明確流程與標準；現有團隊確實缺乏足夠時間與執行容量' },
    { name: '增加全職專業型人力', when: '工作需要持續的專業判斷、問題解決與知識累積，外包難以即時支援或無法形成內部能力' },
    { name: '增設管理、專案整合或跨部門協調角色', when: '問題不是單純缺乏執行人力，而是缺少優先順序、資源整合、決策、分工與進度管理' },
    { name: '分階段增加多個角色或建立小型團隊', when: '問題同時包含策略、專業與執行需求，無法合理集中在一位「全能人才」身上' },
    { name: '增加人力並同步重整流程與既有分工', when: '工作量確實增加，但原有流程與權責也存在問題；單純找人無法完整解決根本原因' },
  ],
  '增加正式編制不只是支付一份薪資，也代表公司需要投入管理、訓練、協作、工具與長期發展成本。');

/** 合作形式清單。參考表與配置表的下拉選單共用同一份，避免兩邊講法不一致。 */
export const ENGAGEMENT_FORMS = [
  '全職正職', '部分工時／定期人力', '專案型／按件計酬',
  '固定週期外包／顧問', '委託專業公司／團隊', '外部建置後移轉',
];

// 合作形式的取捨（第四部分參考表）
export const ENGAGEMENT_TRADEOFFS = [
  { form: '全職正職', fit: '需求長期穩定、需累積內部知識、需參與決策與跨部門協作', cost: '招募、管理、訓練、薪酬與長期發展成本；調整彈性低' },
  { form: '部分工時／定期人力', fit: '需求固定但不足以形成全職工作量', cost: '投入時間有限，複雜任務不易承擔' },
  { form: '專案型／按件計酬', fit: '範圍與交付可明確定義、需求短期或階段性', cost: '需要清楚的需求定義與驗收；知識不易留存' },
  { form: '固定週期外包／顧問', fit: '需求持續但量不足以養全職；需要定期專業服務', cost: '長期累積下來未必比正職便宜；仰賴外部排程' },
  { form: '委託專業公司／團隊', fit: '需要多項專業、完整設備或成熟流程', cost: '成本較高；客製彈性較低' },
  { form: '外部建置後移轉', fit: '缺乏初期建置能力，但未來需由內部維運', cost: '需安排移轉與內部承接的人與時間' },
];

/**
 * 職務需求界定 ＝ 原始設計稿的「第二部分：解法組合與資源配置」。
 * 只包含四類解法（第一類 A／B、第二類 C／D）與最後的合作形式整合決策。
 * 先前版本額外掛上的「承接上游問題／角色層級判斷／人才任務範圍」，
 * 來自中間那份被壓平的 md，非原稿內容，已移除。
 */
export const M2_PARTS = [
  { code: '第一類', title: M2_CATEGORY_A.title, coreQuestion: M2_CATEGORY_A.coreQuestion,
    note: '這一類不一定增加總人數，而是重新檢查現有的工作、制度、人員與管理方式，是否能更有效地運作。',
    categories: [M2_CATEGORY_A] },
  { code: '第一類', title: M2_CATEGORY_B.title, coreQuestion: M2_CATEGORY_B.coreQuestion,
    categories: [M2_CATEGORY_B] },
  { code: '第二類', title: M2_CATEGORY_C.title, coreQuestion: M2_CATEGORY_C.coreQuestion,
    note: '當既有流程、人員配置與管理方式改善後，仍存在明確的工作量或專業缺口，再評估從外部取得能力，或增加內部人力。',
    categories: [M2_CATEGORY_C] },
  { code: '第二類', title: M2_CATEGORY_D.title, coreQuestion: M2_CATEGORY_D.coreQuestion,
    categories: [M2_CATEGORY_D] },
  {
    /*
     * 這一節原本只有五格空白 textarea 加一份勾選清單，等於要人憑空把
     * 「幾個正職、幾個兼職、外包多少錢」一次想清楚再寫出來，思考負擔太重，
     * 實際使用時多半只寫得出幾句籠統的話。（2026-07-22 使用者回饋）
     *
     * 改成跟其他章節一致的節奏：先口述 → AI 整合成量化配置表 → 人再改數字。
     * AI 先把基礎內容填好，回應者是在既有草稿上修正，不是從零開始估算。
     */
    code: '整合決策', title: '合作形式與資源配置', coreQuestion: '綜合起來，要用什麼方式承擔？',
    note: '前面勾選的方案可能同時成立——例如一位正職加上一位接案者，或同時委託多位不同專業的外部夥伴。這裡要把它們整合成一個可執行的決定，並且實際估算一次要投入多少人與多少錢。',
    questions: [
      '前面勾選的方案，是要綜合採用，還是擇一？為什麼？',
      '如果綜合採用，各自負責哪一塊？彼此如何分工與銜接？',
      '整體的工作量，大概需要幾個人承擔？其中幾個要是正職？',
      '哪些部分適合用部分工時、專案型或外包來處理？各需要幾個人？',
      '本次可投入的預算大約是多少？要怎麼分配？',
      '選擇正職代表的是一整個團隊的建構（招募、管理、訓練、發展），組織目前準備好了嗎？',
      '選擇外部合作，誰負責定義需求、對接與驗收？',
      '如果先用外部合作測試，什麼條件成立時才轉為正式編制？',
    ],
    showTradeoffs: true,
    rawId: 'm2._raw_mix', task: 'M2-05',
    purpose: '把前面勾選的方案整合成一個可執行、可估算的人力與資源配置。',
    responseHint: '用講的就好，不用先算清楚。講講你打算怎麼配人、哪幾塊想找誰做、預算大概抓多少，AI 會幫你整理成一張可以直接改數字的配置表。',
    blocks: [
      { type: 'fields', fields: [
        { id: 'm2.resource_plan', name: '人力與資源配置表', type: 'repeat', ai: 'AI-I',
          note: '一列一種合作形式。數字先由 AI 依你講的內容估一個起點，直接改成你認為合理的值即可；成本可以填月薪、時薪、專案報價或總額，寫得出單位就好。',
          columns: [
            { key: 'form',  name: '合作形式', type: 'select', options: ENGAGEMENT_FORMS },
            { key: 'count', name: '人數',     type: 'text', placeholder: '例：1 人' },
            { key: 'scope', name: '負責範圍', type: 'text', placeholder: '這一塊主要承擔什麼' },
            { key: 'cost',  name: '預估成本', type: 'text', placeholder: '例：月薪 4.5 萬／專案 8 萬' },
          ] },
        { id: 'm2.engagement_mix', name: '預計採用的合作形式組合', type: 'textarea', ai: 'AI-O' },
        { id: 'm2.engagement_split', name: '各自負責的範圍與分工', type: 'textarea', ai: 'AI-O' },
        { id: 'm2.budget_plan', name: '可投入的預算範圍與分配方式', type: 'textarea', ai: 'AI-O' },
        { id: 'm2.prerequisite_improvements', name: '增加人才前必須先完成的改善', type: 'textarea', ai: 'AI-I' },
        { id: 'm2.decision_reason', name: '決策理由', type: 'textarea', ai: 'AI-O' },
      ] },
      { type: 'checklist', title: '人力策略結論', id: 'm2.staffing_decision',
        options: [
          '先改善現有環境，暫不增加人才。',
          '先使用外部或彈性資源測試需求。',
          '需要新增內部人力。',
          '需要人力與其他改善策略同步進行。',
          '採用混合形式（正職與外部資源並行）。',
          '目前無法判斷，需要進一步諮詢。',
        ] },
    ],
  },
];


export const M2_ALL_CATEGORIES = [M2_CATEGORY_A, M2_CATEGORY_B, M2_CATEGORY_C, M2_CATEGORY_D];


// AI 整理原則（doc 2）
export const M2_AI_RULES = [
  '只根據勾選及補充內容整理，不自行補造問題、策略或職務。',
  '若勾選結果互相矛盾，先列出矛盾，不急著產出職務建議。',
  '若使用者已明確確認增員、招募或合作方向，忠實保留為決策背景，不要求先推翻或重證是否需要人。',
  '若增員仍在探索，且第二類（C、D）有勾選、第一類（A、B）尚未留下內容，可把既有資源檢視列為可選補充。',
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
  M2_PARTS.forEach(p => {
    (p.blocks || []).forEach(b => {
      if (b.type === 'checklist') ids.push(b.id);
      else (b.fields || []).forEach(f => ids.push(f.id));
    });
    // 解法類別：口述回應 + 方案選擇 + 每個方案的「原因跟後續行動」
    (p.categories || []).forEach(cat => { ids.push(cat.rawId, cat.optionsId, cat.optionsId + '_notes'); });
  });
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
        // 依原始設計稿還原：先問「產出什麼結果」，而不是先問角色定位
        code: '1.1', title: '結果與價值',
        coreQuestion: "這項工作最後會產出什麼？",
        questions: [
          '這項工作最後通常會產出什麼？是一份文件、一個決定、一項服務，還是一個完成的事件？',
          '最後有哪些人會收到或使用這個成果？',
          '做完之後，什麼事情會因此改變？',
          '有沒有數量、時間或交付要求？',
          '如果做錯，通常會發生什麼？',
        ],
        responseHint: '這裡先記錄結果，還不急著討論「為什麼這樣才算好」。可以直接說實際發生過的事。',
        rawId: 'm3._raw_1_1', task: 'M3-01',
        outputs: [
          { id: 'm3.concrete_outputs', name: '具體產出與實際結果', type: 'list', ai: 'AI-O',
            rule: '這項工作實際交付出來的東西，以及最後收到或使用它的人。' },
          { id: 'm3.observable_changes', name: '可觀察的變化', type: 'list', ai: 'AI-O',
            rule: '做完之後什麼事情因此改變；有數量、時間或交付要求時一併記錄。變化不限於數字——服務對象變得更安心、更信任，或流程變順、下一棒更好接手，都算可觀察的變化。' },
          { id: 'm3.error_consequences', name: '錯誤可能造成的後果', type: 'list', ai: 'AI-O',
            rule: '做錯時通常會發生什麼，作為後續判斷風險與品質要求的依據。' },
          { id: 'm3.role_positioning', name: '角色定位', type: 'textarea', ai: 'AI-O',
            rule: '依前述結果，用一小段文字說明這個角色在組織中的功能與存在理由。不使用口號或空泛形容詞，不把所有組織問題都塞入同一個角色。' },
          { id: 'm3.value_outputs', name: '預期價值產出', type: 'list', ai: 'AI-O',
            rule: '三至六項主要價值或成果，每項盡量說明產出後會帶來什麼改變。'
              + '**價值不只有具體交付物。**至少同等看待這三類，他講到哪類就整理哪類，不要只留下看得見、摸得到的產出：'
              + '（一）情緒與體驗價值——服務對象變得更安心、更被理解、更信任、更願意再回來或推薦；'
              + '（二）流程與賦能價值——建立了可複製的做法、留下文件或教材、讓下一棒或整個團隊接手更順；'
              + '（三）具體交付與成效——完成的文件、決定、服務、事件，以及數量時效品質上的改變。'
              + '他花很多篇幅在講感受或流程時，那就是他認為的主要價值，照實整理，不要因為它不是一件實體產出就縮短或略過。' },
        ],
        guard: '「預期價值產出」要涵蓋他真正在乎的價值，包含情緒體驗（讓人更安心、更信任）與流程賦能（建立可複製流程、文件、讓後續更順），不要只挑得出具體交付物的部分整理。',
        m5Outputs: [
          { id: 'm3.sel_value_evidence', name: '需要驗證的成果經驗', type: 'list', ai: 'AI-O' },
          { id: 'm3.sel_value_understanding', name: '候選人是否理解工作價值', type: 'list', ai: 'AI-O' },
          { id: 'm3.sel_outcome_criteria', name: '過去經驗與未來情境問題的成果判斷依據', type: 'list', ai: 'AI-O' },
        ],
      },
      {
        // 依原始設計稿還原：重點是「還原實際流程」，不是列工作清單
        code: '1.2', title: '工作流程',
        coreQuestion: "接到這項工作後，實際上會做哪些事？",
        questions: [
          '接到這項工作後，通常要做哪些事情？可以按照先後順序說一次嗎？',
          '中間會經過哪些環節？哪些是你自己完成、哪些需要別人共同處理？',
          '會接觸哪些人、資訊、文件、產品或系統？',
          '這是每天、每週、每月，還是不定期發生？通常發生在什麼情況下？',
          '哪一個環節占用最多時間？如果沒有人處理，會發生什麼？',
        ],
        responseHint: '請照實際做事的順序講一次就好。不需要先分類，也不用估精確比例。',
        rawId: 'm3._raw_1_2', task: 'M3-02',
        // 此階段刻意避免的提問（原始設計稿）：能力、判斷理由、最佳做法、
        // 新手與高手差異、人格特質、態度——那些留到第二至五章。
        avoid: ['你需要什麼能力？', '你為什麼這樣判斷？', '哪一種做法最好？', '新手與高手差在哪裡？', '要有什麼人格特質？', '你覺得什麼態度最重要？'],
        outputs: [
          { id: 'm3.work_steps', name: '主要步驟與順序', type: 'list', ai: 'AI-O',
            rule: '照實際發生的先後順序還原，讓人看得出這份工作怎麼開始、怎麼進行、怎麼結束。' },
          { id: 'm3.work_items', name: '主要工作項目', type: 'repeat', ai: 'AI-O',
            rule: '「負責」代表需要對完成結果承擔主要責任；「協助」代表提供資訊或支援他人，不得寫成主要責任。採用百分比時總和應接近 100%，無法合理估算時不應硬填數字。',
            columns: [
              { key: 'work', name: '工作項目', type: 'text' },
              { key: 'responsibility_type', name: '責任區分', type: 'select', options: RESPONSIBILITY_TYPES },
              { key: 'nature', name: '工作性質', type: 'select', options: WORK_NATURE },
              { key: 'frequency_share', name: '頻率／時間占比', type: 'text', placeholder: '如 30% 或 每週' },
            ] },
          { id: 'm3.collaboration_items', name: '需要協作的內容', type: 'list', ai: 'AI-O',
            rule: '哪些環節需要別人共同處理，以及與誰。' },
          { id: 'm3.data_objects', name: '使用或處理的資料與物件', type: 'list', ai: 'AI-O',
            rule: '工作中會接觸的人、資訊、文件、產品或系統。' },
        ],
        m5Outputs: [
          { id: 'm3.sel_key_experience', name: '需要驗證的關鍵工作經驗', type: 'list', ai: 'AI-O' },
          { id: 'm3.sel_work_sample', name: '適合採用工作樣本或實作測驗的內容', type: 'list', ai: 'AI-O' },
          { id: 'm3.sel_stage_scope', name: '各甄選階段需要了解的工作範圍', type: 'list', ai: 'AI-O' },
        ],
      },
      {
        code: '1.3', title: '組織關係、責任與專業決策範圍',
        coreQuestion: "這項工作由誰負責？可以自己決定到什麼程度？",
        questions: [
          '這個角色需要與哪些上級、下屬、平行角色及外部對象合作？',
          '在這些關係中，自己主要負責什麼、協助什麼？',
          '哪些專業事項可以自行判斷或決定？',
          '哪些事情必須回報、共同討論或取得授權？',
        ],
        responseHint: '請依照對上、對下、平行及對外關係描述。可以補充實際合作方式、容易混淆的責任，以及決策曾經卡住的地方。',
        rawId: 'm3._raw_1_3', task: 'M3-03',
        guard: '「主要對象」可以有多個，用「、」分隔。「主要負責事項」一格寫完：負責什麼、可以自己決定到什麼程度、什麼情況要回報或取得授權——不要再拆成協助事項、決策範圍、回報條件那種細欄。他沒講到的細節就不要補。',
        outputs: [
          // 現場討論時拆到五欄反而難整理：協助事項少用到、專業決策範圍常寫得太細。
          // 只留「面向」與「主要對象」，其餘全部收進「主要負責事項」，讓它一格寫得完整。
          { id: 'm3.organization_relations', name: '組織關係與權責範圍', type: 'fixedrows', ai: 'AI-O',
            rows: ['對上', '對下', '平行', '對外'], rowKey: 'aspect', rowName: '關係面向',
            columns: [
              { key: 'target', name: '主要對象', type: 'text',
                placeholder: '可以有多個，用「、」分開', multi: true },
              { key: 'primary', name: '主要負責事項', type: 'text', wide: true,
                placeholder: '負責什麼、可以自己決定到什麼程度、什麼情況要回報' },
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
        coreQuestion: "要把剛才那些工作做對，腦中需要先知道什麼？",
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
        coreQuestion: "遇到不同情況時，要根據什麼做判斷？",
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
        code: '2.3', title: '知識與判斷等級',
        coreQuestion: "新手、成熟的人、高手，在這件事上差在哪裡？", isAnchor: true,
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
        coreQuestion: "知道要做什麼之後，實際上用什麼把它做出來？",
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
        coreQuestion: "除了會用工具，還需要掌握哪些方法？",
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
        code: '3.3', title: '工具與技術熟練等級',
        coreQuestion: "什麼程度算是可以獨立作業了？", isAnchor: true,
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
        coreQuestion: "做這項工作時，你最重視什麼？",
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
        coreQuestion: "這份工作有哪些事情不能做？",
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
        code: '4.3', title: '專業認知成熟等級',
        coreQuestion: "成熟的工作者，跟不成熟的差在哪裡？", isAnchor: true,
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
    note: '正常情緒、單次反應或身心狀況，建議與人格特質分開看待。',
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

/**
 * 合作形式（PO 定案 2026-07-21）
 * 這套工具不預設一定是長期僱用。同一份職務規格也可能交給接案者、
 * 短期專案人力或顧問承擔，因此選項涵蓋僱傭與非僱傭兩類。
 */
export const ENGAGEMENT_TYPES = [
  { group: '僱傭關係', options: ['全職', '兼職', '約聘／定期契約'] },
  { group: '非僱傭關係', options: ['接案／外包', '短期專案', '顧問／諮詢', '實習／建教', '其他'] },
];
export const ENGAGEMENT_OPTIONS = ENGAGEMENT_TYPES.flatMap(g => g.options);

// 一、職務基本資料 — 由組織直接填寫，不由 AI 推論
export const M4_BASIC_INFO_FIELDS = [
  { key: 'job_title',    name: '職務名稱',     type: 'text' },
  { key: 'engagement',   name: '合作形式',     type: 'select', options: ENGAGEMENT_OPTIONS,
    help: '不一定是長期僱用；接案、短期專案或顧問合作也適用這套規格。' },
  // 一份職務說明書常常要招不只一個人（助教、工讀、接案夥伴），
  // 所以人數與同時在職人數要分開問，不能假設一份規格＝一個人。
  { key: 'headcount',    name: '這次要招幾人',   type: 'text',
    help: '例如：2 人、3～5 人、視報名人數而定。同一份規格可以用來招多位夥伴。' },
  { key: 'concurrent',   name: '同時在職人數',   type: 'text',
    help: '旺季與淡季不同時可以分開寫，例如：旺季 5 人、平時 1 人。' },
  { key: 'department',   name: '所屬部門／單位', type: 'text' },
  { key: 'report_to',    name: '主要對接窗口', type: 'text', help: '僱傭關係填直屬主管；合作關係填對接窗口。' },
  { key: 'is_manager',   name: '是否帶人',     type: 'select', options: ['否', '是'] },
  { key: 'manage_count', name: '預計帶幾人',   type: 'text' },
  { key: 'location',     name: '工作地點',     type: 'text' },
  { key: 'work_mode',    name: '工作模式',     type: 'select', options: ['現場', '遠距', '混合', '其他'] },
  { key: 'work_hours',   name: '工作時間／投入量', type: 'text', help: '例如：每週 40 小時、每月 20 小時、單一專案約 3 個月。' },
  { key: 'salary_range', name: '報酬範圍',     type: 'text', help: '月薪、時薪、專案報價皆可。' },
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
  /*
   * 三個欄位是三條不同的軸，不要混：
   *   流程名稱＝**階段**（什麼時候做，有先後順序）
   *   負責任務＝**方法**（在這一關怎麼問、怎麼看，可以同時用好幾種）
   *   甄選重點＝**要看出什麼**
   *
   * 「結構化面試」不放進階段——那是「題目有沒有設計過」的品質描述，
   * 跨所有階段都成立。實作、情境題、團隊面談只要題目設計過，都是結構化面試。
   * 同理「情境演練」也不獨立成階段，它是方法之一。
   */
  columns: [
    { key: 'step', name: '階段', type: 'suggest', options: [
      '書面與經歷檢視', '初步聯繫／電話初談', '第一次面談', '第二次面談',
      '實作評估／試做', '團隊互動', '推薦人查核', '最終確認與條件談定',
    ] },
    { key: 'role', name: '負責角色', type: 'suggest', options: [
      '用人主管', '專案負責人／PM', '團隊資深成員', '既有夥伴（學長姐）',
      'HR／行政', '合作單位窗口', '外部顧問', '單位主管',
    ] },
    // 時長填在這裡就好，不必到候選人流程說明再問一次；不確定就留白
    { key: 'duration', name: '時長', type: 'suggest', options: [
      '15 分鐘', '30 分鐘', '45 分鐘', '1 小時', '1.5 小時', '2 小時', '半天', '一整天', '不需現場',
    ] },
    // 一關通常同時做好幾件事，所以是複選
    { key: 'task', name: '任務', type: 'multi', options: [
      '書面與經歷檢視', '行為事例訪談（過去經驗）', '情境判斷提問（未來情境）',
      '工作樣本評量', '實際帶班／試做觀察', '專業知識確認', '語言能力確認',
      '價值觀對談', '工作動機了解', '人才成熟度核對',
      '團隊合作觀察', '說明工作真實樣貌', '條件與期待對齊', '綜合評估與等級核對',
    ] },
    { key: 'focus', name: '甄選重點', type: 'multi', options: [
      '到職底線與必備條件', '核心職能與專業判斷', '工作品質與方法',
      '溝通與臨場反應', '責任感與可靠度', '面對變動與壓力的反應',
      '與團隊的合作方式', '價值觀是否相容', '投入動機與持續性',
      '最低可接受等級核對', '培訓缺口與補足計畫',
    ] },
  ],
};

// 候選人流程說明資訊 — 由組織直接確認，不由 AI 補造
/*
 * 候選人流程說明只留「流程表講不到的事」。
 * 期間、形式、地點、各階段時間都跟甄選流程設計表重複了，
 * 那些改成填在流程表每一列（多了「時長」欄），這裡不再問第二次。
 */
export const M5_CANDIDATE_INFO_FIELDS = [
  { key: 'prep', name: '候選人需要事前準備的內容', type: 'textarea',
    help: '例如：作品、成績單、可排班時段。沒有就留白。' },
  { key: 'notify_how', name: '結果通知方式', type: 'select',
    options: ['Email 通知', '電話通知', '簡訊通知', 'LINE 通知', '線上系統通知', '面談當場告知'] },
  { key: 'notify_when', name: '多久內回覆', type: 'select',
    options: ['三個工作天內', '一週內', '兩週內', '每階段結束後三天內', '流程全部結束後統一通知'] },
  { key: 'notify_note', name: '通知的補充說明', type: 'text',
    help: '想加一句就加，例如：未錄取也會回覆。' },
];

export const M5_QUESTION_TABLE = {
  id: 'm5.interview_questions', name: '表格二：各職能對應的結構化面試問題', ai: 'AI-I', task: 'M5-02',
  rule: '每道問題對應一項職能與一個行為錨點；所有候選人接受一致的核心問題與主要追問。',
  // 「使用階段」拿掉了——這張表本來就全部是結構化面試，多一欄只是佔位。
  columns: [
    { key: 'competency', name: '職能名稱', type: 'text' },
    { key: 'qtype', name: '問題類型', type: 'select', options: ['過去經驗', '未來情境'] },
    { key: 'question', name: '核心問題', type: 'text', wide: true },
    { key: 'followup', name: '結構化追問', type: 'text', wide: true },
    { key: 'evidence', name: '需要取得的行為證據', type: 'text', wide: true },
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
