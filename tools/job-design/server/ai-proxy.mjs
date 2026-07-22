/**
 * ai-proxy.mjs — 職務設計 App 的本機 AI 代理
 * =====================================================================
 * 為什麼需要這支程式
 *   AI 供應商的 API Key 絕對不能放進瀏覽器（前端原始碼、DevTools、
 *   網路面板都看得到）。這支代理跑在你自己的電腦上，Key 只存在這裡，
 *   瀏覽器只跟 127.0.0.1 說話，永遠拿不到 Key。
 *
 * 設計
 *   - 零外部套件，只用 Node 內建模組（需 Node 18 以上，有內建 fetch）。
 *   - 只綁定 127.0.0.1，不對外開放。
 *   - 供應商可抽換：目前支援 OpenAI 與 Anthropic，介面一致，
 *     日後搬到 Cloud Functions 時前端不用改。
 *   - Key 存在同目錄的 .ai-config.json（已加入 .gitignore），
 *     或改用環境變數 AI_API_KEY。API 回應一律只回傳遮蔽後的 Key。
 *
 * 用法
 *   node tools/job-design/server/ai-proxy.mjs
 *   然後在 App 的「AI 設定」頁填入 Key。
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(DIR, '.ai-config.json');
const PORT = Number(process.env.AI_PROXY_PORT || 8788);

// 只允許本機的靜態伺服器來源
const ALLOWED_ORIGINS = [
  'http://127.0.0.1:8777', 'http://localhost:8777',
  'http://127.0.0.1:5000', 'http://localhost:5000',   // firebase serve
  'http://127.0.0.1:3000', 'http://localhost:3000',
];

// ── 設定存取 ──────────────────────────────────────────────
function readConfig() {
  let cfg = { provider: 'openai', model: '', apiKey: '' };
  try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; } catch { /* 尚未設定 */ }
  if (!cfg.apiKey && process.env.AI_API_KEY) cfg.apiKey = process.env.AI_API_KEY;
  return cfg;
}
function writeConfig(next) {
  const cfg = { ...readConfig(), ...next };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  return cfg;
}
const maskKey = (k) => !k ? '' : (k.length <= 12 ? '••••' : k.slice(0, 6) + '••••••' + k.slice(-4));

const DEFAULT_MODEL = { openai: 'gpt-4o', anthropic: 'claude-sonnet-5' };

// ── 供應商轉接層 ──────────────────────────────────────────
// 共同介面：complete({system, user, jsonSchema}) → { text, usage }
const PROVIDERS = {
  async openai({ apiKey, model, system, user }) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL.openai,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `OpenAI ${res.status}`);
    return {
      text: data.choices?.[0]?.message?.content || '',
      usage: { input: data.usage?.prompt_tokens || 0, output: data.usage?.completion_tokens || 0 },
    };
  },

  async anthropic({ apiKey, model, system, user }) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL.anthropic,
        max_tokens: 4096,
        temperature: 0.2,
        system: system + '\n\n只輸出 JSON，不要有其他文字或 markdown 標記。',
        messages: [{ role: 'user', content: user }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `Anthropic ${res.status}`);
    return {
      text: (data.content || []).filter(b => b.type === 'text').map(b => b.text).join(''),
      usage: { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 },
    };
  },
};

/** 從模型輸出中取出 JSON（容忍被 ```json 包住的情況） */
function parseJson(text) {
  const t = String(text || '').trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : t;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('模型沒有回傳 JSON');
  return JSON.parse(body.slice(start, end + 1));
}

// ── HTTP ────────────────────────────────────────────────
function send(res, code, obj, origin) {
  const headers = { 'content-type': 'application/json; charset=utf-8' };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-headers'] = 'content-type';
    headers['access-control-allow-methods'] = 'GET,POST,OPTIONS';
  }
  res.writeHead(code, headers);
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', d => {
      raw += d;
      if (raw.length > 2e6) { reject(new Error('請求過大')); req.destroy(); }
    });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') return send(res, 204, {}, origin);

  try {
    // 目前設定（永不回傳完整 Key）
    if (url.pathname === '/api/status') {
      const cfg = readConfig();
      return send(res, 200, {
        ok: true,
        provider: cfg.provider,
        model: cfg.model || DEFAULT_MODEL[cfg.provider] || '',
        hasKey: !!cfg.apiKey,
        keyMasked: maskKey(cfg.apiKey),
        fromEnv: !!process.env.AI_API_KEY,
        defaults: DEFAULT_MODEL,
      }, origin);
    }

    // 儲存設定
    if (url.pathname === '/api/config' && req.method === 'POST') {
      const body = await readBody(req);
      const next = {};
      const cur = readConfig();
      if (body.provider && PROVIDERS[body.provider]) next.provider = body.provider;
      if (typeof body.model === 'string') next.model = body.model.trim();
      // 換供應商時，舊的型號名稱在新供應商並不存在，沒重填就清掉改用預設
      if (next.provider && next.provider !== cur.provider && !next.model) next.model = '';
      if (typeof body.apiKey === 'string' && body.apiKey.trim()) next.apiKey = body.apiKey.trim();
      if (body.clearKey) next.apiKey = '';
      const cfg = writeConfig(next);
      return send(res, 200, { ok: true, provider: cfg.provider, model: cfg.model, hasKey: !!cfg.apiKey, keyMasked: maskKey(cfg.apiKey) }, origin);
    }

    // 連線測試
    if (url.pathname === '/api/test' && req.method === 'POST') {
      const cfg = readConfig();
      if (!cfg.apiKey) return send(res, 400, { ok: false, error: '尚未設定 API Key' }, origin);
      const r = await PROVIDERS[cfg.provider]({
        apiKey: cfg.apiKey, model: cfg.model,
        system: '你是一個測試回應器。只輸出 JSON。',
        user: '請回傳 {"ok":true,"message":"連線成功"}',
      });
      const parsed = parseJson(r.text);
      return send(res, 200, { ok: true, provider: cfg.provider, model: cfg.model || DEFAULT_MODEL[cfg.provider], reply: parsed, usage: r.usage }, origin);
    }

    // 實際的 AI 任務
    if (url.pathname === '/api/ai' && req.method === 'POST') {
      const cfg = readConfig();
      if (!cfg.apiKey) return send(res, 400, { ok: false, error: 'NO_KEY', message: '尚未設定 API Key' }, origin);
      const { system, user, taskCode } = await readBody(req);
      if (!system || !user) return send(res, 400, { ok: false, error: '缺少 system 或 user' }, origin);
      const started = Date.now();
      const r = await PROVIDERS[cfg.provider]({ apiKey: cfg.apiKey, model: cfg.model, system, user });
      let parsed;
      try { parsed = parseJson(r.text); }
      catch (e) { return send(res, 502, { ok: false, error: 'BAD_JSON', message: e.message, raw: r.text.slice(0, 500) }, origin); }
      console.log(`[${new Date().toLocaleTimeString('zh-TW')}] ${taskCode || 'AI'} · ${cfg.provider} · ${Date.now() - started}ms · in ${r.usage.input} / out ${r.usage.output}`);
      return send(res, 200, { ok: true, data: parsed, usage: r.usage, provider: cfg.provider, model: cfg.model || DEFAULT_MODEL[cfg.provider] }, origin);
    }

    send(res, 404, { ok: false, error: 'not found' }, origin);
  } catch (e) {
    console.error('錯誤：', e.message);
    send(res, 500, { ok: false, error: e.message }, origin);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const cfg = readConfig();
  console.log(`\n  AI 代理已啟動：http://127.0.0.1:${PORT}`);
  console.log(`  供應商：${cfg.provider}　模型：${cfg.model || DEFAULT_MODEL[cfg.provider]}`);
  console.log(`  API Key：${cfg.apiKey ? maskKey(cfg.apiKey) + (process.env.AI_API_KEY ? '（來自環境變數）' : '（來自設定檔）') : '尚未設定 — 請到 App 的「AI 設定」頁填入'}`);
  console.log(`  只綁定本機，不對外開放。按 Ctrl+C 結束。\n`);
});
