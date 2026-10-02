/* =============================================================
 * READS WITH COLIN OS — 数据层（Phase 1）
 * -------------------------------------------------------------
 * 当前适配器：IndexedDB（本地优先，离线可用，长期持久化）
 * 未来适配器：Supabase / PostgreSQL —— 只需实现同样的 Adapter 接口，
 *             把 createAdapter() 的返回值换成 SupabaseAdapter 即可，
 *             业务层（store.js / views.js）无需任何改动。
 *
 * Adapter 接口（所有方法均返回 Promise）：
 *   all(store)                  取全表
 *   get(store, id)              按主键取一条
 *   put(store, obj)             写入（存在则覆盖）
 *   bulkPut(store, arr)         批量写入（单事务）
 *   del(store, id)              删除
 *   byIndex(store, idx, val)    按索引查询
 *   clear(store)                清空单表
 *   dump()                      导出全部表 → JSON 对象
 *   restore(json)               从 JSON 全量恢复
 *   wipe()                      清空全部数据
 * ============================================================= */

export const DB_NAME = 'rwc-os';
export const DB_VERSION = 2;

/* -------------------------------------------------------------
 * SCHEMA —— 九张核心表（对应 PRD 第五~十四条）
 * keyPath 一律为 id；索引用于筛选与关联查询
 * ----------------------------------------------------------- */
export const SCHEMA = {
  // 五、Books
  books: {
    keyPath: 'id',
    indexes: {
      status: 'status',          // to_read | reading | completed | rereading
      category: 'category',
      author: 'author',
      title: 'title',
      updatedAt: 'updatedAt',
      topics: 'topics',          // multiEntry
    },
    sample: {
      id: '',
      title: '', titleEn: '', author: '', translator: '', authors: [],
      year: '', country: '', category: '', topics: [],
      publisher: '', isbn: '', language: '', edition: '',
      startDate: '', finishDate: '', status: 'to_read', format: '',
      readingCount: '', rating: '', totalPages: '',
      oneLineSummary: '', coreQuestion: '', coreIdeas: [],
      relatedBookIds: [], source: '', notes: '',
      needsReview: false, reviewReasons: [],
      createdAt: '', updatedAt: '',
    },
  },

  // 七、Daily Reading Log
  logs: {
    keyPath: 'id',
    indexes: { bookId: 'bookId', date: 'date', createdAt: 'createdAt' },
    sample: {
      id: '', bookId: '', date: '',
      chapter: '', pagesFrom: '', pagesTo: '',
      minutes: '',
      summary: '', importantIdea: '', interpretation: '',
      question: '', disagreement: '', actionText: '',
      createdAt: '',
    },
  },

  // 九、Ideas
  ideas: {
    keyPath: 'id',
    indexes: {
      bookId: 'bookId', date: 'date', createdAt: 'createdAt',
      tags: 'tags', // multiEntry
    },
    sample: {
      id: '', bookId: '', date: '',
      idea: '', interpretation: '', whyImportant: '',
      evidenceIds: [], application: '', relatedBookIds: [],
      tags: [], aiGenerated: false, createdAt: '', updatedAt: '',
    },
  },

  // 十、Evidence（严格区分类型，绝不让「作者说」显示为「事实」）
  evidence: {
    keyPath: 'id',
    indexes: { type: 'type', bookId: 'bookId', ideaId: 'ideaId', createdAt: 'createdAt' },
    sample: {
      id: '',
      type: 'author_claim', // author_claim | book_fact | historical_fact | research | my_inference
      content: '', source: '', bookId: '', ideaId: '',
      confidence: '', aiGenerated: false, createdAt: '',
    },
  },

  // 十一、Connections（跨书连接 —— 未来知识图谱的基础）
  connections: {
    keyPath: 'id',
    indexes: { fromId: 'fromId', toId: 'toId', relation: 'relation', createdAt: 'createdAt' },
    sample: {
      id: '',
      fromType: 'idea', fromId: '',
      toType: 'idea',   toId: '',
      relation: 'similar', // similar | conflict | complementary | causal | extension | correction
      newUnderstanding: '', aiGenerated: false, createdAt: '',
    },
  },

  // 十二、Actions
  actions: {
    keyPath: 'id',
    indexes: { status: 'status', sourceId: 'sourceId', category: 'category', createdAt: 'createdAt' },
    sample: {
      id: '',
      sourceType: 'idea', sourceId: '',
      action: '', category: '', expectedResult: '', actualResult: '',
      status: 'todo', // todo | doing | done | cancelled | deferred
      review: '', principleId: '', dueDate: '', completedAt: '', createdAt: '',
    },
  },

  // 十三、Decision Journal
  decisions: {
    keyPath: 'id',
    indexes: { date: 'date', bookId: 'bookId', principleId: 'principleId', createdAt: 'createdAt' },
    sample: {
      id: '', decision: '', date: '',
      background: '', facts: '', unknowns: '', assumptions: '',
      mentalModel: '', alternatives: '', choice: '', reason: '',
      result: '', review: '', bookId: '', principleId: '', createdAt: '',
    },
  },

  // 十四、Principle Library（最终知识资产，不能由摘录自动升级）
  principles: {
    keyPath: 'id',
    indexes: { status: 'status', lastReview: 'lastReview', createdAt: 'createdAt' },
    sample: {
      id: '', principle: '',
      sourceBookIds: [], sourceIdeaIds: [], evidenceIds: [],
      conditions: '', exceptions: '', risks: '', applications: '',
      result: '', lastReview: '', stillValid: true,
      status: 'active', // active | archived
      createdAt: '', updatedAt: '',
    },
  },

  // 十五、Review System
  reviews: {
    keyPath: 'id',
    indexes: { period: 'period', periodKey: 'periodKey', createdAt: 'createdAt' },
    sample: {
      id: '', period: 'weekly', // daily | weekly | monthly | quarterly | yearly
      periodKey: '', content: {}, createdAt: '',
    },
  },

  // 十六、发布草稿（复刻发布中台「起草→发布」流水线；与脑子里的 Ideas 分开存）
  drafts: {
    keyPath: 'id',
    indexes: { status: 'status', updatedAt: 'updatedAt', createdAt: 'createdAt' },
    sample: {
      id: '',
      title: '', titleEn: '', summary: '', summaryEn: '',
      body: '', bodyEn: '',
      status: 'draft',           // seed | draft | ready | published
      lang: 'zh',                // zh | en | bi
      slug: '',
      series: '',
      channels: ['thecolin'],    // thecolin | readswithcolin | wechat
      publish: { status: 'none', publishedAt: '', urls: {}, error: '' },
      createdAt: '', updatedAt: '',
    },
  },

  // 系统表：设置、ID 计数器、备份元信息
  meta: {
    keyPath: 'key',
    indexes: {},
    sample: { key: 'counters', value: {} },
  },
};

export const STORES = Object.keys(SCHEMA);

/* ---------------------- IndexedDB 底层 ---------------------- */
let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      for (const [name, def] of Object.entries(SCHEMA)) {
        if (!db.objectStoreNames.contains(name)) {
          const os = db.createObjectStore(name, { keyPath: def.keyPath });
          for (const [idx, path] of Object.entries(def.indexes)) {
            os.createIndex(idx, path, { multiEntry: path === 'topics' || path === 'tags' });
          }
        }
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(storeNames, mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(storeNames, mode);
    const out = fn(t);
    t.oncomplete = () => resolve(out && out.__p ? out.__p : out);
    t.onabort = t.onerror = () => reject(t.error);
  }));
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* ---------------------- Adapter 实现 ---------------------- */
export const db = {
  async all(store) {
    const dbh = await openDB();
    return promisify(dbh.transaction(store, 'readonly').objectStore(store).getAll());
  },
  async get(store, id) {
    const dbh = await openDB();
    return promisify(dbh.transaction(store, 'readonly').objectStore(store).get(id));
  },
  async put(store, obj) {
    const dbh = await openDB();
    return promisify(dbh.transaction(store, 'readwrite').objectStore(store).put(obj));
  },
  async bulkPut(store, arr) {
    const dbh = await openDB();
    const t = dbh.transaction(store, 'readwrite');
    const os = t.objectStore(store);
    arr.forEach((o) => os.put(o));
    return new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
  },
  async del(store, id) {
    const dbh = await openDB();
    return promisify(dbh.transaction(store, 'readwrite').objectStore(store).delete(id));
  },
  async byIndex(store, idx, val) {
    const dbh = await openDB();
    return promisify(dbh.transaction(store, 'readonly').objectStore(store).index(idx).getAll(val));
  },
  async clear(store) {
    const dbh = await openDB();
    return promisify(dbh.transaction(store, 'readwrite').objectStore(store).clear());
  },
  async dump() {
    const out = { __app: 'READS WITH COLIN OS', __version: DB_VERSION, __exportedAt: new Date().toISOString() };
    for (const s of STORES) out[s] = await db.all(s);
    return out;
  },
  async restore(json, { merge = false } = {}) {
    for (const s of STORES) {
      if (!Array.isArray(json[s])) continue;
      if (!merge) await db.clear(s);
      await db.bulkPut(s, json[s]);
    }
    return true;
  },
  async wipe() {
    for (const s of STORES) await db.clear(s);
    return true;
  },
};

/* ---------------------- ID 生成器 ----------------------
 * 稳定、可读、永不复用：BK-0001 / ID-0012 / AC-0003 …
 * 导入 Excel / JSON 时已有 ID 一律保留，缺失才补发（PRD 第十九条）
 * ----------------------------------------------------- */
const PREFIX = {
  books: 'BK', logs: 'LG', ideas: 'ID', evidence: 'EV', connections: 'CN',
  actions: 'AC', decisions: 'DC', principles: 'PR', reviews: 'RV',
};

export async function nextId(store) {
  const rec = (await db.get('meta', 'counters')) || { key: 'counters', value: {} };
  const value = rec.value || {};
  const p = PREFIX[store] || 'XX';
  const n = (value[p] || 0) + 1;
  value[p] = n;
  await db.put('meta', { key: 'counters', value });
  return `${p}-${String(n).padStart(4, '0')}`;
}

/** 导入时把外部数据里的 ID 同步进计数器，避免以后发号撞车 */
export async function syncCounters(rowsByStore) {
  const rec = (await db.get('meta', 'counters')) || { key: 'counters', value: {} };
  const value = rec.value || {};
  for (const [store, rows] of Object.entries(rowsByStore || {})) {
    const p = PREFIX[store];
    if (!p || !Array.isArray(rows)) continue;
    for (const r of rows) {
      const m = /^([A-Z]{2})-(\d+)$/.exec(String(r.id || ''));
      if (m && m[1] === p) value[p] = Math.max(value[p] || 0, parseInt(m[2], 10));
    }
  }
  await db.put('meta', { key: 'counters', value });
}

export const nowISO = () => new Date().toISOString();
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
