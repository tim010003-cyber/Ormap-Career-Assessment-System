/**
 * providers.js — AI 供應商轉接層
 * =====================================================================
 * 從 tools/job-design/server/ai-proxy.mjs 移植而來，介面刻意保持一致：
 *   complete({ apiKey, model, system, user }) → { text, usage }
 *
 * 供應商可抽換的理由跟當初一樣：使用者的 Anthropic 帳戶曾經無法使用，
 * 換一家不該需要改前端。
 */

export const DEFAULT_MODEL = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-5',
};

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
      usage: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
      },
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
      usage: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
      },
    };
  },
};

export const isSupportedProvider = (p) => Object.hasOwn(PROVIDERS, p);

export function complete(provider, args) {
  const fn = PROVIDERS[provider];
  if (!fn) throw new Error(`未支援的供應商：${provider}`);
  return fn(args);
}

/** 從模型輸出取出 JSON（容忍被 ```json 包住的情況） */
export function parseJson(text) {
  const t = String(text || '').trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : t;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('模型沒有回傳 JSON');
  return JSON.parse(body.slice(start, end + 1));
}
