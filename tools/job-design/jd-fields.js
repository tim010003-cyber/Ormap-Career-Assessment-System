/**
 * jd-fields.js — 職務設計與甄選 Web App｜欄位字典與引導題（完整規格）
 * =====================================================================
 * 單一真實來源。內容嚴格對齊課程正式工具文件：
 *   《3.職務與人才規格定位》《4.職務說明書》《5.甄選流程設計書》《6.JD對外文案》
 * 欄位 ID 對齊《02_欄位字典_v1》。核心引導問題、AI 轉換原則、專業邊界
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

export const MODULE_META = {
  m1:       { code: 'm1',       title: '問題釐清定位',     subtitle: '先確認問題，再談要不要找人', part: '第一部' },
  m2:       { code: 'm2',       title: '職務需求界定',     subtitle: '比較策略，判斷是否真的要增聘', part: '第二部' },
  existing: { code: 'existing', title: '既有職務基礎確認', subtitle: '路徑 B 起點：把既有職務講清楚', part: '第一部' },
  m3:       { code: 'm3',       title: '職務與人才規格定位', subtitle: '五章：12 節 ＋ 五維人才成熟度', part: '第二部' },
  m4:       { code: 'm4',       title: '職務說明書',       subtitle: '組織內部對齊角色、權責與適任條件', part: '正式輸出①' },
  m5:       { code: 'm5',       title: '甄選流程設計書',   subtitle: '流程、面試題、行為定錨與等級', part: '正式輸出②' },
  m6:       { code: 'm6',       title: 'JD 對外文案',      subtitle: '通過揭露檢查後才能發布', part: '正式輸出③' },
  output:   { code: 'output',   title: '預覽與下載',       subtitle: '四份獨立文件、記錄下載與關閉倒數', part: '輸出' },
};

export function partLabel(moduleCode, pathType) {
  const A = { m1: '第一部', m2: '第二部', m3: '第三部' };
  const B = { existing: '第一部', m3: '第二部' };
  const map = pathType === 'full_design' ? A : B;
  return map[moduleCode] || MODULE_META[moduleCode]?.part || '';
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

// ── existing.*：既有職務基礎確認（路徑 B，純人工）────────
export const EXISTING_FIELDS = [
  { id: 'existing.role_reason',          name: '職務存在理由',   type: 'textarea', required: true,  ai: 'U', help: '這個職務為什麼需要存在？解決什麼？' },
  { id: 'existing.expected_results',     name: '既有預期成果',   type: 'list',     required: true,  ai: 'U', help: '一條一個成果' },
  { id: 'existing.main_work',            name: '既有主要工作',   type: 'list',     required: true,  ai: 'U' },
  { id: 'existing.current_issues',       name: '現有職務問題',   type: 'list',     required: false, ai: 'U', help: '目前運作有什麼卡點' },
  { id: 'existing.changed_expectations', name: '正在改變的期待', type: 'textarea', required: false, ai: 'U' },
  { id: 'existing.resources_authority',  name: '現有資源與授權', type: 'textarea', required: true,  ai: 'U', help: '手上有哪些資源、能決定什麼、要往上報什麼' },
];

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

// 第五章 AI 彙整產出的守則（照抄正式文件 5.6）
export const MATURITY_RULES = [
  '使用本職務的真實情境改寫行為錨點，不能只複製泛用定義。',
  '最低與理想等級必須有工作理由。',
  '不因為職稱高或薪資高，就把所有維度都設為 L5。',
  '程度超過職務需要時，先列為面試核對事項，不能直接判定不適任。',
  '區分到職前必備與可以透過教練、訓練或任務發展的能力。',
];

// 三張錨點表的欄位 ID（供 M5 合併使用）
export const ANCHOR_FIELD_IDS = ['m3.knowledge_anchors', 'm3.tool_anchors', 'm3.attitude_anchors'];

/** 攤平 M3 所有小節（供進度計算、逐節渲染） */
export function m3Sections() {
  return M3_CHAPTERS.flatMap(ch => ch.sections.map(s => ({ ...s, chapter: ch.title })));
}

/** M3 全部 AI 產出欄位 */
export function m3OutputFields() {
  return m3Sections().flatMap(s => s.outputs);
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
      { key: '6.5', title: '6.5 組織合作、溝通與人才成熟度', source: ['m3.maturity_anchors'] },
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
