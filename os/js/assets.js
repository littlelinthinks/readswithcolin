/* =============================================================
 * READS WITH COLIN OS — 资产聚合层（跨站数据源）
 *  - 两站文章台账：thecolin.vip/os/assets/data/pipeline.json
 *  - 线上书籍：    readswithcolin.com/data/posts.json
 *  - 本地书籍/草稿：IndexedDB（store.Books / store.Drafts）
 * 所有网络请求均带超时与降级，失败不影响本机数据展示。
 * ============================================================= */

import { Books, Drafts } from './store.js';
import { getPublishConfig } from './publish.js';

const PIPELINE_URL = 'https://www.thecolin.vip/os/assets/data/pipeline.json';
const ONLINE_BOOKS_URL = 'https://www.readswithcolin.com/data/posts.json';
const FETCH_TIMEOUT = 9000;

/* 带超时的 JSON 拉取；失败返回 { ok:false }，绝不抛错 */
export async function fetchJSON(url, timeout = FETCH_TIMEOUT) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return { ok: true, data: await res.json(), status: res.status };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e), data: null };
  } finally {
    clearTimeout(t);
  }
}

export function bookOnlineUrl(slug) {
  return 'https://readswithcolin.com/posts/' + encodeURIComponent(slug) + '.html';
}
export function coverUrl(cover) {
  if (!cover) return '';
  if (/^https?:\/\//.test(cover)) return cover;
  return 'https://readswithcolin.com/' + cover.replace(/^\/+/, '');
}

/* ---------- 线上数据源 ---------- */
export async function loadPipeline() {
  const r = await fetchJSON(PIPELINE_URL);
  if (!r.ok) return { ok: false, error: r.error, items: [], updated: '' };
  const items = (r.data && r.data.items) || [];
  return { ok: true, items, updated: r.data.updated || '', error: '' };
}

export async function loadOnlineBooks() {
  const r = await fetchJSON(ONLINE_BOOKS_URL);
  if (!r.ok) return { ok: false, error: r.error, items: [], updated: '' };
  const items = (r.data && r.data.items) || [];
  return { ok: true, items, updated: r.data.updated || '', error: '' };
}

/* ---------- 本机数据源 ---------- */
export async function loadLocalBooks() {
  try { return (await Books.all()) || []; } catch { return []; }
}
export async function loadLocalDrafts() {
  try { return (await Drafts.all()) || []; } catch { return []; }
}

/* ---------- 合并：线上台账 baseline 与本机草稿 local（local 优先） ---------- */
export function mergePipeline(baseline = [], local = []) {
  const map = new Map();
  baseline.forEach((i) => map.set(i.id, normalizeItem(i)));
  local.forEach((i) => map.set(i.id, normalizeItem(i)));
  return Array.from(map.values());
}
function normalizeItem(i = {}) {
  const pub = i.publish || {};
  return {
    id: i.id || '',
    title: i.title || '(无标题)',
    summary: i.summary || '',
    status: i.status || 'draft',
    channels: Array.isArray(i.channels) ? i.channels : [],
    lang: i.lang || 'zh',
    slug: i.slug || '',
    publish: { status: pub.status || 'none', urls: pub.urls || {}, error: pub.error || '' },
    updated: i.updated || i.created || '',
    created: i.created || '',
  };
}

/* 两站链接徽标（来自 publish.urls） */
export function channelUrls(pub) {
  const urls = (pub && pub.urls) || {};
  return {
    thecolin: urls.thecolin || '',
    readswithcolin: urls.readswithcolin || '',
  };
}

/* ============================================================
 * 本机书籍 → 读书站 一键同步 / 导出
 * ========================================================== */
export const SYNC_BOOK_ENDPOINT = 'https://www.thecolin.vip/api/sync-book';

/* 把所有本机书籍导出为 JSON（用于备份 / 交接，零后端） */
export async function exportLocalBooks() {
  const books = await (await import('./store.js')).Books.all();
  return books || [];
}

/* 单本书同步到读书站：POST 到 sync-book 后端（复用发布口令鉴权） */
export async function syncBookToSite(book, endpoint) {
  const cfg = getPublishConfig();
  const token = cfg.token || '';
  const url = endpoint || cfg.syncEndpoint || SYNC_BOOK_ENDPOINT;
  if (!token) return { ok: false, error: 'no-token' };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OS-Token': token },
      body: JSON.stringify({ book }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) return { ok: true, slug: j.slug, url: j.url, mode: j.mode };
    if (r.status === 403) return { ok: false, error: 'bad-token' };
    return { ok: false, error: j.error || ('HTTP ' + r.status) };
  } catch (e) {
    return { ok: false, error: e.message || 'network' };
  }
}
