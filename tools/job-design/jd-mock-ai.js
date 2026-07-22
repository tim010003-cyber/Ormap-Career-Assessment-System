/**
 * jd-mock-ai.js — 職務設計與甄選 Web App｜Mock AI Provider（完整規格版）
 * =====================================================================
 * 以規則式方式模擬 AI 任務，完全不呼叫外部 API。輸出遵守
 * 《04_AI任務規格》共通輸出契約，轉換原則照抄《3.職務與人才規格定位》。
 *
 * 共通原則：把使用者說的話整理好，其餘都不做。
 * 不評價、不追問、不判定、不阻擋——那些都是人在現場做的事。
 */

import { MATURITY_DIMENSIONS, RESPONSIBILITY_TYPES, WORK_NATURE, M1_CHAPTERS } from './jd-fields.js';

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

/**
 * 引導者的問句。現場是一問一答，貼進來的常常是整段逐字稿，裡面夾著引導者問的問題。
 * 那些是「問題」不是「回答」，不能當成回應者說的內容填進欄位。
 */
// 注意：切句時 ？ 會被當成分隔符吃掉，所以不能只靠句尾問號判斷，
// 要認疑問語尾詞（嗎／呢／怎麼樣）與疑問句型。
const QUESTION_RE = /(嗎|呢|如何|怎麼樣|怎樣)\s*[?？]?\s*$|[?？]\s*$/;
const FACILITATOR_RE = /^(那|所以|好|嗯|ok|OK)?\s*(你|您|他|我們)?\s*(覺得|認為|會不會|有沒有|是不是|要不要|想不想|可不可以|可以說說|要不要說)/;

/** 口語贅詞：整理時先剝掉，留下真正的內容（可能連續好幾個，所以要重複剝） */
const FILLER_RE = /^(就是說?|那個|這個|其實|對對對|對啊|嗯+|欸|我覺得|我想說|我想|反正|基本上|老實說|然後|那)[，,、]?\s*/;
const stripFillers = (s) => {
  let out = s, prev;
  do { prev = out; out = out.replace(FILLER_RE, '').trim(); } while (out !== prev && out);
  return out;
};

/** 把口述切成語意條列（規則式，非 AI） */
function splitPoints(text) {
  if (!text) return [];
  return String(text)
    .split(/[\n;；。！？!?]+|\s*(?:然後|另外|再來|後來|接著)\s*/)
    .map(s => s.replace(/^[\s、,，·\-\*\d\.]+/, '').trim())
    // 逐字稿的編號與引言（"(a)"、"主要可以整理成以下幾大項："）不是內容
    .map(s => stripFillers(s.replace(/^\(?[a-zA-Z0-9]{1,2}\)\s*/, '')))
    .filter(s => s.length >= 2)
    // 引導者的問句剔除，不要當成他的回答
    .filter(s => !(QUESTION_RE.test(s) || FACILITATOR_RE.test(s)));
}

const CONFIRMED_STAFFING_RE = /(?:已(?:經)?(?:決定|核准|確認)|就是|確定|確實)(?:要|會)?(?:找人|加人|增聘|補人|招募)|(?:找人|加人|增聘|補人|招募).{0,8}(?:已(?:經)?(?:決定|核准|確認)|確定)/;

/**
 * 「需求觸發」優先找最近發生的事件，而不是把「我要找人」這個決策
 * 或輸入的第一句直接當成觸發事件。找不到事件時才忠實退回第一段。
 */
function findTriggerEvent(raw, points) {
  const clauses = String(raw || '')
    .split(/[\n;；。！？!?，,]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2);
  const eventRe = /最近|近期|剛|突然|開始|發生|離職|異動|新案|專案|服務|上線|客戶|訂單|工作量|延誤|加班|品質|客訴|需求|成長|擴大|啟動/;
  const candidates = clauses
    .map((text, index) => ({
      text,
      index,
      score: (eventRe.test(text) ? 4 : 0)
        + (/最近|近期|剛|突然|開始|發生/.test(text) ? 3 : 0)
        + (/離職|異動|新案|上線|訂單|延誤|加班|客訴|工作量/.test(text) ? 3 : 0)
        - (CONFIRMED_STAFFING_RE.test(text) && !eventRe.test(text) ? 5 : 0),
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || b.index - a.index);
  return candidates[0]?.text || points[0] || '';
}

const asList = v => Array.isArray(v) ? v.filter(x => (x ?? '').toString().trim()) : splitPoints(v);

/**
 * 依關鍵字分派到多個桶；未命中者進 fallback 桶。
 *
 * 關鍵字比對本來就會猜錯，所以另外把「沒命中任何規則」的內容記在
 * `out._unmatched`，讓畫面可以誠實說「這幾句我不確定該放哪，你來指認」，
 * 而不是靜默塞進某一格，讓人以為系統看懂了。
 */
function bucketize(points, rules, fallbackKey) {
  const out = {};
  Object.keys(rules).forEach(k => out[k] = []);
  out[fallbackKey] = out[fallbackKey] || [];
  const unmatched = [];
  for (const p of points) {
    let placed = false;
    for (const [key, re] of Object.entries(rules)) {
      if (re.test(p)) { out[key].push(p); placed = true; break; }
    }
    if (!placed) { out[fallbackKey].push(p); unmatched.push(p); }
  }
  Object.defineProperty(out, '_unmatched', { value: unmatched, enumerable: false });
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
    if (empty) gaps.push({ field: fid, message: `「${name}」還沒談到。想補再補，不補也可以往下走。` });
  }
  const contradictions = [];
  const resText = String(existing['existing.resources_authority'] || '');
  const issuesText = asList(existing['existing.current_issues']).join(' ');
  /*
   * 真人講話中間會夾代名詞：「要**我**負責」「都是**我**在扛」。
   * 舊的正則寫死「要負責」，所以只有種子資料那種書面寫法才比對得到，
   * 實際逐字稿幾乎不會觸發。這裡放寬成「動詞 + 最多幾個字 + 負責類詞」。
   */
  const noAuthority = new RegExp([
    '沒(有)?.{0,6}(授權|權限|決定權|核決權|裁量權)',
    '無(權|權限|法決定|法調度)',
    '不能.{0,4}決定', '不能.{0,4}作主', '沒辦法.{0,4}決定',
    '說了不算', '作不了主', '做不了主',
    '要等.{0,8}(裁示|核准|同意|點頭)',
    '(需|要).{0,6}(核可|核准|簽核|上面同意)',
  ].join('|')).test(resText);

  const heldAccountable = new RegExp([
    '(要|得|得要|都是|還是|最後).{0,6}(負責|扛|承擔|背)',
    '被要求.{0,4}負責',
    '(責任|成敗|結果).{0,6}(算|落|歸|在).{0,4}(我|他|這個人|這個角色)',
    '出事.{0,8}(找|算|怪|問)',
    '背(黑鍋|責任)',
  ].join('|')).test(issuesText);
  if (noAuthority && heldAccountable) {
    contradictions.push({
      type: 'authority_accountability',
      message: '你提到要對結果負責，但也提到沒有相應的決定權。這兩件事放在一起看，值得聊一下。',
      detail: '這種情況有時候換個人也不會變，可能跟授權方式比較有關。當然，實際狀況你最清楚。',
      fields: ['existing.resources_authority', 'existing.current_issues'],
      suggestion: '要不要改走「完整職務設計」重新界定，或就維持現在的路線把這件事記下來，都由你決定。系統不會自己切換，也不會動你填的東西。',
    });
  }
  return envelope('PATH-01', {
    organized_content: { readiness: gaps.length === 0 ? 'ready' : 'missing_information' },
    information_gaps: gaps, contradictions,
    warnings: [],
  });
}

/* ═══════════ M1 問題釐清定位（逐章）═══════════
   依《1.問題釐清定位書》各章整理思考歷程。
   使用者明確表示增員已決定時，保留為已確認前提；其他觀點以提醒呈現。 */

/**
 * 這個信封現在的主要用途已經不是「當結果」，而是**告訴 AI 這一章要產出什麼形狀**。
 * jd-ai.js 的 shapeHint() 只取 organized_content 的鍵名與型別，值一律換成 "…"。
 *
 * 所以 task_code 與 organized_content 的鍵**一定要正確**：
 *   task_code 錯 → transformRule() 取不到該章的轉換原則，AI 少掉最主要的品質來源
 *   鍵是空的   → shapeHint 等於叫 AI 輸出 {}，AI 就照辦，畫面上是四張空白草稿卡
 *
 * 2026-07-22 的實際故障：M1_CHAPTERS 有「開場」章，M1_HANDLERS 沒有，
 * 於是落進 fallback 的 envelope('M1', …)，上面兩件事同時發生，
 * 而且 AI 呼叫本身是成功的，所以配額照扣、後端日誌一片正常。
 */
function chapterShape(ch) {
  const out = {};
  for (const o of ch.outputs || []) {
    if (o.type === 'repeat') {
      // 給一列樣本，shapeHint 才看得到欄位有哪些 key
      out[o.id] = [Object.fromEntries((o.columns || []).map(col => [col.key, '']))];
    } else {
      out[o.id] = o.type === 'list' ? [] : '';
    }
  }
  return out;
}

export function runM1Chapter(chapterCode, rawText, ctx = {}) {
  const ch = M1_CHAPTERS.find(x => x.code === chapterCode);
  // 章節清單與這裡不同步是程式錯誤，不是使用者的問題。
  // 以前這裡靜默回一個空信封，結果是使用者花了一次配額拿到空白。寧可大聲壞掉。
  if (!ch) throw new Error(`未知的章節：${chapterCode}（M1_CHAPTERS 沒有這個 code）`);

  const pts = splitPoints(rawText);
  const h = M1_HANDLERS[chapterCode];

  // 沒有規則式 handler（例如「開場」），或還沒講話。
  // 兩種都不是錯誤：照樣帶著正確的 task_code 與完整欄位形狀交給 AI 去整理。
  if (!h || !pts.length) {
    return envelope(ch.task, {
      organized_content: chapterShape(ch),
      warnings: pts.length ? [] : ['這一章還沒有內容。想先跳過、之後再回來補都可以。'],
    });
  }

  /*
   * 規則式 handler 只吐得出「關鍵字比對到」的欄位，所以同一格會**看輸入而定**
   * 忽有忽無：這次口述提到期限就有「時間敏感性」，沒提到就整格從形狀裡消失，
   * AI 於是根本不知道有這一格——不是它判斷不用填。
   *
   * 2026-07-22 使用者決策：只要是 AI 轉換得到的欄位就全部給它填，
   * 人再去比對或補充。草稿可以改、可以清空，「寧可整理得多一點讓他刪」。
   * 因此這裡把完整形狀墊在底下，handler 有比對到的值照樣覆蓋上來。
   */
  const r = h(pts, ctx, rawText);
  return { ...r, organized_content: { ...chapterShape(ch), ...r.organized_content } };
}

const M1_HANDLERS = {
  '第一章': (pts, ctx, raw) => {
    const b = bucketize(pts, {
      'm1.confirmed_facts': CONFIRMED_STAFFING_RE,
      'm1.supporting_evidence': /資料|紀錄|報表|數據|統計|多人|大家都/,
      'm1.feelings_claims': /覺得|感覺|好像|應該是|聽說|印象/,
      'm1.hypotheses_pending': /可能|推測|懷疑|我猜|也許/,
    }, 'm1.confirmed_facts');
    const trigger = findTriggerEvent(raw, pts);
    return envelope('M1-01', {
      organized_content: {
        'm1.trigger_event': trigger,
        'm1.first_noticed_at': (raw.match(/(\d+\s*[年月週天]|最近|去年|今年|上季|這season)/) || [''])[0],
        'm1.affected_roles': pts.filter(p => /主管|同事|客戶|團隊|部門|老闆|我/.test(p)).slice(0, 5),
        ...b,
        // 感受就是感受，不需要「補資料驗證」。這一格留給人自己想填什麼。
        'm1.information_gaps': [],
      },
      inferences_requiring_confirmation: [
        { field: 'm1.demand_nature', note: '需求性質是我猜的，你看看對不對。' },
        { field: 'm1.hypotheses_pending', note: '這幾項目前是推測，之後如果想找依據可以回來看。' },
      ],
      // 沒有「已確認事實」不是缺陷。現階段本來就常常只有感受，照實整理就好。
      information_gaps: [],
      warnings: [],
    });
  },

  '第二章': (pts, ctx, raw) => {
    // 依問題類型關鍵字初步歸類
    const typeOf = (p) => {
      if (/加班|做不完|量太多|容量|排程/.test(p)) return '工作量問題';
      if (/不會|不熟|品質|做不好|經驗不足/.test(p)) return '能力問題';
      if (/重工|等待|流程|交接|責任不清/.test(p)) return '流程問題';
      if (/系統|工具|手工|表單|資料分散/.test(p)) return '工具問題';
      if (/目標|優先|決策|分工|回饋|主管/.test(p)) return '管理問題';
      if (/薪水|薪酬|職等|授權|升遷|認可/.test(p)) return '激勵問題';
      if (/市場|產品|獲利|商業模式|需求不穩/.test(p)) return '商業問題';
      if (/部門|組織|編制|界面|放錯/.test(p)) return '組織結構問題';
      return '';
    };
    const problems = pts.slice(0, 6).map((p, i) => ({
      statement: p, type: typeOf(p), primary: i === 0 ? '主要問題' : '關聯問題',
      phenomena: '', causes: '', downstream: '', confirmed_vs_hypo: '',
    }));
    const unTyped = problems.filter(p => !p.type);
    return envelope('M1-02', {
      organized_content: { 'm1.problem_statements': problems, 'm1.next_bottleneck': [] },
      inferences_requiring_confirmation: [
        { field: 'm1.problem_statements', note: '問題類型與主次是我先歸的，你直接改比較快。' },
      ],
      information_gaps: [
        ...(unTyped.length ? [{ field: 'm1.problem_statements', message: `有 ${unTyped.length} 項我沒把握該歸到哪一類，你來看比較準。` }] : []),
      ],
      warnings: [],
    });
  },

  '第三章': (pts) => {
    const b = bucketize(pts, {
      'm1.current_impacts': /已經|目前已|造成了|流失|延誤|客訴/,
      'm1.inactivity_cost': /如果不|再不|未來|接下來|三個月|半年/,
    }, 'm1.current_impacts');
    return envelope('M1-03', {
      organized_content: {
        'm1.impact_scope': pts[0],
        'm1.frequency_duration': pts.find(p => /每|經常|偶爾|持續|週期|一直/.test(p)) || '',
        ...b,
        'm1.unquantified_risks': [],
      },
      inferences_requiring_confirmation: [
        { field: 'm1.inactivity_cost', note: '三至六個月的代價為推論，請確認。' },
        { field: 'm1.need_scale', note: '需求尺度為推論，請人工選定。' },
      ],
      information_gaps: [
        { field: 'm1.importance', message: '影響程度與判斷依據須由人工判斷。' },
        { field: 'm1.time_sensitivity', message: '時間敏感性與關鍵期限須由人工判斷。' },
      ],
      warnings: [],
    });
  },

  '第四章': (pts, ctx, raw) => {
    const warnings = [];
    if (/招到|找到人|導入完成|上線/.test(raw)) {
      warnings.push('已保留你以「招到人／完成導入」描述成果的方式；若需要，也可以再補充完成後希望看見的改變。');
    }
    return envelope('M1-04', {
      organized_content: {
        'm1.current_condition': pts[0],
        'm1.target_change': pts[1] || '',
        'm1.beneficiaries': pts.filter(p => /客戶|同事|團隊|主管|部門/.test(p)).slice(0, 4),
        'm1.success_evidence': pts.filter(p => /可以看到|判斷|依據|指標|觀察/.test(p)),
        'm1.out_of_scope': pts.filter(p => /不處理|不包含|不在範圍|之後再/.test(p)),
        'm1.beyond_single_solution': [],
      },
      information_gaps: [
        { field: 'm1.minimum_result', message: '最低可接受結果須由人工決定。' },
        { field: 'm1.ideal_result', message: '理想結果須由人工決定。' },
      ],
      warnings,
    });
  },

  '第五章': (pts) => {
    const b = bucketize(pts, {
      'm1.nonnegotiables': /不能|不可|一定要|底線|不可妥協/,
      'm1.available_resources': /預算|時間|人力|資源|可以投入/,
    }, 'm1.expected_value');
    return envelope('M1-05', {
      organized_content: {
        'm1.expected_value': b['m1.expected_value'],
        'm1.available_resources': b['m1.available_resources'].join('；'),
        'm1.nonnegotiables': b['m1.nonnegotiables'],
        'm1.missing_conditions': [], 'm1.underinvest_risk': [],
      },
      information_gaps: [
        { field: 'm1.investment_status', message: '建議狀態須由人工決定（四選一）。' },
      ],
      warnings: [
        '若需要更完整估算，可另外考慮管理、訓練、溝通、工具及轉換成本；沒有資料時維持留白。',
        '不同想法或投入邊界可以先並列保留，再由你決定是否進入職務設計。',
      ],
    });
  },
};

/* ═══════════ M2 職務需求界定（勾選式）═══════════ */

/**
 * @param checks { [fieldId]: string[] | string }  勾選與填寫結果
 * 依《2.職務需求界定書》AI 整理原則：只根據勾選整理、矛盾先列出、
 * 管理／流程／工具／授權問題不得只建議新增執行人力。
 */
export function runM2(checks = {}) {
  const arr = (id) => Array.isArray(checks[id]) ? checks[id] : (checks[id] ? [checks[id]] : []);
  const A = arr('m2.strategies_a');          // 工作與流程改善
  const B = arr('m2.strategies_b');          // 人員配置與管理改善
  const C = arr('m2.strategies_c');          // 引入外部專業與彈性人力
  const D = arr('m2.strategies_d');          // 增加內部人力與正式編制
  const roles = arr('m2.role_types');
  const mgmt = arr('m2.management_responsibility');
  const decision = arr('m2.staffing_decision');
  const support = arr('m2.organization_support');
  const notes = (id) => checks[id + '_notes'] || {};

  const contradictions = [];
  const warnings = [];

  // ① 若增員仍在探索，可提醒檢視既有資源；若使用者已明確選定增員，
  //    就把它當作確認前提，不再用此提醒質疑決策。
  const firstClass = [...A, ...B];
  const secondClass = [...C, ...D];
  const staffingConfirmed = D.length > 0 || decision.some(x => /需要新增內部人力|需要人力與其他改善策略同步進行|採用混合形式/.test(x));
  if (secondClass.length && firstClass.length === 0 && !staffingConfirmed) {
    contradictions.push({
      type: 'skipped_first_class',
      message: '已勾選「增加能力或人力供給」，但「改善與重整既有資源」完全沒有勾選任何項目。',
      detail: '目前只有外部或彈性資源選項，既有流程與人員配置尚未留下紀錄。這不影響繼續，但之後可能較難回看當時的取捨。',
      suggestion: '若有幫助，可以補記哪些既有做法已評估過；也可以先保留目前選擇，之後再補。',
    });
  }

  // ② 有管理問題卻要建立沒有授權的執行職務
  const needMgmtRole = mgmt.some(x => /組織確實缺少/.test(x));
  const execRole = roles.some(x => /執行型/.test(x));
  const mgmtIssue = B.some(x => /主管職責|管理與績效|不適任/.test(x));
  if (mgmtIssue && execRole && !needMgmtRole) {
    contradictions.push({
      type: 'authority_mismatch',
      message: '既有資源盤點指出管理或主管配置有問題，但角色類型選擇「執行型」，且未認定組織缺少管理／整合角色。',
      detail: '不能建立一個沒有相應授權的執行職務，卻期待他解決主管、決策或跨部門管理問題。',
      suggestion: '請確認這些管理問題應由現任主管改善，還是確實需要具正式授權的管理／整合角色。',
    });
  }

  // ③ 需求不穩定卻直接開全職
  const unstable = C.some(x => /短期|階段性|測試需求|按件計酬/.test(x));
  const fullTime = D.some(x => /全職/.test(x));
  if (unstable && fullTime && !arr('m2.engagement_mix').length && !(checks['m2.engagement_mix'] || '').trim()) {
    warnings.push('同時勾選了「短期／專案型外部合作」與「增加全職人力」，但尚未說明合作形式如何組合。請在第四部分寫下決策。');
  }

  // ④ 只勾不寫：原因與後續行動分開檢查
  const missingReason = [], missingAction = [];
  [['m2.strategies_a', A], ['m2.strategies_b', B], ['m2.strategies_c', C], ['m2.strategies_d', D]]
    .forEach(([id, picked]) => {
      const n = notes(id);
      picked.forEach(opt => {
        const v = n[opt];
        const reason = typeof v === 'string' ? v : (v?.reason || '');
        const action = typeof v === 'string' ? '' : (v?.action || '');
        if (!String(reason).trim()) missingReason.push(opt);
        if (!String(action).trim()) missingAction.push(opt);
      });
    });
  if (missingReason.length) warnings.push(`有 ${missingReason.length} 個已勾選方案尚未記錄原因；可以先繼續，之後再補上當時的考量。`);
  if (missingAction.length) warnings.push(`有 ${missingAction.length} 個已勾選方案尚未記錄後續行動；可以先保留目前決定，之後再安排下一步。`);

  // ⑤ 待諮詢
  const needConsult = [...roles, ...mgmt, ...decision, ...support]
    .filter(x => /諮詢|無法判斷|無法確認/.test(x));
  if (needConsult.length) warnings.push(`有 ${needConsult.length} 項標示為「需要進一步確認／諮詢」，將列為待課堂討論。`);

  if (!decision.length) warnings.push('尚未做出人力策略結論（第四部分）。');
  if (!roles.length) warnings.push('尚未判斷角色類型（第五部分）。');

  return envelope('M2-01..03', {
    organized_content: {
      first_class: firstClass,
      second_class: secondClass,
      strategy_combination: [...firstClass, ...secondClass],
      engagement_mix: checks['m2.engagement_mix'] || '',
      budget_plan: checks['m2.budget_plan'] || '',
      staffing_decision: decision,
      role_types: roles,
      organization_support: support,
      need_consult: needConsult,
      missing_reason: missingReason,
      missing_action: missingAction,
    },
    contradictions, warnings,
    inferences_requiring_confirmation: [
      { field: 'm2.suggested_role_type', note: '角色類型建議是可修改草稿；不會改變使用者已確認的增員決策。' },
    ],
  });
}


/* ═══════════ M3 逐節整理 ═══════════
   runSection(sectionCode, rawText, ctx) → envelope
   ctx: { existing, confirmed }（已確認上游，僅供 1.1 承接既有職務理由） */

export function runSection(sectionCode, rawText, ctx = {}) {
  const pts = splitPoints(rawText);
  const handler = SECTION_HANDLERS[sectionCode];
  if (!handler) return envelope(sectionCode, { cannot_complete: true, cannot_complete_reason: '未知的小節。' });
  // 還沒講話不是錯誤，只是還沒開始。
  if (pts.length === 0) {
    return envelope(sectionCode, { warnings: ['這一節還沒有內容。想先跳過、之後再回來補都可以。'] });
  }
  return handler(pts, ctx, rawText);
}

const SECTION_HANDLERS = {
  // 1.1 角色定位與預期價值產出
  // 1.1 結果與價值（先問產出什麼，不先問角色定位）
  '1.1': (pts, ctx) => {
    const b = bucketize(pts, {
      'm3.error_consequences': /做錯|出錯|沒做好|漏掉|失誤|後果/,
      'm3.observable_changes': /改變|之後|因此|才能|就會|準時|下降|提升/,
    }, 'm3.concrete_outputs');
    const outputs = b['m3.concrete_outputs'];
    const positioning = outputs.length
      ? (ctx.existing?.['existing.role_reason']
          ? `負責產出${outputs[0]}，並確保後續使用者能順利接手。（承接既有職務存在理由）`
          : `負責產出${outputs[0]}，並確保後續使用者能順利接手。`)
      : '';
    const vals = b['m3.observable_changes'].length ? b['m3.observable_changes'] : outputs;
    const gaps = [];
    // 產出與價值項數只是參考範圍，不是門檻。少幾項也照樣往下走。
    if (!outputs.length) gaps.push({ field: 'm3.concrete_outputs', message: '還沒談到這項工作實際交付了什麼，想補再補。' });
    return envelope('M3-01', {
      explicit_content: outputs.map(o => ({ field: 'm3.concrete_outputs', value: o, source: '1.1 口述' })),
      organized_content: {
        'm3.concrete_outputs': outputs,
        'm3.observable_changes': b['m3.observable_changes'],
        'm3.error_consequences': b['m3.error_consequences'],
        'm3.role_positioning': positioning,
        'm3.value_outputs': vals.slice(0, 6),
        'm3.sel_value_evidence': vals.slice(0, 6).map(v => `候選人是否做出過「${v}」這類成果`),
        'm3.sel_value_understanding': [`候選人能否說出這個角色為什麼存在，以及${vals[0] ? `「${vals[0]}」` : '主要價值'}為何重要`],
        'm3.sel_outcome_criteria': vals.slice(0, 6).map(v => `以「${v}」是否實際發生、而非做了多少事來判斷`),
      },
      inferences_requiring_confirmation: [
        { field: 'm3.role_positioning', note: '角色定位是依你講的結果推導出來的，請確認是否忠實。' },
      ],
      information_gaps: gaps,
      warnings: [],
    });
  },

  // 1.2 工作流程（還原實際步驟，不是列工作清單）
  '1.2': (pts) => {
    // 依口述順序還原步驟；每一句就是流程中的一個環節
    const steps = pts.map((p, i) => `${i + 1}. ${p}`);
    const items = pts.map(p => ({
      work: p,
      responsibility_type: /協助|幫忙|支援他人/.test(p) ? '協助'
        : (/一起|共同|協同|跟.{1,6}一起/.test(p) ? '共同負責' : '主要負責'),
      nature: /行政|雜務|臨時|偶爾|支援/.test(p) ? '支援工作' : '核心工作',
      frequency_share: (p.match(/每[日天週月季年]|不定期|約\s*\d+\s*%/) || [''])[0],
    }));
    const core = items.filter(w => w.nature === '核心工作');
    const collab = pts.filter(p => /一起|共同|協同|請|交給|對接|協調/.test(p));
    const objects = pts.filter(p => /系統|表單|文件|資料|檔案|平台|報表|訂單/.test(p));
    return envelope('M3-02', {
      organized_content: {
        'm3.work_steps': steps,
        'm3.work_items': items,
        'm3.collaboration_items': collab,
        'm3.data_objects': objects,
        'm3.sel_key_experience': core.map(w => `是否實際做過「${w.work}」`),
        'm3.sel_work_sample': core.map(w => `以「${w.work}」設計工作樣本或情境題`),
        'm3.sel_stage_scope': [
          `初步篩選：確認是否具備${core[0] ? `「${core[0].work}」` : '核心工作'}的基本經驗`,
          '結構化面試：了解核心工作的實際做法與判斷',
          '實作／情境：驗證工作品質與方法',
        ],
      },
      inferences_requiring_confirmation: [
        { field: 'm3.work_items', note: '「責任區分／工作性質」為 AI 初步推論，請逐項確認。「負責」代表要對結果承擔主要責任，「協助」不得寫成主要責任。' },
        { field: 'm3.work_steps', note: '步驟順序依你講述的先後排列，請確認是否與實際一致。' },
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
      warnings: [],
    });
  },

  // 2.1 必要知識與學習可能性
  '2.1': (pts) => {
    const b = bucketize(pts, {
      'm3.organization_specific_knowledge': /內部|我們公司|組織特有|自家|歷史|沿革|只有進來才/,
      'm3.alternative_knowledge': /替代|相關經驗|類似|同性質|可以轉|不一定要同產業/,
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
      warnings: [],
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
      warnings: [],
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
      warnings: [],
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
    return envelope(task, { warnings: [`目前還沒有可以用來建立錨點的${itemName}。先往下走，之後回來補也可以。`] });
  }
  // L1–L5 每一格填的就是該等級的行為特徵（BARS），不另立「行為特徵」欄
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
    warnings: [],
  });
}

/* ═══════════ 第五章 人才成熟度（M3-09）═══════════
   依各維度口述 + 泛用五級參考，改寫成本職務專屬錨點。 */
export function runMaturity(perDimensionRaw = {}, prev = []) {
  const prevBy = Object.fromEntries((prev || []).map(a => [a.competency, a]));
  const anchors = MATURITY_DIMENSIONS.map(d => {
    const raw = String(perDimensionRaw[d.code] || '').trim();
    const p = prevBy[d.name] || {};
    const ctxNote = raw ? `依本職務情境：${splitPoints(raw)[0] || raw}` : '';
    const j = (generic) => raw ? `${generic}（${ctxNote}）` : generic;
    return {
      competency: d.name,
      // 五個維度全填。jd_selected 只決定「要不要放進對外 JD」，不影響職務說明書。
      jd_selected: p.jd_selected ?? false,
      // 需要具備的內容與想法 → 進職務說明書 6.5（五個全寫，不含等級）
      description: p.description || (raw ? splitPoints(raw).join('；') : ''),
      why: p.why || '',                            // 為什麼需要這個範圍 — 人工填
      // L1–L5 每一格就是該等級的行為特徵（BARS）
      L1: j(d.generic.L1), L2: j(d.generic.L2), L3: j(d.generic.L3),
      L4: j(d.generic.L4), L5: j(d.generic.L5),
      minimum_level: p.minimum_level || null, ideal_level: p.ideal_level || null,  // 人工 H
      _hasContext: !!raw,
    };
  });
  const noContext = anchors.filter(a => !a._hasContext).map(a => a.competency);
  const jdCount = anchors.filter(a => a.jd_selected).length;
  const gaps = [];
  if (noContext.length) gaps.push({ field: 'm3.maturity_anchors', message: `「${noContext.join('、')}」尚未提供職務情境口述，目前仍是泛用定義。五個維度都需要填寫。` });
  if (jdCount === 0) gaps.push({ field: 'm3.maturity_anchors', message: '尚未挑選要放進對外 JD 的特質（挑三個）。五個維度仍會全部寫入職務說明書。' });
  return envelope('M3-09', {
    organized_content: { 'm3.maturity_anchors': anchors },
    inferences_requiring_confirmation: [
      { field: 'm3.maturity_anchors', note: '等級、理由與是否放進對外 JD，一律由人工決定，AI 不預設。' },
    ],
    information_gaps: gaps,
    warnings: [
      '五個維度都要填寫；只有對外 JD 才從中挑三個。',
      '不因職稱高或薪資高就把所有維度設為 L5。',
      '程度超過職務需要時，先列為面試核對事項，不能直接判定不適任。',
    ],
  });
}

/* ═══════════ M4 職務說明書草稿 ═══════════ */
export function runM4(confirmed) {
  const required = ['m3.role_positioning', 'm3.value_outputs', 'm3.work_items'];
  const missing = required.filter(f => !confirmed[f]);
  return envelope('M4-01', {
    organized_content: { assembled: true },
    information_gaps: missing.map(f => ({ field: f, message: '目前沒有內容，文件會先以「待確認」保留。' })),
    warnings: ['職務基本資料那一區留給你填。'],
  });
}

/* ═══════════ M5 甄選流程設計書 ═══════════ */
export function runM5(confirmed) {
  const anchors = mergeAnchors(confirmed);
  // 階段是時間軸，方法可複選。「結構化面試」不是階段——那是題目有沒有設計過，
  // 每一關都該成立，所以不放進流程名稱。
  const steps = [
    { step: '書面與經歷檢視', role: 'HR／行政',
      task: '書面與經歷檢視', focus: '到職底線與必備條件' },
    { step: '第一次面談', role: '用人主管',
      task: '行為事例訪談（過去經驗）、情境判斷提問（未來情境）、工作動機了解',
      focus: '核心職能與專業判斷、投入動機與持續性' },
    { step: '實作評估／試做', role: '團隊資深成員',
      task: '工作樣本評量、實際帶班／試做觀察',
      focus: '工作品質與方法、面對變動與壓力的反應' },
    { step: '最終確認與條件談定', role: '單位主管',
      task: '人才成熟度核對、綜合評估與等級核對、條件與期待對齊',
      focus: '最低可接受等級核對、價值觀是否相容' },
  ];
  /*
   * 出題要收斂，不是有幾個職能就出幾題。
   * 一場面試問得完的大概就十題上下，二十幾題那張表沒有人會照著用。
   *
   * 1. L1 不出題——L1 是「需要明確指令才會動」，那種程度問不出東西。
   * 2. 依重要性排序：等級要求越高越該問；有勾進 JD 的優先。
   * 3. 最多取六項核心職能，一項兩題，上限十二題。其餘列出來讓人自己決定要不要加。
   */
  const CORE_MAX = 6;
  const lvNum = (a) => { const m = /L(\d)/.exec(String(a.minimum_level || '')); return m ? +m[1] : 0; };
  const worthAsking = (a) => lvNum(a) !== 1;
  const ranked = anchors.filter(worthAsking)
    .map((a, i) => ({ a, i, score: lvNum(a) * 10 + (a.jd_selected ? 5 : 0) }))
    .sort((x, y) => y.score - x.score || x.i - y.i);
  const core = ranked.slice(0, CORE_MAX).map(x => x.a);
  const deferred = ranked.slice(CORE_MAX).map(x => x.a.competency);

  const questions = core.flatMap(a => ([
    { competency: a.competency, qtype: '過去經驗',
      question: `請描述一次你實際處理「${a.competency}」的經驗，當時的情況、你的做法與結果。`,
      followup: '當時有哪些資訊不足或限制？你如何判斷要自己處理還是求助？',
      evidence: '能否獨立完成、面對例外情境的處理層級與求助時機。',
      level: a.minimum_level || '' },
    { competency: a.competency, qtype: '未來情境',
      question: `如果在「${a.competency}」上遇到時間更緊或資源更少的情況，你會怎麼調整？`,
      followup: '你會優先犧牲什麼、守住什麼？依據是什麼？',
      evidence: '取捨原則是否穩定，是否理解品質底線。',
      level: a.minimum_level || '' },
  ]));
  const skippedL1 = anchors.filter(a => !worthAsking(a)).map(a => a.competency);
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
    warnings: [
      '流程期間、地點、要準備什麼、怎麼通知結果，這幾項留給你填。',
      ...(deferred.length ? [`只針對最核心的 ${core.length} 項職能出題。「${deferred.join('、')}」先沒出題——一場面試問得完的大概十題上下，需要的話再自己加。`] : []),
      ...(skippedL1.length ? [`「${skippedL1.join('、')}」最低只要 L1，那個程度不用靠面試題驗證。`] : []),
    ],
  });
}

/**
 * 表格三的資料來源：三張 M3 錨點表 ＋ **人才成熟度五個維度（全部）**。
 * 等級只出現在甄選流程設計書；JD 的挑選不影響這張表。
 */
export function mergeAnchors(confirmed) {
  const skills = ['m3.knowledge_anchors', 'm3.tool_anchors', 'm3.attitude_anchors']
    .flatMap(fid => confirmed[fid] || []);
  const traits = (confirmed['m3.maturity_anchors'] || [])
    .map(m => ({ ...m, isTrait: true, definition: m.definition || m.description || '' }));
  return [...skills, ...traits];
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
      // 套用《6.JD對外文案》的句型：你具備／你能使用／你能運用／面對…你能依…做出判斷
      'm6.minimum_competencies': anchors
        .filter(a => a.minimum_level && !a.isTrait)
        .map(a => {
          const beh = stripLevel(a[a.minimum_level] || a.L3).replace(/^能/, '');
          if (/工具|系統|操作/.test(a.competency)) return `你能使用${a.competency}，${beh}`;
          if (/方法|技術|流程/.test(a.competency)) return `你能運用${a.competency}，${beh}`;
          if (/判斷|決策|分級/.test(a.competency)) return `面對${a.competency}的情況時，你能${beh}`;
          if (/品質|準確|保護|倫理/.test(a.competency)) return `你能維持${a.competency}的標準，${beh}`;
          return `你具備${a.competency}相關知識，能夠${beh}`;
        }),
      // 對外 JD 只挑三個維度，套《6.JD對外文案》的特質句型，不公開 L1–L5
      'm6.work_traits': maturity
        .filter(m => m.jd_selected)
        .map(m => {
          // 去掉開頭的「能／主動」，避免與句型自帶的動詞重複
          const beh = stripLevel(m[m.minimum_level] || m.L3).replace(/^能/, '').replace(/^主動/, '');
          if (/自主|學習/.test(m.competency)) return `面對變動或沒有前例的情況，你能主動${beh}`;
          if (/問題解決|複雜/.test(m.competency)) return `遇到原因不明或牽涉多方的問題時，你會${beh}`;
          if (/協作|影響力|團隊/.test(m.competency)) return `與其他部門合作時，你能${beh}`;
          if (/情緒|韌性|不確定/.test(m.competency)) return `面對變動、壓力或資訊不完整時，你能${beh}`;
          if (/商業|價值/.test(m.competency)) return `你能理解工作與客戶及組織價值的關係，並依此${beh}`;
          return beh;
        }),
      'm6.interview_process': [
        // duration 只取期間本身；階段數由流程表決定，避免重複敘述
        steps.length ? `整體流程：預計包含 ${steps.length} 個階段${candidate.duration ? `，整體約於${String(candidate.duration).replace(/[，,、]?\s*共?\s*\d+\s*個?階段/g, '').trim()}內完成` : ''}。` : null,
        ...steps.map((s, i) => `第${'一二三四五'[i] || (i + 1)}階段｜${s.step}：由${s.role}進行，主要會${s.task}${candidate.stage_time ? `；預計需要${candidate.stage_time}` : ''}。`),
        `事前準備：${candidate.prep || '無'}`,
        candidate.notify ? `結果通知：預計於${candidate.notify}。` : null,
      ].filter(Boolean),
    },
    warnings: [
      'JD 僅保留到職底線；不得公開完整題目、行為錨點、內部評分方式、表現過度風險或組織內部敏感資訊。',
      '請確認對外必備要求未高於甄選最低可接受等級。',
    ],
  });
}

/* ═══════════ QA-02 發布前自我複查清單 ═══════════
   這裡不是檢查，是**把幾個地方指出來讓人自己看一眼**。
   系統不判定通過或不通過，也不阻擋發布——要不要改、能不能發，都是人決定。 */
export function runQA02(jdContent) {
  const t = typeof jdContent === 'string' ? jdContent : JSON.stringify(jdContent);
  const items = [];

  /*
   * 就業歧視風險提醒。
   * 《就業服務法》第 5 條禁止以種族、國籍、性別、年齡、婚育、宗教、
   * 容貌、身心障礙、星座血型等與工作無關的條件限制求職者。
   * 這裡只提醒、不改寫、不阻擋——要怎麼處理是人的判斷。
   */
  const BIAS = [
    [/中國|大陸籍|外籍|本國籍|國籍|僑生/, '這裡提到國籍或族群。如果是資訊安全的考量，改成「依資料分類與授權範圍處理」會比較準確，也避開就業歧視的疑慮。'],
    [/限男|限女|男性佳|女性佳|限.{0,2}性/, '這裡對性別做了限制。除非是法律允許的真實職業資格，否則寫進招募文件有《就業服務法》第 5 條的疑慮。'],
    [/\d{2}\s*歲以[下上]|年齡限|限.{0,4}歲/, '這裡對年齡設了條件。要不要改成描述實際需要的體力或經驗？'],
    [/未婚|已婚|懷孕|生育/, '這裡提到婚育狀況，那與工作能力無關，寫進招募文件有法律疑慮。'],
    [/身高|體重|外貌|五官|形象佳/, '這裡提到外型條件。除非工作確實必要，否則建議拿掉。'],
    [/星座|血型|生肖/, '這裡用了星座、血型或生肖當條件，那與工作表現無關。'],
  ];
  BIAS.forEach(([re, msg]) => { if (re.test(t)) items.push(msg); });

  // 只在「等級語境」才視為內部代碼，避免誤判產品型號、產線代號等正常用詞
  if (/(等級|級別|level|達到|至少)\s*[：:]?\s*L[1-5]\b/i.test(t)) {
    items.push('這裡出現了 L1–L5 的等級代碼，是內部用的分級。要不要改寫成候選人看得懂的說法？');
  }
  if (/行為錨點|錨定等級/.test(t)) {
    items.push('這裡提到「行為錨點」，那是內部評估用語。要不要換個講法？');
  }
  if (/結構化追問|需要取得的行為證據|面試評分表/.test(t)) {
    items.push('這裡似乎帶到了面試題目或追問內容。要公開到這個程度嗎？');
  }
  if (/表現過度|過度風險|不適任/.test(t)) {
    items.push('這裡提到表現過度或不適任的判斷。那原本只是面試時要核對的假設，要放進對外文案嗎？');
  }
  return envelope('QA-02', {
    // pass 一律為 true：系統不做裁決，保留欄位僅為相容
    organized_content: { pass: true, review_items: items },
    warnings: items,
  });
}

/* ═══════════ QA-01 三份輸出的對照清單 ═══════════
   同樣不是檢查。只是把「你可能想再看一眼的地方」列出來，
   數字對不對、要不要補，都由人在現場決定。 */
export function runQA01(confirmed) {
  const items = [];
  const anchors = mergeAnchors(confirmed);
  const workItems = confirmed['m3.work_items'] || [];

  const total = workItems.reduce((s, w) => {
    const n = parseFloat(String(w.frequency_share || '').replace('%', ''));
    return s + (isNaN(n) ? 0 : n);
  }, 0);
  if (total > 0 && Math.abs(total - 100) > 10) {
    items.push(`工作時間占比目前加起來是 ${total}%。如果本來就抓不準，維持現狀也可以。`);
  }
  anchors.filter(a => !a.minimum_level).forEach(a => {
    items.push(`職能「${a.competency}」還沒設最低可接受等級，之後對外文案會少這一項。`);
  });
  (confirmed['m3.maturity_anchors'] || []).filter(m => !m.why).forEach(m => {
    items.push(`成熟度「${m.competency}」還沒寫理由。想留白也沒關係，只是之後回頭看會少個依據。`);
  });

  return envelope('QA-01', {
    organized_content: { pass: true, review_items: items },
    warnings: items,
  });
}
