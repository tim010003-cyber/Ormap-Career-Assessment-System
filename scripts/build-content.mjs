/**
 * build-content.mjs — 原味藍圖內容管線產生器
 * =====================================================================
 * 這支程式做什麼
 *   把 content/posts/*.md（作者用 Notion／Obsidian 寫好的 Markdown）轉成
 *   SEO 完整的靜態 HTML，並自動維護列表、分類、RSS 與 sitemap。
 *
 * 為什麼需要它（架構決策）
 *   使用者的第一目標是 SEO 與社群擴散。若文章存在資料庫、由瀏覽器端渲染，
 *   Facebook／LINE／Threads 的爬蟲完全不跑 JS，分享預覽會抓不到標題與封面。
 *   因此文章必須是「伺服器第一眼就回完整內容」的靜態檔。
 *
 *   這條管線是本專案唯一允許 build 的範圍，而且只在 CI 執行；作者本機
 *   不需要安裝任何東西。所有手寫應用頁（index / dashboard / twa / hti /
 *   report / timeline / admin …）一律不進這支程式。
 *   決策紀錄：PRD/原味藍圖_內容平台與部落格_需求規格_v1_2026-07-24.md §2
 *
 * 輸入
 *   content/posts/<slug>.md   frontmatter + Markdown 正文
 *
 * 產出（皆為產生物，不進 Git）
 *   blog.html                 文章列表
 *   blog/<slug>.html          文章詳情（含右側目錄）
 *   blog/category/<key>.html  分類頁
 *   feed.xml                  RSS（可供第三方 EDM 做 RSS-to-Email）
 *   sitemap.xml               全站 sitemap（公開頁 + 文章 + 分類頁）
 *
 * 失敗行為
 *   必填欄位缺漏、分類錯誤、slug 重複或格式非法時，以非零狀態結束，
 *   CI 因此中止部署，線上網站維持前一版不受影響。
 *
 * 執行
 *   npm run build:content
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = join(ROOT, 'content', 'posts');
const OUT_BLOG_DIR = join(ROOT, 'blog');

const SITE = {
  base: 'https://careervalue-ormap.web.app',
  name: '原味藍圖 Ormap',
  shortName: '原味藍圖',
  tagline: '生涯探索與人生設計',
  defaultImage: '/ormap-logo.png',
  defaultAuthor: '原味藍圖',
  locale: 'zh_TW',
};

/** 分類：與 tools.html 的三分類一致，不新增第四類 */
const CATEGORIES = {
  career: { name: '職涯與工作', desc: '工作價值、興趣、能力、履歷定位、職缺分析與轉換選擇。' },
  life: { name: '生涯與角色', desc: '人生角色、時間與精力配置、關係、生活設計與長期調整。' },
  org: { name: '組織與人才', desc: '職務設計、人才標準、甄選流程、主管判斷與組織合作。' },
};

/** 需要進 sitemap 的手寫公開頁（產生物由程式自行補上） */
const STATIC_PUBLIC_PAGES = [
  '/', '/about.html', '/tools.html', '/tools/twa-intro.html', '/tools/hti-intro.html',
  '/courses.html', '/services.html', '/organizations.html',
  '/feedback.html', '/privacy.html', '/terms.html',
];

// ---------------------------------------------------------------- 工具函式

const errors = [];
function fail(file, message) {
  errors.push(`${file}：${message}`);
}

function escapeHtml(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** XML 文字節點跳脫（RSS／sitemap 用） */
function escapeXml(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 極簡 frontmatter 解析。刻意不引入 YAML 套件：欄位規格固定（見規格書 §3.1），
 * 只需支援 `key: value` 與 `key: [a, b]`，減少相依面與版本風險。
 */
function parseFrontmatter(raw, file) {
  const m = raw.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) {
    fail(file, '找不到 frontmatter。檔案最上方需要以 --- 包住的設定區塊');
    return null;
  }
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) { fail(file, `frontmatter 這一行看不懂（缺少冒號）：${line}`); continue; }
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (/^\[.*\]$/.test(value)) {
      value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, '');
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
    }
    data[key] = value;
  }
  return { data, body: m[2] };
}

/** 標題錨點用 sec-N：中文標題轉 slug 不穩定，序號最可靠且不需編碼 */
function renderMarkdown(md) {
  let html = marked.parse(md, { mangle: false, headerIds: false });
  const toc = [];
  let n = 0;
  html = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (_m, lvl, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const id = `sec-${++n}`;
    toc.push({ level: Number(lvl), text, id });
    return `<h${lvl}${attrs} id="${id}">${inner}</h${lvl}>`;
  });
  return { html, toc };
}

function formatDate(iso) {
  const [y, m, d] = String(iso).split('-');
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;
}

function absolute(pathOrUrl) {
  if (!pathOrUrl) return SITE.base + SITE.defaultImage;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return SITE.base + (pathOrUrl.startsWith('/') ? pathOrUrl : '/' + pathOrUrl);
}

// ---------------------------------------------------------------- 共用版型
// 站頭與站尾維持與其他公開頁一致（見 blog.html 既有結構）。
// depth = 目錄深度，用來決定相對路徑前綴。

function prefix(depth) {
  return '../'.repeat(depth);
}

function head({ title, description, canonicalPath, ogType = 'article', image, depth, jsonLd, extra = '' }) {
  const p = prefix(depth);
  const url = SITE.base + canonicalPath;
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:locale" content="${SITE.locale}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(absolute(image))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(absolute(image))}">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE.name)} 文章" href="${SITE.base}/feed.xml">
<link rel="stylesheet" href="${p}brand.css">
<link rel="stylesheet" href="${p}blog.css">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Serif+TC:wght@600;700;900&display=swap" rel="stylesheet">
${jsonLd ? `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>` : ''}${extra}
</head>`;
}

function siteHeader(depth) {
  const p = prefix(depth);
  const links = [
    ['about.html', '認識我們'], ['blog.html', '文章'], ['tools.html', '探索工具'],
    ['courses.html', '課程'], ['services.html', '個人服務'], ['organizations.html', '組織方案'],
  ];
  const nav = links.map(([href, label]) =>
    `<a href="${p}${href}"${href === 'blog.html' ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const mobile = [['index.html', '首頁'], ...links].map(([href, label]) =>
    `<a href="${p}${href}"${href === 'blog.html' ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<a class="site-skip-link" href="#main-content">跳到主要內容</a>
<header class="site-header"><div class="site-container site-container--wide site-header__inner"><a class="site-brand" href="${p}index.html"><img src="${p}ormap-logo.png" alt=""><span>原味藍圖<small>生涯探索與人生設計</small></span></a><nav class="site-nav" aria-label="主要導覽">${nav}<a class="site-nav__account" href="${p}dashboard.html">我的空間</a></nav><details class="site-mobile-nav"><summary>選單</summary><nav class="site-mobile-nav__panel" aria-label="行動版導覽">${mobile}<a href="${p}dashboard.html">我的空間</a></nav></details></div></header>`;
}

function siteFooter(depth) {
  const p = prefix(depth);
  return `<footer class="site-footer"><div class="site-container site-footer__grid"><div><h2>原味藍圖 Ormap</h2><p>看懂自己的原味，建構想要的人生藍圖。</p></div><nav aria-label="品牌"><h3>認識原味藍圖</h3><a href="${p}about.html">品牌與方法</a><a href="${p}blog.html">文章與內容</a></nav><nav aria-label="產品"><h3>探索與服務</h3><a href="${p}tools.html">探索工具</a><a href="${p}courses.html">課程</a><a href="${p}services.html">個人服務</a><a href="${p}organizations.html">組織方案</a></nav><nav aria-label="網站資訊"><h3>網站資訊</h3><a href="${p}dashboard.html">我的空間</a><a href="${p}privacy.html">隱私權政策</a><a href="${p}terms.html">服務條款</a><a href="${p}feedback.html">意見回饋</a></nav></div><div class="site-container site-footer__legal">© 2026 原味藍圖 Ormap。文章內容與工具僅供探索與反思，不取代專業診斷或個別建議。</div></footer>`;
}

/**
 * 建構中說明區塊。使用者 2026-07-24 決策：誠實標示網站仍在建構，
 * 邀請讀者見證藍圖成形。文案為草稿，待使用者定稿。
 * 電子報訂閱表單在供應商確定並實際串接前不放（AGENTS.md §7 禁止假 CTA）。
 */
function buildingNotice() {
  return `<div class="site-note"><strong>這個網站還在蓋。</strong>原味藍圖正在一塊一塊成形——有些地方已經可以用，有些還在施工。我們選擇公開這個過程，邀請你一起看著它長出來。改版期間可能會有變動，先謝謝你的包容。</div>`;
}

// ---------------------------------------------------------------- 讀取文章

function loadPosts() {
  if (!existsSync(POSTS_DIR)) return [];
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const posts = [];
  const seenSlugs = new Set();

  for (const file of files) {
    const raw = readFileSync(join(POSTS_DIR, file), 'utf8');
    const parsed = parseFrontmatter(raw, file);
    if (!parsed) continue;
    const { data, body } = parsed;

    if (data.draft === true) continue;

    // 必填欄位
    for (const key of ['title', 'description', 'category', 'date']) {
      if (!data[key]) fail(file, `缺少必填欄位 ${key}`);
    }
    if (data.category && !CATEGORIES[data.category]) {
      fail(file, `分類 "${data.category}" 不存在。可用：${Object.keys(CATEGORIES).join(' / ')}`);
    }
    if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      fail(file, `date 必須是 YYYY-MM-DD 格式，目前是 "${data.date}"`);
    }

    const slug = (data.slug || basename(file, '.md')).trim();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      fail(file, `slug "${slug}" 只能用小寫英數與連字號。請在 frontmatter 指定 slug，或把檔名改成英數`);
    }
    if (seenSlugs.has(slug)) fail(file, `slug "${slug}" 與其他文章重複`);
    seenSlugs.add(slug);

    if (!body.trim()) fail(file, '沒有正文內容');

    const { html, toc } = renderMarkdown(body);
    posts.push({
      file, slug, toc, html,
      title: data.title,
      seoTitle: data.seo_title || `${data.title}｜${SITE.shortName}`,
      description: data.description,
      category: data.category,
      tags: Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []),
      cover: data.cover || '',
      date: data.date,
      updated: data.updated || data.date,
      author: data.author || SITE.defaultAuthor,
    });
  }

  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return posts;
}

// ---------------------------------------------------------------- 文章頁

function renderPost(post, allPosts) {
  const cat = CATEGORIES[post.category];
  const url = `/blog/${post.slug}.html`;
  const related = allPosts.filter(p => p.category === post.category && p.slug !== post.slug).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated,
    image: absolute(post.cover),
    inLanguage: 'zh-Hant-TW',
    mainEntityOfPage: { '@type': 'WebPage', '@id': SITE.base + url },
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization', name: SITE.name,
      logo: { '@type': 'ImageObject', url: SITE.base + SITE.defaultImage },
    },
    articleSection: cat.name,
    keywords: post.tags.join(', ') || undefined,
  };

  const tocHtml = post.toc.length >= 2
    ? `<nav class="post-toc" aria-label="本文目錄"><p class="post-toc__title">本文目錄</p><ol>${
        post.toc.map(h => `<li class="post-toc__l${h.level}"><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`).join('')
      }</ol></nav>`
    : '';

  const tagsHtml = post.tags.length
    ? `<ul class="post-tags" aria-label="標籤">${post.tags.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
    : '';

  const relatedHtml = related.length
    ? `<section class="site-section site-section--sand"><div class="site-container"><div class="site-section__head"><p class="site-eyebrow">同分類文章</p><h2>繼續讀「${escapeHtml(cat.name)}」</h2></div><div class="site-grid site-grid--3">${
        related.map(p => postCard(p, 1)).join('')
      }</div></div></section>`
    : '';

  return `${head({
    title: post.seoTitle, description: post.description, canonicalPath: url,
    ogType: 'article', image: post.cover, depth: 1, jsonLd,
  })}
<body class="site-page post-page">
${siteHeader(1)}
<main id="main-content">
  <article class="post">
    <header class="post__head"><div class="site-container site-container--narrow">
      <nav class="site-breadcrumb" aria-label="麵包屑"><a href="../index.html">首頁</a><span aria-hidden="true">／</span><a href="../blog.html">文章</a><span aria-hidden="true">／</span><a href="category/${post.category}.html">${escapeHtml(cat.name)}</a><span aria-hidden="true">／</span><span aria-current="page">${escapeHtml(post.title)}</span></nav>
      <p class="site-eyebrow">${escapeHtml(cat.name)}</p>
      <h1 class="site-title">${escapeHtml(post.title)}</h1>
      <p class="site-lead">${escapeHtml(post.description)}</p>
      <p class="post__meta"><span>${escapeHtml(post.author)}</span><span aria-hidden="true">·</span><time datetime="${post.date}">${formatDate(post.date)}</time>${
        post.updated !== post.date ? `<span aria-hidden="true">·</span><span>更新於 ${formatDate(post.updated)}</span>` : ''
      }</p>
    </div></header>
    ${post.cover ? `<div class="site-container site-container--narrow"><img class="post__cover" src="${escapeHtml(post.cover)}" alt="" loading="lazy"></div>` : ''}
    <div class="site-container site-container--narrow post__body-wrap">
      ${tocHtml}
      <div class="post__body">${post.html}</div>
      ${tagsHtml}
    </div>
    <div class="site-container site-container--narrow">${buildingNotice()}</div>
  </article>
  ${relatedHtml}
</main>
${siteFooter(1)}
<script>
/* 目錄高亮：標出「閱讀線以上最後一個標題」。
   刻意不用 IntersectionObserver —— 它只在標題剛好落在觀察帶時才觸發，
   標題間距大的時候會出現沒有任何項目被高亮的空窗。用捲動位置直接判斷，
   永遠會有一個項目是當前段落。 */
(function () {
  var toc = document.querySelector('.post-toc');
  if (!toc) return;
  var links = Array.prototype.slice.call(toc.querySelectorAll('a'));
  var heads = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var ticking = false;

  function update() {
    ticking = false;
    var line = window.innerHeight * 0.25;   // 閱讀線
    var active = 0;
    for (var i = 0; i < heads.length; i++) {
      if (heads[i] && heads[i].getBoundingClientRect().top <= line) active = i;
    }
    for (var j = 0; j < links.length; j++) {
      if (j === active) links[j].setAttribute('aria-current', 'true');
      else links[j].removeAttribute('aria-current');
    }
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();
</script>
</body>
</html>
`;
}

function postCard(post, depth) {
  const p = prefix(depth);
  const cat = CATEGORIES[post.category];
  return `<article class="site-card site-card--link post-card"><a href="${p}blog/${post.slug}.html">${
    post.cover ? `<img class="post-card__cover" src="${escapeHtml(post.cover)}" alt="" loading="lazy">` : ''
  }<span class="site-card__meta">${escapeHtml(cat.name)}<span aria-hidden="true"> · </span><time datetime="${post.date}">${formatDate(post.date)}</time></span><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.description)}</p></a></article>`;
}

// ---------------------------------------------------------------- 列表頁

function renderList(posts) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `文章與內容｜${SITE.name}`,
    url: `${SITE.base}/blog.html`,
    inLanguage: 'zh-Hant-TW',
    blogPost: posts.slice(0, 20).map(p => ({
      '@type': 'BlogPosting', headline: p.title, url: `${SITE.base}/blog/${p.slug}.html`, datePublished: p.date,
    })),
  };

  const catCards = Object.entries(CATEGORIES).map(([key, c]) => {
    const n = posts.filter(p => p.category === key).length;
    return n
      ? `<article class="site-card site-card--link"><a href="blog/category/${key}.html"><span class="site-status site-status--live">${n} 篇文章</span><h3>${c.name}</h3><p>${c.desc}</p></a></article>`
      : `<article class="site-card site-card--muted"><span class="site-status site-status--plan">文章準備中</span><h3>${c.name}</h3><p>${c.desc}</p></article>`;
  }).join('');

  const body = posts.length
    ? `<section class="site-section"><div class="site-container"><div class="site-section__head"><p class="site-eyebrow">最新文章</p><h2>目前共 ${posts.length} 篇</h2></div><div class="site-grid site-grid--3">${posts.map(p => postCard(p, 0)).join('')}</div></div></section>`
    : `<section class="site-section"><div class="site-container"><div class="site-section__head"><p class="site-eyebrow">內容建構中</p><h2>第一篇文章正在寫</h2><p>文章庫尚未有已發布的內容。下面是規劃中的三個內容方向。</p></div></div></section>`;

  return `${head({
    title: `文章與內容｜${SITE.name}`,
    description: '原味藍圖的文章與觀點：把模糊的職涯、生涯與組織問題，慢慢讀成可以行動的線索。',
    canonicalPath: '/blog.html', ogType: 'website', image: '', depth: 0, jsonLd,
  })}
<body class="site-page">
${siteHeader(0)}
<main id="main-content">
  <section class="site-page-hero"><div class="site-container"><nav class="site-breadcrumb" aria-label="麵包屑"><a href="index.html">首頁</a><span aria-hidden="true">／</span><span aria-current="page">文章</span></nav>${
    posts.length ? '' : '<span class="site-status site-status--build">內容架構建構中</span>'
  }<p class="site-eyebrow">Ideas &amp; Stories</p><h1 class="site-title">把模糊的問題，<br>慢慢讀成可以行動的線索。</h1><p class="site-lead">這裡收錄文章與觀點，協助你理解自己、研究環境，也更知道什麼時候適合使用工具、上課或尋求進一步支持。</p><div class="site-actions"><a class="site-button" href="tools.html">先從探索工具開始</a><a class="site-button site-button--secondary" href="about.html">認識我們的方法</a></div></div></section>
  ${body}
  <section class="site-section site-section--sand"><div class="site-container"><div class="site-section__head"><p class="site-eyebrow">內容分類</p><h2>從三個面向找到內容</h2></div><div class="site-grid site-grid--3">${catCards}</div></div></section>
  <section class="site-section"><div class="site-container site-container--narrow">${buildingNotice()}</div></section>
</main>
${siteFooter(0)}
</body>
</html>
`;
}

// ---------------------------------------------------------------- 分類頁

function renderCategory(key, posts) {
  const c = CATEGORIES[key];
  const list = posts.filter(p => p.category === key);
  return `${head({
    title: `${c.name}｜文章與內容｜${SITE.shortName}`,
    description: c.desc, canonicalPath: `/blog/category/${key}.html`,
    ogType: 'website', image: '', depth: 2,
  })}
<body class="site-page">
${siteHeader(2)}
<main id="main-content">
  <section class="site-page-hero"><div class="site-container"><nav class="site-breadcrumb" aria-label="麵包屑"><a href="../../index.html">首頁</a><span aria-hidden="true">／</span><a href="../../blog.html">文章</a><span aria-hidden="true">／</span><span aria-current="page">${escapeHtml(c.name)}</span></nav><p class="site-eyebrow">內容分類</p><h1 class="site-title">${escapeHtml(c.name)}</h1><p class="site-lead">${escapeHtml(c.desc)}</p></div></section>
  <section class="site-section"><div class="site-container">${
    list.length
      ? `<div class="site-section__head"><h2>共 ${list.length} 篇</h2></div><div class="site-grid site-grid--3">${list.map(p => postCard(p, 2)).join('')}</div>`
      : '<div class="site-section__head"><h2>這個分類還沒有文章</h2><p>內容正在準備中。</p></div>'
  }</div></section>
  <section class="site-section site-section--sand"><div class="site-container site-container--narrow"><div class="site-actions"><a class="site-button" href="../../blog.html">回到所有文章</a></div></div></section>
</main>
${siteFooter(2)}
</body>
</html>
`;
}

// ---------------------------------------------------------------- feed / sitemap

function renderFeed(posts) {
  const items = posts.slice(0, 30).map(p => `  <item>
    <title>${escapeXml(p.title)}</title>
    <link>${SITE.base}/blog/${p.slug}.html</link>
    <guid isPermaLink="true">${SITE.base}/blog/${p.slug}.html</guid>
    <pubDate>${new Date(`${p.date}T08:00:00+08:00`).toUTCString()}</pubDate>
    <category>${escapeXml(CATEGORIES[p.category].name)}</category>
    <description>${escapeXml(p.description)}</description>
  </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(SITE.name)}</title>
  <link>${SITE.base}/blog.html</link>
  <atom:link href="${SITE.base}/feed.xml" rel="self" type="application/rss+xml" />
  <description>${escapeXml('原味藍圖的文章與觀點：把模糊的職涯、生涯與組織問題，慢慢讀成可以行動的線索。')}</description>
  <language>zh-Hant-TW</language>
${items}
</channel>
</rss>
`;
}

function renderSitemap(posts) {
  const urls = [
    ...STATIC_PUBLIC_PAGES,
    '/blog.html',
    ...Object.keys(CATEGORIES).filter(k => posts.some(p => p.category === k)).map(k => `/blog/category/${k}.html`),
    ...posts.map(p => `/blog/${p.slug}.html`),
  ];
  const lastmod = Object.fromEntries(posts.map(p => [`/blog/${p.slug}.html`, p.updated]));
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- 由 scripts/build-content.mjs 產生，請勿手動編輯 -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE.base}${u}</loc>${lastmod[u] ? `<lastmod>${lastmod[u]}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
}

// ---------------------------------------------------------------- 主流程

function main() {
  const posts = loadPosts();

  if (errors.length) {
    console.error('\n內容檢查沒過，這次不產生任何檔案：\n');
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error('\n修正上面的問題後再跑一次。線上網站維持前一版，不受影響。\n');
    process.exit(1);
  }

  // 清掉舊產生物，避免刪掉的文章留下孤兒頁面
  if (existsSync(OUT_BLOG_DIR)) rmSync(OUT_BLOG_DIR, { recursive: true, force: true });
  mkdirSync(join(OUT_BLOG_DIR, 'category'), { recursive: true });

  for (const post of posts) {
    writeFileSync(join(OUT_BLOG_DIR, `${post.slug}.html`), renderPost(post, posts), 'utf8');
  }
  for (const key of Object.keys(CATEGORIES)) {
    writeFileSync(join(OUT_BLOG_DIR, 'category', `${key}.html`), renderCategory(key, posts), 'utf8');
  }
  writeFileSync(join(ROOT, 'blog.html'), renderList(posts), 'utf8');
  writeFileSync(join(ROOT, 'feed.xml'), renderFeed(posts), 'utf8');
  writeFileSync(join(ROOT, 'sitemap.xml'), renderSitemap(posts), 'utf8');

  const byCat = Object.entries(CATEGORIES)
    .map(([k, c]) => `${c.name} ${posts.filter(p => p.category === k).length}`).join('、');
  console.log(`內容產生完成：${posts.length} 篇文章（${byCat}）`);
  console.log(`  blog.html、blog/<slug>.html、blog/category/*.html、feed.xml、sitemap.xml`);
}

main();
