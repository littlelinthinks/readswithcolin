/* =============================================================
 * READS WITH COLIN OS — AI 抽象层（Phase 6）
 * -------------------------------------------------------------
 * 设计红线（来自路线图 + 总纲）：
 *  - Provider 无关：默认走 OpenAI 兼容接口，任何家都能填。
 *  - Key 存 localStorage，绝不写死进代码仓库。
 *  - 无 Key / 未启用时，所有 AI 功能优雅降级（Ask My Library 退化为
 *    全文检索、语义搜索退化为本地分词近似），绝不崩溃、绝不伪造知识。
 *  - 所有 AI 输出都带 aiGenerated 标记，且必须经用户确认才入库。
 *  - 接地（Grounded）：AI 回答只能基于用户自己的数据库；无证据明确说
 *    "No evidence found in your library."，禁止幻觉补全。
 *  - API Key 安全：只存本机浏览器；提供配置 UI；不在控制台打印。
 * ============================================================= */

const KEY = 'rwc_ai_config';

const DEFAULTS = {
  enabled: false,
  endpoint: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKey: '',
  embeddingModel: 'text-embedding-3-small',
};

export function getAIConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULTS }; }
}

export function saveAIConfig(cfg) {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function aiEnabled() {
  const c = getAIConfig();
  return !!(c.enabled && c.apiKey && c.apiKey.trim());
}

/** 通用 chat 调用（OpenAI 兼容 /chat/completions） */
export async function aiChat(messages, { temperature = 0.3, json = false } = {}) {
  const c = getAIConfig();
  if (!aiEnabled()) throw new Error('AI 尚未配置：请在 Settings → AI 配置 填入 API Key 并启用');
  const body = { model: c.model, messages, temperature };
  if (json) body.response_format = { type: 'json_object' };
  const res = await fetch(`${c.endpoint.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.apiKey.trim()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`AI 调用失败（${res.status}）：${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/** Embeddings（用于真实语义搜索；未配置或无网络时返回 null → 降级本地） */
export async function aiEmbed(texts) {
  const c = getAIConfig();
  if (!aiEnabled() || !Array.isArray(texts) || !texts.length) return null;
  try {
    const res = await fetch(`${c.endpoint.replace(/\/$/, '')}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.apiKey.trim()}` },
      body: JSON.stringify({ model: c.embeddingModel, input: texts }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.data || []).map((d) => d.embedding);
  } catch { return null; }
}

export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** 中文友好分词：分隔符切词 + 二元 bigram。用于无 embedding 时的「语义近似」 */
export function tokenize(text) {
  const s = String(text || '').toLowerCase();
  const words = s.split(/[\s，。、；;：:.,!?！？""''《》()（）\-/]+/).filter(Boolean);
  const bigrams = [];
  const clean = s.replace(/[\s，。、；;：:.,!?！？""''《》()（）\-/]+/g, '');
  for (let i = 0; i < clean.length - 1; i++) bigrams.push(clean.slice(i, i + 2));
  return [...new Set([...words, ...bigrams])];
}

/** 本地语义近似得分：查询 token 在文本中的命中率（0~1） */
export function localSemanticScore(query, text) {
  const q = tokenize(query);
  if (!q.length) return 0;
  const tset = new Set(tokenize(text));
  let hit = 0;
  for (const tok of q) if (tset.has(tok)) hit++;
  return hit / q.length;
}

/** 把模型可能返回的 ```json 包裹或裸文本安全解析为对象 */
export function safeJson(raw, fallback = {}) {
  if (typeof raw !== 'string') return fallback;
  let s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(s); } catch {
    try { return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); } catch { return fallback; }
  }
}
