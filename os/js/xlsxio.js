/* =============================================================
 * READS WITH COLIN OS — Excel 导入 / 导出（PRD 第十九条）
 * -------------------------------------------------------------
 * 规则：
 *  1. 一张表 = 一个 Sheet，Sheet 名即表名（books / ideas / logs …）
 *  2. 列头 = 字段名，顺序与 SCHEMA.sample 一致
 *  3. 数组字段在 Excel 里用「；」分隔，导入时按 SCHEMA 还原为数组
 *  4. 已有 ID 一律原样保留，绝不重发号（否则跨表关联会断）
 * ============================================================= */

import { db, SCHEMA } from './db.js';
import { importRows } from './store.js';

const ARRAY_SEP = '；';

/** 导出全部表 → xlsx（浏览器端生成，无需服务器） */
export async function exportExcel() {
  const wb = globalThis.XLSX.utils.book_new();
  for (const [store, def] of Object.entries(SCHEMA)) {
    if (store === 'meta') continue;
    const rows = await db.all(store);
    const cols = Object.keys(def.sample);
    const aoa = [cols, ...rows.map((r) => cols.map((c) => flatten(r[c])))];
    const ws = globalThis.XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = cols.map((c) => ({ wch: Math.min(40, Math.max(10, c.length + 6)) }));
    globalThis.XLSX.utils.book_append_sheet(wb, ws, store);
  }
  const buf = globalThis.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `RWC-OS_${stamp()}.xlsx`);
}

function flatten(v) {
  if (Array.isArray(v)) return v.join(ARRAY_SEP);
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function unflatten(v, sample) {
  if (Array.isArray(sample)) {
    if (Array.isArray(v)) return v;
    return String(v || '').split(ARRAY_SEP).map((s) => s.trim()).filter(Boolean);
  }
  // 对象字段（如 reviews.content）：导出时被 JSON.stringify，导入要还原
  if (sample && typeof sample === 'object') {
    if (v && typeof v === 'object') return v;
    const s = String(v ?? '').trim();
    if (s.startsWith('{')) { try { return JSON.parse(s); } catch { /* 落回原值 */ } }
    return s ? s : { ...sample };
  }
  if (typeof sample === 'number') return Number(v) || 0;
  if (typeof sample === 'boolean') return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
  return v === undefined || v === null ? '' : v;
}

/** 导入 xlsx：返回 { store: {added, updated, skipped, needsReview} } */
export async function importExcel(file, onProgress) {
  const buf = await file.arrayBuffer();
  const wb = globalThis.XLSX.read(buf, { type: 'array' });
  const rowsByStore = {};
  for (const sheetName of wb.SheetNames) {
    if (!SCHEMA[sheetName] || sheetName === 'meta') continue;
    const rows = globalThis.XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    const sample = SCHEMA[sheetName].sample;
    rowsByStore[sheetName] = rows.map((r) => {
      const o = {};
      for (const [k, sv] of Object.entries(sample)) {
        if (r[k] === undefined) continue;
        o[k] = unflatten(r[k], sv);
      }
      // 未知列也保留（将来新增字段不丢数据）
      for (const [k, v] of Object.entries(r)) if (!(k in sample)) o[k] = v;
      return o;
    }).filter((o) => Object.values(o).some((v) => v !== '' && v !== null && v !== undefined));
  }
  return importRows(rowsByStore, onProgress);
}

/* ---------------------- 导入模板（豆包交付契约） ----------------------
 * 列顺序即《导入契约》，豆包按此导出 Excel/CSV 即可被一键读入。
 * 数组字段用「；」分隔；有 id 保留；缺书名跳过；缺 ISBN/作者标需复核。 */
export const BOOK_COLUMNS = [
  'id', 'title', 'titleEn', 'author', 'authors', 'translator',
  'isbn', 'publisher', 'year', 'language', 'edition', 'country',
  'category', 'topics', 'startDate', 'finishDate', 'status', 'format',
  'readingCount', 'rating', 'totalPages',
  'oneLineSummary', 'coreQuestion', 'coreIdeas',
  'source', 'relatedBookIds', 'notes',
];

/** 导出空模板（含表头 + 2 空行），供「下载导入模板」 */
export function exportTemplate() {
  const aoa = [BOOK_COLUMNS, ...Array(2).fill(BOOK_COLUMNS.map(() => ''))];
  const ws = globalThis.XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = BOOK_COLUMNS.map((c) => ({ wch: Math.min(40, Math.max(10, c.length + 6)) }));
  const wb = globalThis.XLSX.utils.book_new();
  globalThis.XLSX.utils.book_append_sheet(wb, ws, 'books');
  const buf = globalThis.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `RWC-OS_导入模板_${stamp()}.xlsx`);
}

/* ---------------------- JSON 备份 ---------------------- */
export async function exportJSON() {
  const { db: _db } = await import('./db.js');
  const dump = await _db.dump();
  downloadBlob(new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' }),
    `RWC-OS_backup_${stamp()}.json`);
  const { Backup } = await import('./store.js');
  await Backup.setLastBackup();
}

export function importJSON(file, merge) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = async () => {
      try {
        const json = JSON.parse(fr.result);
        const { Backup } = await import('./store.js');
        await Backup.restore(json, merge);
        resolve(json);
      } catch (e) { reject(e); }
    };
    fr.onerror = reject;
    fr.readAsText(file);
  });
}

/* ---------------------- 工具 ---------------------- */
function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}
