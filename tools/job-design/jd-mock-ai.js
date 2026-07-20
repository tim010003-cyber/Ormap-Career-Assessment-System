/**
 * jd-mock-ai.js — 職務設計與甄選 Web App｜Mock AI Provider（完整規格版）
 * =====================================================================
 * 以規則式方式模擬 AI 任務，完全不呼叫外部 API。輸出遵守
 * 《04_AI任務規格》共通輸出契約，轉換原則照抄《3.職務與人才規格定位》。
 *
 * 全域禁止（04 第四節 ＋ M3 文件各節守則）
 *   - 不把「缺人」當已證實問題；資訊不足不補造。
 *   - 推論一律進 inferences_requiring_confirmation。
 *   - 不自行設定最低／理想等級（一律人工 H）。
 *   - 不以年資、學歷、職稱或人格標籤代替可觀察行為。
 *   - 不把可培訓內容寫成必要先備條件。
 */

import { MATURITY_DIMENSIONS, RESPONSIBILITY_TYPES, WORK_NATURE } from './jd-fields.js';

function envelope(taskCode, over = {}) {
  return {
    task_code: taskCode, prompt_version: '1.0.0',
    explicit_content: [], organized_content: {},
    inferences_requiring_confirmation: [], information_gaps: [],
    contradictions: [], warnings: [],
    cannot_complete: false, cannot_complete_reason: null,
    ...over,
  };
}

/** 把口述切成語意條列（規則式，非 AI） */
function splitPoints(text) {
  if (!text) return [];
  return String(text)
    .split(/[\n;；。]+/)
    .map(s => s.replace(/^[\s、,，·\-\*\d\.]+/, '').trim())
    .filter(s => s.length >= 2);
}

const asList = v => Array.isArray(v) ? v.filter(x => (x ?? '').toString().trim()) : splitPoints(v);

/** 依關鍵字分派到多個桶；未命中者進 fallback 桶 */
function bucketize(points, rules, fallbackKey) {
  const out = {};
  Object.keys(rules).forEach(k => out[k] = []);
  out[fallbackKey] = out[fallbackKey] || [];
  for (const p of points) {
    let placed = false;
    for (const [key, re] of Object.entries(rules)) {
      if (re.test(p)) { out[key].push(p); placed = true; break; }
    }
    if (!placed) out[fallbackKey].push(p);
  }
  return out;
}

// ── PATH-01 既有職務資訊完整度檢查 ──────────────────────────
export function runPath01(existing) {
  const gaps = [];
  const required = [
    ['existing.role_reason', '職務存在理由'],
    ['existing.expected_results', '既有預期成果'],
    ['existing.main_work', '既有主要工作'],
    ['existing.resources_authority', '現有資源與授權'],
  ];
  for (const [fid, name] of required) {
    const v = existing[fid];
    const empty = v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');
    if (empty) gaps.push({ field: fid, message: `「${name}」尚未填寫，進入 M3 前建議補齊。` });
  }
  const contradictions = [];
  const resText = String(existing['existing.resources_authority'] || '');
  const issuesText = asList(existing['existing.current_issues']).join(' ');
  const noAuthority = /沒有授權|無權|不能決定|沒有.{0,4}決定權|無法調度|說了不算|要等.{0,6}裁示|需.{0,4}核可/.test(resText);
  const heldAccountable = /要負責|被要求負責|背責任|扛|承擔.{0,4}成敗/.test(issuesText);
  if (noAuthority && heldAccountable) {
    contradictions.push({
      type: 'authority_accountability',
      message: '偵測到「被要求負責結果」但「沒有相應決定權」的張力，這是典型的權責矛盾。',
      detail: '這類問題通常不是「找到對的人」就能解決；若直接進入職務規格，容易把組織的授權問題轉嫁成人才條件。',
      fields: ['existing.resources_authority', 'existing.current_issues'],
      suggestion: '建議由人決定：改走「完整職務設計（路徑 A）」重新界定需求，或維持路徑 B 並把此矛盾列為待課堂討論。系統不自行切換路徑，也不覆蓋你已填的資料。',
    });
  }
  return envelope('PATH-01', {
    organized_content: { readiness: gaps.length === 0 ? 'ready' : 'missing_information' },
    information_gaps: gaps, contradictions,
    warnings: contradictions.length ? ['出現權責矛盾提示，是否切換路徑由人工決定。'] : [],
  });
}

/* ═══════════ M3 逐節整理 ═══════════
   runSection(sectionCode, rawText, ctx) → envelope
   ctx: { existing, confirmed }（已確認上游，僅供 1.1 承接既有職務理由） */

export function runSection(sectionCode, rawText, ctx = {}) {
  const pts = splitPoints(rawText);
  const handler = SECTION_HANDLERS[sectionCode];
  if (!handler) return envelope(sectionCode, { cannot_complete: true, cannot_complete_reason: '未知的小節。' });
  if (pts.length === 0) {
    return envelope(sectionCode, { cannot_complete: true, cannot_complete_reason: '尚未提供本節的口述內容。' });
  }
  return handler(pts, ctx, rawText);
}

const SECTION_HANDLERS = {
  // 1.1 角色定位與預期價值產出
  '1.1': (pts, ctx) => {
    const positioning = ctx.existing?.['existing.role_reason']
      ? `${pts[0]}（承接既有職務存在理由）`
      : pts[0];
    const values = pts.slice(1).length >= 2 ? pts.slice(1) : pts;
    const gaps = [];
    if (values.length < 3) gaps.push({ field: 'm3.value_outputs', message: '預期價值產出少於三項，正式文件要求三至六項，建議補充。' });
    if (values.length > 6) gaps.push({ field: 'm3.value_outputs', message: '預期價值產出超過六項，建議合併或聚焦。' });
    return envelope('M3-01', {
      explicit_content: [{ field: 'm3.role_positioning', value: positioning, source: '1.1 口述' }],
      organized_content: { 'm3.role_positioning': positioning, 'm3.value_outputs': values.slice(0, 6) },
      information_gaps: gaps,
      warnings: ['角色存在理由屬人工確認項，請確認整理是否忠實，且未把所有組織問題塞入同一個角色。'],
    });
  },

  // 1.2 主要工作內容與頻率
  '1.2': (pts) => {
    const items = pts.map(p => ({
      work: p,
      responsibility_type: /協助|幫忙|支援他人/.test(p) ? '協助'
        : (/一起|共同|協同|跟.{1,6}一起/.test(p) ? '共同負責' : '主要負責'),
      nature: /行政|雜務|臨時|偶爾|支援/.test(p) ? '支援工作' : '核心工作',
      frequency_share: (p.match(/每[日天週月季年]|不定期|約\s*\d+\s*%/) || [''])[0],
    }));
    return envelope('M3-02', {
      organized_content: { 'm3.work_items': items },
      inferences_requiring_confirmation: [
        { field: 'm3.work_items', note: '「責任區分／工作性質」為 AI 初步推論，請逐項確認。「負責」代表要對結果承擔主要責任，「協助」不得寫成主要責任。' },
      ],
      information_gaps: [{ field: 'm3.work_items', message: '未提供的頻率／時間占比一律留空，未自動填數字。採用百分比時總和應接近 100%。' }],
    });
  },

  // 1.3 組織關係、責任與專業決策範圍
  '1.3': (pts) => {
    const rows = ['對上', '對下', '平行', '對外'].map(aspect => ({
      aspect, target: '', primary: '', support: '', decision: '', escalation: '',
    }));
    const pick = (re) => pts.filter(p => re.test(p));
    const assign = (idx, list) => {
      if (!list.length) return;
      rows[idx].target = (list[0].match(/[主管總經理老闆部門客戶廠商供應商團隊同事下屬]+/) || [''])[0];
      rows[idx].primary = list.filter(p => /負責|主導|決定/.test(p)).join('；');
      rows[idx].support = list.filter(p => /協助|支援|配合/.test(p)).join('；');
      rows[idx].decision = list.filter(p => /可以自行|自己決定|自行判斷|權限/.test(p)).join('；');
      rows[idx].escalation = list.filter(p => /回報|上報|核可|授權|裁示|討論/.test(p)).join('；');
    };
    assign(0, pick(/主管|總經理|老闆|上級|向上/));
    assign(1, pick(/下屬|部屬|團隊成員|帶人|新人/));
    assign(2, pick(/跨部門|平行|其他部門|同事|協調/));
    assign(3, pick(/客戶|廠商|供應商|外部|對外/));
    const empty = rows.filter(r => !r.target && !r.primary && !r.support);
    return envelope('M3-03', {
      organized_content: { 'm3.organization_relations': rows },
      inferences_requiring_confirmation: [
        { field: 'm3.organization_relations', note: '關係面向的歸類為 AI 推論，請逐列確認並補齊主要對象。' },
      ],
      information_gaps: empty.length ? [{ field: 'm3.organization_relations', message: `「${empty.map(r => r.aspect).join('、')}」關係尚未辨識到內容，請補充或標示不適用。` }] : [],
      warnings: ['若出現「需要負責，但沒有相應資訊或授權」，屬待確認的組織設計問題，不可直接轉成人才條件。'],
    });
  },

  // 2.1 必要知識與學習可能性
  '2.1': (pts) => {
    const b = bucketize(pts, {
      'm3.organization_specific_knowledge': /內部|我們公司|組織特有|自家|歷史|沿革|只有進來才/,
      'm3.trainable_knowledge': /可以教|到職後|可培訓|training|訓練|上手後|學得會/,
      'm3.prehire_knowledge': /必備|一定要|到職前|基本要求|不會就不行|先備/,
    }, 'm3.prehire_knowledge');
    return envelope('M3-04', {
      organized_content: b,
      inferences_requiring_confirmation: [
        { field: 'm3.prehire_knowledge', note: '「到職前必備 vs. 可培訓」為推論。可培訓內容不應被誤設為招募門檻，請確認。' },
      ],
      warnings: b['m3.prehire_knowledge'].length === 0 ? ['未辨識出明確的到職前先備門檻，請確認是否確實無先備要求。'] : [],
    });
  },

  // 2.2 核心專業判斷
  '2.2': (pts) => {
    const b = bucketize(pts, {
      'm3.high_risk_escalations': /風險|重大|法律|安全|停止|升級|不能自己|要回報|覆核/,
      'm3.work_principles': /原則|通常|一律|優先|標準是|規則/,
      'm3.core_judgments': /判斷|決定|評估|取捨|看情況/,
    }, 'm3.core_judgments');
    return envelope('M3-05', {
      organized_content: b,
      warnings: ['重要工作原則避免只寫「憑經驗」或「看情況」，請確認已轉成可重複使用的判斷原則。'],
    });
  },

  // 2.3 知識與判斷等級 → 錨點
  '2.3': (pts, ctx) => buildAnchors('m3.knowledge_anchors', pts, ctx, 'M3-08', '知識或判斷項目'),

  // 3.1 工具與系統
  '3.1': (pts) => {
    const b = bucketize(pts, {
      'm3.trainable_tools': /到職後|可以學|可培訓|進來再學/,
      'm3.alternative_tools': /類似|替代|相近|其他.{0,4}工具|同性質/,
      'm3.required_tools': /必須|一定要會|事前熟悉|到職前/,
    }, 'm3.required_tools');
    return envelope('M3-06', {
      organized_content: b,
      inferences_requiring_confirmation: [
        { field: 'm3.required_tools', note: '工具是否為硬性要求屬推論；除非確實無法以其他工具經驗替代，不得把單一品牌工具寫成硬性要求。' },
      ],
    });
  },

  // 3.2 專業技術與工作方法
  '3.2': (pts) => {
    const b = bucketize(pts, {
      'm3.exception_methods': /例外|變通|臨時|工具壞|不能用時|替代作法/,
      'm3.work_methods': /流程|步驟|方法|做法|SOP/,
      'm3.professional_methods': /技術|技巧|專業|能力/,
    }, 'm3.professional_methods');
    return envelope('M3-06', { organized_content: b });
  },

  // 3.3 工具與技術熟練等級 → 錨點
  '3.3': (pts, ctx) => buildAnchors('m3.tool_anchors', pts, ctx, 'M3-08', '工具或技術項目'),

  // 4.1 專業品質與責任
  '4.1': (pts) => {
    const b = bucketize(pts, {
      'm3.tradeoff_principles': /取捨|衝突|優先|寧可|犧牲/,
      'm3.error_responsibility': /錯誤|出錯|發現問題|修正|回報|承擔/,
      'm3.quality_requirements': /品質|標準|準確|正確|不能.{0,6}錯|交付/,
    }, 'm3.quality_requirements');
    return envelope('M3-07', {
      organized_content: b,
      warnings: ['避免只寫「細心、負責、有責任感」，必須轉成實際情境與行為。'],
    });
  },

  // 4.2 專業倫理與不可妥協原則
  '4.2': (pts) => {
    const b = bucketize(pts, {
      'm3.escalation_required': /回報|升級|不能自己|要告知|通報/,
      'm3.gray_area_principles': /灰色|模糊|沒規定|兩難|不確定時/,
      'm3.ethics_nonnegotiables': /不能|不得|絕不|底線|保密|誠信|個資|利益衝突/,
    }, 'm3.ethics_nonnegotiables');
    return envelope('M3-07', {
      organized_content: b,
      warnings: ['請確認已區分「真正的法律或倫理底線」與「主管個人偏好或服從期待」。'],
    });
  },

  // 4.3 專業認知成熟等級 → 錨點
  '4.3': (pts, ctx) => buildAnchors('m3.attitude_anchors', pts, ctx, 'M3-08', '專業態度或工作原則'),
};

/**
 * 依口述的「新手 / 成熟 / 高階」差異，補成連續五級行為。
 * 最低／理想等級一律留 null，交人工決定。
 */
function buildAnchors(fieldId, pts, ctx, task, itemName) {
  // 項目名稱優先取自已確認的上游（工作項目／知識／工具），否則用口述首句
  const src = ctx.anchorItems && ctx.anchorItems.length ? ctx.anchorItems : pts.slice(0, 4);
  const items = src.map(it => (typeof it === 'string' ? it : (it.name || it.work || ''))).filter(Boolean).slice(0, 6);
  if (!items.length) {
    return envelope(task, { cannot_complete: true, cannot_complete_reason: `尚無可建立錨點的${itemName}。` });
  }
  const anchors = items.map(name => ({
    competency: name,
    definition: '',
    L1: `對「${name}」認識有限，需逐步指導，容易在基本情境誤判。`,
    L2: `在既有指示與熟悉情境下可完成「${name}」，遇例外會等待指示。`,
    L3: `能獨立處理「${name}」的標準情境，並判斷何時需要求助。`,
    L4: `能處理「${name}」的模糊、跨領域或例外情境，並改善既有做法。`,
    L5: `能為「${name}」建立標準或框架，指導他人並承擔風險判斷。`,
    minimum_level: null,   // 人工 H
    ideal_level: null,     // 人工 H
  }));
  return envelope(task, {
    organized_content: { [fieldId]: anchors },
    inferences_requiring_confirmation: [
      { field: fieldId, note: 'L1–L5 為依口述推論的連續行為，最低／理想等級一律由人工確認，AI 不預設。' },
    ],
    warnings: ['不以年資、學歷、職稱或術語量判定等級；不得把所有項目都提高到 L5。'],
  });
}

/* ═══════════ 第五章 人才成熟度（M3-09）═══════════
   依各維度口述 + 泛用五級參考，改寫成本職務專屬錨點。 */
export function runMaturity(perDimensionRaw = {}) {
  const anchors = MATURITY_DIMENSIONS.map(d => {
    const raw = String(perDimensionRaw[d.code] || '').trim();
    const ctxNote = raw ? `依本職務情境：${splitPoints(raw)[0] || raw}` : '';
    const j = (generic) => raw ? `${generic}（${ctxNote}）` : generic;
    return {
      competency: d.name,
      why: '',                      // 為什麼需要 — 人工填
      L1: j(d.generic.L1), L2: j(d.generic.L2), L3: j(d.generic.L3),
      L4: j(d.generic.L4), L5: j(d.generic.L5),
      minimum_level: null, ideal_level: null,   // 人工 H
      _hasContext: !!raw,
    };
  });
  const noContext = anchors.filter(a => !a._hasContext).map(a => a.competency);
  return envelope('M3-09', {
    organized_content: { 'm3.maturity_anchors': anchors },
    inferences_requiring_confirmation: [
      { field: 'm3.maturity_anchors', note: '成熟度錨點由泛用定義改寫，最低／理想等級與理由一律由人工確認。' },
    ],
    information_gaps: noContext.length
      ? [{ field: 'm3.maturity_anchors', message: `「${noContext.join('、')}」尚未提供職務情境口述，目前仍是泛用定義，需補充後才算本職務專屬錨點。` }]
      : [],
    warnings: [
      '不因職稱高或薪資高就把所有維度設為 L5。',
      '程度超過職務需要時，先列為面試核對事項，不能直接判定不適任。',
    ],
  });
}

/* ═══════════ M4 職務說明書草稿 ═══════════ */
export function runM4(confirmed) {
  const required = ['m3.role_positioning', 'm3.value_outputs', 'm3.work_items'];
  const missing = required.filter(f => !confirmed[f]);
  if (missing.length) {
    return envelope('M4-01', {
      cannot_complete: true,
      cannot_complete_reason: 'M3 尚有未確認的必要欄位，無法組裝職務說明書。',
      information_gaps: missing.map(f => ({ field: f, message: '需先確認' })),
    });
  }
  return envelope('M4-01', {
    organized_content: { assembled: true },
    warnings: [
      '職務基本資料由組織直接填寫，不由 AI 推論。',
      '完整行為錨點、面試題目與評分標準不放入職務說明書。',
    ],
  });
}

/* ═══════════ M5 甄選流程設計書 ═══════════ */
export function runM5(confirmed) {
  const anchors = mergeAnchors(confirmed);
  const steps = [
    { step: '初步篩選', role: '招募／HR', task: '書面與經歷檢視', focus: '到職底線與動機' },
    { step: '結構化面試', role: '職務主管＋HR', task: '行為事例訪談', focus: '核心職能與專業判斷' },
    { step: '實作／情境', role: '團隊資深成員', task: '工作樣本或情境模擬', focus: '工作品質與方法' },
    { step: '最終確認', role: '單位主管', task: '綜合評估與等級核對', focus: '最低可接受等級核對' },
  ];
  const questions = anchors.flatMap(a => ([
    { stage: '結構化面試', competency: a.competency, qtype: '過去經驗',
      question: `請描述一次你實際處理「${a.competency}」的經驗，當時的情況、你的做法與結果。`,
      followup: '當時有哪些資訊不足或限制？你如何判斷要自己處理還是求助？',
      evidence: '能否獨立完成、面對例外情境的處理層級與求助時機。',
      level: a.minimum_level || '' },
    { stage: '實作／情境', competency: a.competency, qtype: '未來情境',
      question: `如果在「${a.competency}」上遇到時間更緊或資源更少的情況，你會怎麼調整？`,
      followup: '你會優先犧牲什麼、守住什麼？依據是什麼？',
      evidence: '取捨原則是否穩定，是否理解品質底線。',
      level: a.minimum_level || '' },
  ]));
  const noMin = anchors.filter(a => !a.minimum_level).map(a => a.competency);
  return envelope('M5-01..03', {
    organized_content: {
      'm5.process_steps': steps,
      'm5.interview_questions': questions,
      'm5.behavior_anchors': anchors,
    },
    inferences_requiring_confirmation: [
      { field: 'm5.process_steps', note: '流程、負責角色與任務為建議，最終流程由人工確認；各角色只負責自己有能力觀察與判斷的事項。' },
      { field: 'm5.interview_questions', note: '題目與評分用途需人工確認；所有候選人應接受一致的核心問題與主要追問。' },
    ],
    information_gaps: noMin.length ? [{ field: 'm5.behavior_anchors', message: `「${noMin.join('、')}」尚未設定最低可接受等級（人工項）。` }] : [],
    warnings: ['候選人流程說明資訊由組織直接確認，AI 不補造。'],
  });
}

/** 把三張 M3 錨點表合併成 M5 使用的職能錨點 */
export function mergeAnchors(confirmed) {
  return ['m3.knowledge_anchors', 'm3.tool_anchors', 'm3.attitude_anchors']
    .flatMap(fid => confirmed[fid] || []);
}

/* ═══════════ M6 JD 對外文案 ═══════════ */
export function runM6(confirmed, caseFields) {
  const anchors = mergeAnchors(confirmed);
  const maturity = confirmed['m3.maturity_anchors'] || [];
  const workItems = confirmed['m3.work_items'] || [];
  const candidate = confirmed['m5.candidate_process_info'] || {};
  const steps = confirmed['m5.process_steps'] || [];

  // 對外只保留到職底線，且不得出現 L1–L5 代碼
  const stripLevel = s => String(s || '').replace(/L[1-5]/g, '').replace(/（\s*）/g, '').trim();
  return envelope('M6-01', {
    organized_content: {
      'm6.job_title': caseFields['case.job_title_working'] || '',
      'm6.role_positioning': confirmed['m3.role_positioning'] || '',
      'm6.work_items': workItems.map(w =>
        `【${w.responsibility_type}｜${w.nature}${w.frequency_share ? '｜' + w.frequency_share : ''}】${w.work}`),
      'm6.minimum_competencies': anchors
        .filter(a => a.minimum_level)
        .map(a => `具備「${a.competency}」，能${stripLevel(a[a.minimum_level] || a.L3)}`),
      'm6.work_traits': maturity
        .filter(m => m.minimum_level)
        .map(m => stripLevel(m[m.minimum_level] || m.L3)),
      'm6.interview_process': [
        candidate.duration ? `整體流程：${candidate.duration}` : null,
        ...steps.map((s, i) => `第${'一二三四五'[i] || (i + 1)}階段｜${s.step}：由${s.role}進行，主要會${s.task}。`),
        candidate.prep ? `事前準備：${candidate.prep}` : null,
        candidate.notify ? `結果通知：${candidate.notify}` : null,
      ].filter(Boolean),
    },
    warnings: [
      'JD 僅保留到職底線；不得公開完整題目、行為錨點、內部評分方式、表現過度風險或組織內部敏感資訊。',
      '請確認對外必備要求未高於甄選最低可接受等級。',
    ],
  });
}

/* ═══════════ QA-02 對外揭露邊界檢查 ═══════════ */
export function runQA02(jdContent) {
  const t = typeof jdContent === 'string' ? jdContent : JSON.stringify(jdContent);
  const hits = [];
  if (/L[1-5]\b/.test(t)) hits.push('偵測到 L1–L5 等級代碼。');
  if (/行為錨點|錨點/.test(t)) hits.push('偵測到「行為錨點」字樣。');
  if (/最低可接受等級|評分|計分|分數/.test(t)) hits.push('偵測到內部評分或最低等級敘述。');
  if (/表現過度|過度風險|不適任/.test(t)) hits.push('偵測到表現過度風險假設。');
  if (/結構化追問|需要取得的行為證據/.test(t)) hits.push('偵測到完整面試題目或追問內容。');
  return envelope('QA-02', {
    organized_content: { pass: hits.length === 0 },
    warnings: hits,
    contradictions: hits.map(h => ({ message: h, suggestion: '請移除或改寫為對外可揭露的情境化描述後才可發布。' })),
  });
}

/* ═══════════ QA-01 上下游一致性檢查 ═══════════ */
export function runQA01(confirmed) {
  const issues = [];
  const anchors = mergeAnchors(confirmed);
  const workItems = confirmed['m3.work_items'] || [];
  // 占比總和
  const total = workItems.reduce((s, w) => {
    const n = parseFloat(String(w.frequency_share || '').replace('%', ''));
    return s + (isNaN(n) ? 0 : n);
  }, 0);
  if (total > 0 && Math.abs(total - 100) > 10) {
    issues.push({ type: 'share_total', message: `主要工作內容的時間占比總和為 ${total}%，與 100% 差距較大。系統不自行修正，請確認。` });
  }
  // 錨點缺最低等級
  anchors.filter(a => !a.minimum_level).forEach(a => {
    issues.push({ type: 'missing_min', message: `職能「${a.competency}」尚未設定最低可接受等級。` });
  });
  // 成熟度缺理由
  (confirmed['m3.maturity_anchors'] || []).filter(m => !m.why).forEach(m => {
    issues.push({ type: 'missing_reason', message: `成熟度維度「${m.competency}」尚未填寫「為什麼需要這個範圍」。` });
  });
  return envelope('QA-01', {
    organized_content: { pass: issues.length === 0 },
    warnings: issues.map(i => i.message),
    contradictions: [],
  });
}
