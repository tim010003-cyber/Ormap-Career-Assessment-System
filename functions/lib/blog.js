/**
 * blog.js — 文章發布：組 Markdown、寫進 GitHub
 * =====================================================================
 * 為什麼發布要經過這一層
 *   文章的真實來源是 repo 裡的 content/posts/*.md，CI 會把它產生成靜態頁。
 *   要寫進 repo 就需要 GitHub 權杖，而權杖絕對不能放進瀏覽器
 *   （原始碼、DevTools、網路面板都看得到）。所以前端只負責收集內容，
 *   真正的寫入由這裡帶著 Secret Manager 裡的權杖執行。
 *
 * 權杖規格
 *   GitHub fine-grained PAT，權限只給「本 repo 的 Contents 讀寫」。
 *   存在 Secret Manager 的 GITHUB_TOKEN，不進版控、不寫進 log。
 *
 * 設計規格：PRD/原味藍圖_內容平台與部落格_需求規格_v1_2026-07-24.md §7
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

const CATEGORIES = new Set(['career', 'life', 'org']);
const POSTS_PATH = 'content/posts';

/** 倉庫與分支不是機密，用環境變數即可 */
const REPO = process.env.GITHUB_REPO || 'tim010003-cyber/Ormap-Career-Assessment-System';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

const API = 'https://api.github.com';

// ---------------------------------------------------------------- 驗證

/**
 * 檢查並整理前端送來的欄位。
 *
 * 這裡是唯一的把關點：前端的驗證只是給人看的提示，任何人都能繞過它直接
 * 呼叫 function，所以規則必須在伺服器端再走一次。
 */
export function validatePost(input) {
  const d = input || {};
  const err = (msg) => { throw new HttpsError('invalid-argument', msg); };

  const slug = String(d.slug || '').trim().toLowerCase();
  // 只允許小寫英數與連字號。這同時擋掉路徑穿越（../）與奇怪的檔名。
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug)) {
    err('網址名稱只能用小寫英文、數字與連字號，開頭必須是英數，且不超過 81 個字。');
  }

  const title = oneLine(d.title);
  if (!title) err('請填標題。');
  if (title.length > 200) err('標題太長了（上限 200 字）。');

  const description = oneLine(d.description);
  if (!description) err('請填摘要。它會用在搜尋結果與社群分享預覽，請認真寫。');
  if (description.length > 300) err('摘要太長了（上限 300 字）。');

  const category = String(d.category || '').trim();
  if (!CATEGORIES.has(category)) err('分類只能是 career、life 或 org。');

  const date = String(d.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) err('發布日格式必須是 YYYY-MM-DD。');

  const updated = String(d.updated || '').trim();
  if (updated && !/^\d{4}-\d{2}-\d{2}$/.test(updated)) err('更新日格式必須是 YYYY-MM-DD。');

  const body = String(d.body || '');
  if (!body.trim()) err('內文是空的。');
  if (body.length > 300000) err('內文超過長度上限。');

  // 標籤裡的逗號會破壞 [a, b] 這個格式，直接濾掉
  const tags = (Array.isArray(d.tags) ? d.tags : [])
    .map((t) => oneLine(t).replace(/,/g, '')).filter(Boolean).slice(0, 12);

  return {
    slug, title, description, category, date, tags, body,
    updated: updated || '',
    seoTitle: oneLine(d.seoTitle).slice(0, 200),
    cover: oneLine(d.cover).slice(0, 500),
    author: oneLine(d.author).slice(0, 60),
    draft: d.draft === true,
  };
}

/** frontmatter 是一行一個欄位，換行會把檔案結構弄壞 */
function oneLine(v) {
  return String(v ?? '').replace(/[\r\n]+/g, ' ').trim();
}

/**
 * frontmatter 的值。
 * 產生器的解析器會把 [ 開頭當成陣列、把首尾引號剝掉，所以會撞到這些
 * 規則的值要先包成字串。
 */
function yamlValue(s) {
  const v = oneLine(s);
  if (v === '') return '';
  if (/^[[\]{}#&*!|>'"%@`-]/.test(v) || /^(true|false|null)$/i.test(v)) {
    return `"${v.replace(/"/g, '\\"')}"`;
  }
  return v;
}

/** 欄位 → Markdown 檔案內容 */
export function buildMarkdown(p) {
  const lines = ['---', `title: ${yamlValue(p.title)}`];
  if (p.seoTitle) lines.push(`seo_title: ${yamlValue(p.seoTitle)}`);
  lines.push(`description: ${yamlValue(p.description)}`);
  lines.push(`category: ${p.category}`);
  if (p.tags.length) lines.push(`tags: [${p.tags.join(', ')}]`);
  if (p.cover) lines.push(`cover: ${yamlValue(p.cover)}`);
  lines.push(`date: ${p.date}`);
  if (p.updated) lines.push(`updated: ${p.updated}`);
  if (p.author) lines.push(`author: ${yamlValue(p.author)}`);
  lines.push(`draft: ${p.draft ? 'true' : 'false'}`);
  lines.push('---', '');
  // 統一換行，避免 Windows 貼上的 CRLF 混進檔案
  lines.push(p.body.replace(/\r\n/g, '\n').trim(), '');
  return lines.join('\n');
}

// ---------------------------------------------------------------- GitHub

async function gh(token, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ormap-blog-publisher',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  if (res.status === 404) return { notFound: true };

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // GitHub 的錯誤訊息可能帶上請求內容，不原樣往前端丟
    logger.error('GitHub API 失敗', { path, status: res.status, body: text.slice(0, 400) });
    if (res.status === 401 || res.status === 403) {
      throw new HttpsError('failed-precondition',
        '發布權杖無效或權限不足，請聯絡系統管理者更新 GITHUB_TOKEN。');
    }
    if (res.status === 409 || res.status === 422) {
      throw new HttpsError('aborted', '這篇文章剛剛被別處改過，請重新載入後再存一次。');
    }
    throw new HttpsError('unavailable', 'GitHub 暫時無法連線，你寫的內容都還在，請稍後再試。');
  }

  return res.json();
}

const b64encode = (s) => Buffer.from(s, 'utf8').toString('base64');
const b64decode = (s) => Buffer.from(String(s).replace(/\n/g, ''), 'base64').toString('utf8');

/** 已存在就回 sha（更新需要它），不存在回 null */
async function getExistingSha(token, path) {
  const r = await gh(token, `/repos/${REPO}/contents/${path}?ref=${BRANCH}`);
  return r.notFound ? null : r.sha;
}

/**
 * 寫入（新增或更新）一篇文章。
 * 回傳 commit 資訊，讓前端可以告訴使用者「已送出，約一兩分鐘後上線」。
 */
export async function writePost(token, post, authorEmail) {
  const path = `${POSTS_PATH}/${post.slug}.md`;
  const sha = await getExistingSha(token, path);
  const isNew = !sha;

  const action = post.draft ? '存草稿' : (isNew ? '發布' : '更新');
  const result = await gh(token, `/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `[BLOG] ${action}：${post.title}\n\n由文章後臺送出（${authorEmail}）。`,
      content: b64encode(buildMarkdown(post)),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });

  return {
    isNew,
    draft: post.draft,
    slug: post.slug,
    commitSha: result.commit?.sha ?? null,
    commitUrl: result.commit?.html_url ?? null,
  };
}

/** 列出所有文章，附上每篇的標題與狀態，供後臺清單使用 */
export async function listPosts(token) {
  const r = await gh(token, `/repos/${REPO}/contents/${POSTS_PATH}?ref=${BRANCH}`);
  if (r.notFound || !Array.isArray(r)) return [];

  const files = r.filter((f) => f.type === 'file' && f.name.endsWith('.md'));
  // 逐檔抓內容只為了讀 frontmatter；文章數量級是幾十篇，可接受。
  const posts = await Promise.all(files.map(async (f) => {
    const detail = await gh(token, `/repos/${REPO}/contents/${f.path}?ref=${BRANCH}`);
    const text = detail.notFound ? '' : b64decode(detail.content);
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const get = (key) => {
      const m = fm && fm[1].match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
      return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
    };
    return {
      slug: f.name.replace(/\.md$/, ''),
      title: get('title'),
      category: get('category'),
      date: get('date'),
      draft: get('draft') === 'true',
    };
  }));

  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** 讀一篇文章的完整內容，供後臺編輯 */
export async function readPost(token, slug) {
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(String(slug || ''))) {
    throw new HttpsError('invalid-argument', '網址名稱格式不對。');
  }
  const r = await gh(token, `/repos/${REPO}/contents/${POSTS_PATH}/${slug}.md?ref=${BRANCH}`);
  if (r.notFound) throw new HttpsError('not-found', '找不到這篇文章。');

  const text = b64decode(r.content);
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new HttpsError('internal', '這個檔案的格式看起來不對，請直接編輯檔案修正。');

  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if (/^\[.*\]$/.test(v)) {
      v = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, '');
    }
    fields[line.slice(0, i).trim()] = v;
  }

  return {
    slug,
    title: fields.title || '',
    seoTitle: fields.seo_title || '',
    description: fields.description || '',
    category: fields.category || '',
    tags: Array.isArray(fields.tags) ? fields.tags : (fields.tags ? [fields.tags] : []),
    cover: fields.cover || '',
    date: fields.date || '',
    updated: fields.updated || '',
    author: fields.author || '',
    draft: fields.draft === 'true' || fields.draft === true,
    body: m[2],
  };
}

export const BLOG_REPO = REPO;
export const BLOG_BRANCH = BRANCH;
