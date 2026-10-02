/* =============================================================
 * READS WITH COLIN OS — 发布模块（Phase 6.5）
 * -------------------------------------------------------------
 * 复刻发布中台（os-pwa）的「起草 → 发布」能力，但完全独立、不改动 os-pwa。
 *
 * 后端复用同一个 Vercel Serverless：POST <endpoint>  +  X-OS-Token 头
 *   - 该接口已开启 CORS（Access-Control-Allow-Origin: *）并放行 X-OS-Token，
 *     因此 rwc-os（部署在 readswithcolin.com）可以跨域直接调用，无需改动后端。
 *
 * 公众号不进后端（无 API），走「复制到剪贴板」富文本方案，和 os-pwa 一致。
 * ============================================================= */

const CFG_KEY = 'rwc_publish_config';

export function getPublishConfig() {
  try {
    const c = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
    return {
      endpoint: c.endpoint || 'https://www.thecolin.vip/api/publish',
      token: c.token || '',
    };
  } catch {
    return { endpoint: 'https://www.thecolin.vip/api/publish', token: '' };
  }
}

export function savePublishConfig(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify({
    endpoint: (cfg.endpoint || 'https://www.thecolin.vip/api/publish').trim(),
    token: (cfg.token || '').trim(),
  }));
}

export function publishEnabled() {
  const c = getPublishConfig();
  return !!(c.endpoint && c.token);
}

/* slug：英文/数字直接转 kebab-case；中文留空交给后端用拼音兜底；过短用 fallback */
export function slugify(text, fallback) {
  const raw = String(text || '').trim().toLowerCase();
  const base = raw
    .replace(/['’"“”,.!?;:、。！？；：（）()《》<>【】\[\]—–~·…]/g, '')
    .replace(/[\u4e00-\u9fa5]+/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (base.length >= 2) return base.slice(0, 60);
  return String(fallback || 'post').toLowerCase().replace(/[^\w-]/g, '');
}

/* 发布一条草稿（draft 来自 store.drafts 的一条记录） */
export async function publishDraft(draft) {
  const cfg = getPublishConfig();
  if (!cfg.token) return { ok: false, error: 'no-token', status: 401 };
  if (!draft.title || !draft.body) return { ok: false, error: '标题与正文必填' };

  const targets = (draft.channels || []).filter((c) => c !== 'wechat'); // 公众号走剪贴板
  if (!targets.length) return { ok: false, error: '请至少勾选一个发布渠道（写作站 / 读书站）' };

  const slug = draft.slug || slugify(draft.titleEn || draft.title, draft.id);
  const payload = {
    id: draft.id,
    slug,
    lang: draft.lang || 'zh',
    title: draft.title,
    titleEn: draft.titleEn || '',
    summary: draft.summary || '',
    summaryEn: draft.summaryEn || '',
    body: draft.body || '',
    bodyEn: draft.bodyEn || '',
    series: draft.series || '',
    channels: targets,
  };

  try {
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OS-Token': cfg.token },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      if (res.status === 403) savePublishConfig({ ...cfg, token: '' }); // 口令错 → 清空，下次重填
      return { ok: false, error: data.error || ('HTTP ' + res.status), status: res.status };
    }
    return { ok: true, urls: data.urls || {}, partial: !!data.partial, error: data.error || '' };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

/* ===================== 公众号草稿（剪贴板富文本） ===================== */
function md2htmlLite(md) {
  if (!md) return '';
  const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => escHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  const out = [];
  let inQuote = false, inList = null;
  const close = () => {
    if (inQuote) { out.push('</blockquote>'); inQuote = false; }
    if (inList) { out.push(`</${inList}>`); inList = null; }
  };
  for (const raw of String(md).replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) { close(); continue; }
    const h = line.match(/^(###?)\s+(.*)$/);
    if (h) { close(); out.push(h[1].length === 2 ? `<h2>${inline(h[2])}</h2>` : `<h3>${inline(h[2])}</h3>`); continue; }
    if (/^(---|\*\*\*)\s*$/.test(line)) { close(); out.push('<hr>'); continue; }
    const q = line.match(/^>\s?(.*)$/);
    if (q) {
      if (inList) { out.push(`</${inList}>`); inList = null; }
      if (!inQuote) { out.push('<blockquote>'); inQuote = true; }
      out.push(`<p>${inline(q[1])}</p>`);
      continue;
    }
    const ul = line.match(/^[-*+]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ul || ol) {
      const want = ul ? 'ul' : 'ol';
      if (inList !== want) { close(); out.push(`<${want}>`); inList = want; }
      out.push(`<li>${inline((ul || ol)[1])}</li>`);
      continue;
    }
    close();
    out.push(`<p>${inline(line)}</p>`);
  }
  close();
  return out.join('\n');
}

export function buildWechatHtml(it) {
  const styleP = 'margin:0 0 18px;font-size:16px;line-height:1.9;letter-spacing:.5px;color:#333;';
  const styleH2 = 'margin:32px 0 16px;font-size:19px;font-weight:700;color:#111;';
  const styleH3 = 'margin:24px 0 12px;font-size:17px;font-weight:700;color:#111;';
  const styleQ = 'margin:18px 0;padding:12px 16px;background:#f8f6f0;border-left:3px solid #C9A84C;color:#555;font-style:italic;';
  const escT = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const body = md2htmlLite(it.body || it.summary || '')
    .replace(/<h2>/g, `<h2 style="${styleH2}">`)
    .replace(/<h3>/g, `<h3 style="${styleH3}">`)
    .replace(/<p>/g, `<p style="${styleP}">`)
    .replace(/<blockquote>/g, `<blockquote style="${styleQ}">`)
    .replace(/<li>/g, '<li style="margin:0 0 8px;font-size:16px;line-height:1.9;color:#333;">');
  const sub = it.summary
    ? `<p style="margin:0 0 24px;padding:0 0 20px;border-bottom:1px solid #eee;font-size:15px;color:#888;line-height:1.8;">${escT(it.summary)}</p>`
    : '';
  return `<section style="max-width:578px;margin:0 auto;font-family:-apple-system,'Noto Serif SC',Georgia,serif;">
<h1 style="margin:0 0 8px;font-size:23px;font-weight:900;color:#111;line-height:1.4;">${escT(it.title)}</h1>
<p style="margin:0 0 20px;font-size:13px;color:#aaa;">小Lin思考</p>
${sub}
${body}
<p style="margin:36px 0 0;padding-top:20px;border-top:1px solid #eee;font-size:13px;color:#999;text-align:center;">© 小Lin思考 · 用道·术·器，重建你的认知操作系统</p>
</section>`;
}

export async function copyForWechat(draft) {
  const plain = [draft.title, '', draft.summary || '', '', draft.body || ''].join('\n');
  const html = buildWechatHtml(draft);
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([item]);
      return { ok: true, rich: true };
    }
    await navigator.clipboard.writeText(plain);
    return { ok: true, rich: false };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}
