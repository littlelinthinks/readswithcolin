/* =============================================================
 * READS WITH COLIN OS — 业务仓储层
 * -------------------------------------------------------------
 * 这一层只依赖 db.js 的 Adapter 接口。将来换 Supabase，
 * 只要 createAdapter() 返回同样接口的实现，本文件零改动。
 *
 * 设计红线（来自 PRD）：
 *  - 第二十四条：不把产品做成「记录读过什么书」，而是记录
 *    「书如何改变思想、判断、行动」——所以 Dashboard 的核心指标
 *    是 Ideas / Actions / Decisions / Principles，不是 Books Read。
 *  - 第十条：Evidence 必须区分「作者主张」与「事实」，UI 上强制显示类型标签。
 *  - 第十九条：导入 Excel 不得破坏任何既有 ID。
 * ============================================================= */

import { db, nextId, syncCounters, nowISO, todayStr, SCHEMA } from './db.js';
import { aiEmbed, localSemanticScore, cosine, aiEnabled } from './ai.js';

export const STATUS = {
  book: {
    to_read:  'To Read',
    reading:  'Reading',
    completed:'Completed',
    rereading:'Rereading',
  },
  action: {
    todo: 'Todo', doing: 'Doing', done: 'Done', cancelled: 'Cancelled', deferred: 'Deferred',
  },
  evidence: {
    author_claim:    "作者主张",   // 不是事实
    book_fact:       "书中事实",
    historical_fact: "历史事实",
    research:        "研究证据",
    my_inference:    "我的推断",   // 不是事实
  },
  relation: {
    similar: '相似', conflict: '冲突', complementary: '互补',
    causal: '因果', extension: '延伸', correction: '修正',
  },
};

/* ---------------------- 通用 ---------------------- */
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

async function create(store, payload) {
  const base = { ...SCHEMA[store].sample };
  delete base.id;                       // sample 里的示例 ID 不能当成真实 ID
  const obj = clean({ ...base, ...payload });
  obj.id = payload.id || (await nextId(store));
  obj.createdAt = obj.createdAt || nowISO();
  if ('updatedAt' in base) obj.updatedAt = nowISO();
  await db.put(store, obj);
  return obj;
}

async function update(store, id, patch) {
  const cur = await db.get(store, id);
  if (!cur) throw new Error(`${store} ${id} not found`);
  const obj = { ...cur, ...clean(patch) };
  if ('updatedAt' in SCHEMA[store].sample) obj.updatedAt = nowISO();
  await db.put(store, obj);
  return obj;
}

/* ---------------------- Books（PRD 第五条） ---------------------- */
export const Books = {
  all: () => db.all('books').then((r) => r.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))),
  get: (id) => db.get('books', id),
  create: (p) => create('books', p),
  update: (id, p) => update('books', id, p),
  remove: (id) => db.del('books', id),

  /** 重复保护：同名同作者视为重复（PRD duplicate protection） */
  async findDuplicate(title, author, excludeId) {
    const t = (title || '').trim().toLowerCase();
    const a = (author || '').trim().toLowerCase();
    if (!t) return null;
    const all = await db.all('books');
    return all.find((b) => b.id !== excludeId
      && (b.title || '').trim().toLowerCase() === t
      && (!a || (b.author || '').trim().toLowerCase() === a)) || null;
  },

  /** 书籍的完整知识视图：日志 / 想法 / 证据 / 连接 / 行动 / 决策 / 复盘 */
  async detail(id) {
    const [book, logs, ideas, evidence, actions, decisions, reviews] = await Promise.all([
      db.get('books', id),
      db.byIndex('logs', 'bookId', id),
      db.byIndex('ideas', 'bookId', id),
      db.byIndex('evidence', 'bookId', id),
      db.all('actions'),
      db.all('decisions'),
      db.all('reviews'),
    ]);
    const connections = await connectionsForBook(id);
    const nodeIds = new Set([id, ...ideas.map((i) => i.id), ...logs.map((l) => l.id), ...evidence.map((e) => e.id)]);
    return {
      book,
      logs: logs.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
      ideas: ideas.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
      evidence,
      connections,
      actions: actions.filter((a) => nodeIds.has(a.sourceId)),
      decisions: decisions.filter((d) => d.bookId === id),
      reviews: reviews.filter((r) => (r.content?.bookIds || []).includes(id))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    };
  },

  /** 阅读进度：按日志已读页数 / 总页数 粗算，无总页数则按状态给出估值 */
  async progress(id) {
    const logs = await db.byIndex('logs', 'bookId', id);
    const book = await db.get('books', id);
    if (!book) return 0;
    if (book.status === 'completed') return 100;
    const pages = logs.reduce((s, l) => s + (Number(l.pagesTo || 0) - Number(l.pagesFrom || 0) || 0), 0);
    if (book.totalPages) return Math.min(99, Math.round((pages / book.totalPages) * 100));
    return Math.min(95, pages > 0 ? Math.min(95, 10 + logs.length * 7) : 0);
  },
};

/* ---------------------- Daily Log（PRD 第七条） ---------------------- */
export const Logs = {
  all: () => db.all('logs').then((r) => r.sort((a, b) => (b.date || '').localeCompare(a.date || ''))),
  byBook: (id) => db.byIndex('logs', 'bookId', id),
  create: (p) => create('logs', p),
  update: (id, p) => update('logs', id, p),
  remove: (id) => db.del('logs', id),
};

/* ---------------------- Ideas（PRD 第九条） ---------------------- */
export const Ideas = {
  all: () => db.all('ideas').then((r) => r.sort((a, b) => (b.date || '').localeCompare(a.date || ''))),
  byBook: (id) => db.byIndex('ideas', 'bookId', id),
  create: (p) => create('ideas', p),
  update: (id, p) => update('ideas', id, p),
  remove: (id) => db.del('ideas', id),
};

/* ---------------------- Evidence / Connections / Actions / Decisions / Principles ---------------------- */
export const Evidence = {
  all: () => db.all('evidence'),
  get: (id) => db.get('evidence', id),
  create: (p) => create('evidence', p),
  update: (id, p) => update('evidence', id, p),
  remove: (id) => db.del('evidence', id),
  /** 按类型分组 —— UI 上必须让「作者主张」与「事实」分列（PRD 第十条） */
  async grouped() {
    const all = await db.all('evidence');
    const out = {};
    for (const k of Object.keys(STATUS.evidence)) {
      out[k] = all.filter((e) => (e.type || 'author_claim') === k)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
    return out;
  },
};
export const Connections = {
  all: () => db.all('connections'),
  get: (id) => db.get('connections', id),
  create: (p) => create('connections', p),
  update: (id, p) => update('connections', id, p),
  remove: (id) => db.del('connections', id),
};
export const Actions = {
  all: () => db.all('actions'),
  get: (id) => db.get('actions', id),
  create: (p) => create('actions', p),
  update: (id, p) => update('actions', id, p),
  remove: (id) => db.del('actions', id),
  /** 状态流转：done 时记录完成时间 */
  async setStatus(id, status) {
    const patch = { status };
    if (status === 'done') patch.completedAt = todayStr();
    if (status !== 'done') patch.completedAt = '';
    return update('actions', id, patch);
  },
  /** 闭环：填实际结果即视为完成 */
  async complete(id, actualResult, review) {
    return update('actions', id, {
      status: 'done', actualResult, review: review || '', completedAt: todayStr(),
    });
  },
};
export const Decisions = {
  all: () => db.all('decisions'),
  get: (id) => db.get('decisions', id),
  create: (p) => create('decisions', p),
  update: (id, p) => update('decisions', id, p),
  remove: (id) => db.del('decisions', id),
};
export const Principles = {
  all: () => db.all('principles'),
  get: (id) => db.get('principles', id),
  create: (p) => create('principles', p),
  update: (id, p) => update('principles', id, p),
  remove: (id) => db.del('principles', id),
  /** 复审：更新复审日期与「是否仍然成立」（PRD 第十四条） */
  async review(id, stillValid, result) {
    return update('principles', id, {
      lastReview: todayStr(),
      stillValid: !!stillValid,
      result: result || '',
    });
  },
  archive: (id) => update('principles', id, { status: 'archived' }),
  activate: (id) => update('principles', id, { status: 'active' }),
};

/* ---------------------- Reviews（PRD 第十五条） ---------------------- */
export const Reviews = {
  all: () => db.all('reviews').then((r) => r.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))),
  get: (id) => db.get('reviews', id),
  create: (p) => create('reviews', p),
  update: (id, p) => update('reviews', id, p),
  remove: (id) => db.del('reviews', id),
  async findByKey(period, periodKey) {
    const all = await db.all('reviews');
    return all.find((r) => r.period === period && r.periodKey === periodKey) || null;
  },
};

/* ---------------------- 节点解析（Connections 与图谱共用） ---------------------- */
const NODE_STORES = ['ideas', 'logs', 'evidence', 'books'];
const NODE_TEXT = {
  ideas: (r) => r.idea,
  logs: (r) => r.summary || r.importantIdea,
  evidence: (r) => r.content,
  books: (r) => r.title,
};
const NODE_LABEL = { ideas: '思想', logs: '阅读记录', evidence: '证据', books: '书籍' };

/** 把一个 ID 解析成 { store, type, text, bookId, bookTitle } */
export async function resolveNode(id) {
  if (!id) return null;
  for (const s of NODE_STORES) {
    const r = await db.get(s, id);
    if (r) {
      const bookId = r.bookId || (s === 'books' ? r.id : '');
      const book = bookId && s !== 'books' ? await db.get('books', bookId) : (s === 'books' ? r : null);
      return {
        store: s, id,
        type: s === 'books' ? 'book' : s === 'ideas' ? 'idea' : s === 'logs' ? 'log' : 'evidence',
        typeLabel: NODE_LABEL[s],
        text: (NODE_TEXT[s](r) || '').slice(0, 120),
        bookId: bookId || '',
        bookTitle: book?.title || '',
      };
    }
  }
  return null;
}

/** 列出可连接的候选节点（供下拉选择） */
export async function nodeOptions(bookId) {
  const [books, ideas, evidence] = await Promise.all([db.all('books'), db.all('ideas'), db.all('evidence')]);
  const opts = [{ value: '', label: '（选择…）' }];
  const add = (group, arr) => {
    if (!arr.length) return;
    opts.push({ value: '', label: `— ${group} —`, disabled: true });
    arr.forEach((r) => {
      const t = (NODE_TEXT[r.__s](r) || '').slice(0, 28);
      const bt = r.bookId ? (books.find((b) => b.id === r.bookId)?.title || '') : '';
      opts.push({ value: r.id, label: `${bt ? bt + ' · ' : ''}${t}` });
    });
  };
  add('书籍', books.map((b) => ({ ...b, __s: 'books' })));
  add('思想', ideas.filter((i) => !bookId || i.bookId === bookId).map((i) => ({ ...i, __s: 'ideas' })));
  add('证据', evidence.filter((e) => !bookId || e.bookId === bookId).map((e) => ({ ...e, __s: 'evidence' })));
  return opts;
}

/** 带上下文的连接列表（用于 UI 展示跨书连接） */
export async function connectionsWithContext(list) {
  const src = list || (await db.all('connections'));
  return Promise.all(src.map(async (c) => {
    const [from, to] = await Promise.all([resolveNode(c.fromId), resolveNode(c.toId)]);
    const crossBook = !!(from?.bookId && to?.bookId && from.bookId !== to.bookId);
    return { ...c, from, to, crossBook };
  }));
}

/** 某本书涉及的全部连接（含以书为端点、以及该书下的思想/记录/证据） */
export async function connectionsForBook(bookId) {
  const [ideas, logs, ev] = await Promise.all([
    db.byIndex('ideas', 'bookId', bookId),
    db.byIndex('logs', 'bookId', bookId),
    db.byIndex('evidence', 'bookId', bookId),
  ]);
  const ids = new Set([bookId, ...ideas.map((i) => i.id), ...logs.map((l) => l.id), ...ev.map((e) => e.id)]);
  const all = await db.all('connections');
  return connectionsWithContext(all.filter((c) => ids.has(c.fromId) || ids.has(c.toId)));
}

/* ---------------------- 知识图谱数据聚合（Phase 3） ---------------------- *
 * 节点 = 所有 connection 端点解出的 book / idea / evidence（去重）。
 * 边 = connections 记录 + 书籍 relatedBookIds（弱边 related）。
 * 只做聚合与过滤，不新增任何数据库表；d3 渲染交给视图层。
 * --------------------------------------------------------------------- */
export async function buildGraphData({ rel = '', type = '', q = '' } = {}) {
  const [books, ideas, evidence, connections] = await Promise.all([
    db.all('books'), db.all('ideas'), db.all('evidence'), db.all('connections'),
  ]);
  const bmap = Object.fromEntries(books.map((b) => [b.id, b]));
  const imap = Object.fromEntries(ideas.map((i) => [i.id, i]));
  const emap = Object.fromEntries(evidence.map((e) => [e.id, e]));

  const nodeMap = new Map();

  const addNode = (id) => {
    if (!id || nodeMap.has(id)) return;
    let node = null;
    if (bmap[id]) { const b = bmap[id]; node = { id, type: 'book', text: b.title || '未命名', bookId: b.id, bookTitle: b.title || '' }; }
    else if (imap[id]) { const i = imap[id]; node = { id, type: 'idea', text: (i.idea || '').slice(0, 120), bookId: i.bookId || '', bookTitle: bmap[i.bookId]?.title || '' }; }
    else if (emap[id]) { const e = emap[id]; node = { id, type: 'evidence', text: (e.content || '').slice(0, 120), bookId: e.bookId || '', bookTitle: bmap[e.bookId]?.title || '' }; }
    if (node) nodeMap.set(id, node);
  };

  const links = [];
  for (const c of connections) {
    if (rel && c.relation !== rel) continue;          // 按关系类型过滤
    addNode(c.fromId); addNode(c.toId);
    links.push({ id: c.id, source: c.fromId, target: c.toId, relation: c.relation, newUnderstanding: c.newUnderstanding || '' });
  }
  for (const b of books) {                              // 书籍隐式关联 → 弱边
    const rels = Array.isArray(b.relatedBookIds) ? b.relatedBookIds : [];
    if (rel && rel !== 'related') continue;
    for (const rid of rels) {
      if (!bmap[rid]) continue;
      addNode(b.id); addNode(rid);
      links.push({ id: 'rel-' + b.id + '-' + rid, source: b.id, target: rid, relation: 'related', newUnderstanding: '' });
    }
  }

  let nodes = [...nodeMap.values()];
  if (type) nodes = nodes.filter((n) => n.type === type);
  if (q) {
    const k = q.toLowerCase();
    nodes = nodes.filter((n) => (n.text || '').toLowerCase().includes(k) || (n.bookTitle || '').toLowerCase().includes(k));
  }

  const degree = {};
  for (const l of links) { degree[l.source] = (degree[l.source] || 0) + 1; degree[l.target] = (degree[l.target] || 0) + 1; }
  const nodeIds = new Set(nodes.map((n) => n.id));
  const finalLinks = links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target));

  return {
    nodes: nodes.map((n) => ({ ...n, degree: degree[n.id] || 0 })),
    links: finalLinks,
    stats: {
      nodes: nodes.length, links: finalLinks.length,
      books: nodes.filter((n) => n.type === 'book').length,
      ideas: nodes.filter((n) => n.type === 'idea').length,
      evidence: nodes.filter((n) => n.type === 'evidence').length,
    },
  };
}

/* ---------------------- 复盘自动生成（PRD 第十五条） ---------------------- */
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yStart) / 86400000 + 1) / 7);
}

export const PERIODS = {
  daily: '日', weekly: '周', monthly: '月', quarterly: '季', yearly: '年',
};

/** 当前时间所属的各周期 key */
export function periodKeyOf(period, date = new Date()) {
  const y = date.getFullYear();
  if (period === 'daily') return fmt(date);
  if (period === 'weekly') return `${y}-W${pad(isoWeek(date))}`;
  if (period === 'monthly') return `${y}-${pad(date.getMonth() + 1)}`;
  if (period === 'quarterly') return `${y}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  return String(y);
}

/** 由周期 key 反解日期区间 [startKey, endKey]（YYYY-MM-DD） */
export function periodRange(period, key) {
  const y = parseInt(String(key).slice(0, 4), 10) || new Date().getFullYear();
  if (period === 'daily') return [key, key];
  if (period === 'weekly') {
    const w = parseInt(String(key).split('-W')[1] || '1', 10);
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const day = jan4.getUTCDay() || 7;
    const mon1 = new Date(jan4.getTime() - (day - 1) * 86400000);
    const s = new Date(mon1.getTime() + (w - 1) * 7 * 86400000);
    const e = new Date(s.getTime() + 6 * 86400000);
    return [fmt(s), fmt(e)];
  }
  if (period === 'monthly') {
    const m = parseInt(String(key).slice(5, 7), 10) || 1;
    return [`${y}-${pad(m)}-01`, fmt(new Date(y, m, 0))];
  }
  if (period === 'quarterly') {
    const q = parseInt(String(key).split('-Q')[1] || '1', 10);
    const s = new Date(y, (q - 1) * 3, 1);
    const e = new Date(y, q * 3, 0);
    return [fmt(s), fmt(e)];
  }
  return [`${y}-01-01`, `${y}-12-31`];
}

const inRange = (d, a, b) => !!d && d >= a && d <= b;

/** 生成某一周期的复盘汇总（不写库，纯计算） */
export async function buildReview(period, key) {
  const [a, b] = periodRange(period, key);
  const [books, logs, ideas, evidence, connections, actions, decisions, principles] = await Promise.all([
    db.all('books'), db.all('logs'), db.all('ideas'), db.all('evidence'),
    db.all('connections'), db.all('actions'), db.all('decisions'), db.all('principles'),
  ]);
  const logsIn = logs.filter((l) => inRange(l.date, a, b));
  const ideasIn = ideas.filter((i) => inRange(i.date, a, b));
  const evIn = evidence.filter((e) => inRange((e.createdAt || '').slice(0, 10), a, b));
  const cnIn = connections.filter((c) => inRange((c.createdAt || '').slice(0, 10), a, b));
  const acDone = actions.filter((x) => x.status === 'done' && inRange(x.completedAt, a, b));
  const acNew = actions.filter((x) => inRange((x.createdAt || '').slice(0, 10), a, b));
  const dcIn = decisions.filter((d) => inRange(d.date, a, b));
  const prIn = principles.filter((p) => inRange((p.createdAt || '').slice(0, 10), a, b));

  const minutes = logsIn.reduce((s, l) => s + (Number(l.minutes) || 0), 0);
  const bookIds = new Set(logsIn.map((l) => l.bookId).filter(Boolean));
  const finished = books.filter((x) => inRange(x.finishDate, a, b));

  return {
    period, periodKey: key,
    range: [a, b],
    booksTouched: bookIds.size,
    booksFinished: finished.map((x) => x.title),
    minutes,
    hours: +(minutes / 60).toFixed(1),
    logCount: logsIn.length,
    ideas: ideasIn.length,
    evidence: evIn.length,
    connections: cnIn.length,
    actionsNew: acNew.length,
    actionsDone: acDone.length,
    decisions: dcIn.length,
    principles: prIn.length,
    highlights: ideasIn.slice(0, 8).map((i) => ({ id: i.id, text: i.idea, bookId: i.bookId })),
    actionList: acDone.slice(0, 8).map((x) => ({ id: x.id, text: x.action, result: x.actualResult })),
    decisionList: dcIn.slice(0, 8).map((d) => ({ id: d.id, text: d.decision, choice: d.choice })),
    bookIds: [...bookIds, ...finished.map((x) => x.id)],
    notes: '',
  };
}

/* ---------------------- Insights（统计 / PRD 第四条） ---------------------- */
export async function stats() {
  const [books, logs, ideas, evidence, actions, decisions, principles, connections] = await Promise.all([
    db.all('books'), db.all('logs'), db.all('ideas'), db.all('evidence'),
    db.all('actions'), db.all('decisions'), db.all('principles'), db.all('connections'),
  ]);
  const byStatus = (s) => books.filter((b) => b.status === s).length;
  const readingHours = (logs.reduce((s, l) => s + (Number(l.minutes) || 0), 0) / 60);
  const doneActions = actions.filter((a) => a.status === 'done').length;

  // 月度阅读趋势（近 6 个月：分钟数）
  const months = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    const mins = logs.filter((l) => (l.date || '').startsWith(key)).reduce((s, l) => s + (Number(l.minutes) || 0), 0);
    months.push({ key, label: `${m.getMonth() + 1}月`, minutes: mins, hours: +(mins / 60).toFixed(1) });
  }

  // 分类分布
  const catMap = {};
  books.forEach((b) => { const c = b.category || '未分类'; catMap[c] = (catMap[c] || 0) + 1; });
  const categories = Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  return {
    totalBooks: books.length,
    completed: byStatus('completed'),
    reading: byStatus('reading'),
    toRead: byStatus('to_read'),
    rereading: byStatus('rereading'),
    readingHours: +readingHours.toFixed(1),
    ideas: ideas.length,
    evidence: evidence.length,
    actions: actions.length,
    completedActions: doneActions,
    actionRate: actions.length ? Math.round((doneActions / actions.length) * 100) : 0,
    decisions: decisions.length,
    principles: principles.filter((p) => p.status !== 'archived').length,
    connections: connections.length,
    months, categories,
    currentBooks: books.filter((b) => b.status === 'reading' || b.status === 'rereading'),
    recentlyRead: logs.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5),
    recentIdeas: ideas.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5),
    pendingActions: actions.filter((a) => a.status === 'todo' || a.status === 'doing').slice(0, 6),
    recentPrinciples: principles.filter((p) => p.status !== 'archived').slice(-4).reverse(),
  };
}

/* ---------------------- 全局搜索（PRD 第十六条） ---------------------- */
const HAYSTACK = {
  books: (b) => [b.title, b.titleEn, b.author, b.category, (b.topics || []).join(' '), b.oneLineSummary, b.coreQuestion],
  ideas: (i) => [i.idea, i.interpretation, i.whyImportant, i.application, (i.tags || []).join(' ')],
  logs: (l) => [l.summary, l.importantIdea, l.interpretation, l.question, l.disagreement, l.chapter],
  evidence: (e) => [e.content, e.source],
  actions: (a) => [a.action, a.expectedResult, a.actualResult, a.review, a.category],
  decisions: (d) => [d.decision, d.background, d.facts, d.mentalModel, d.choice, d.reason, d.result, d.review],
  principles: (p) => [p.principle, p.conditions, p.exceptions, p.risks, p.applications, p.result],
};

export async function search(q) {
  const term = (q || '').trim().toLowerCase();
  if (!term) return { books: [], ideas: [], logs: [], evidence: [], actions: [], decisions: [], principles: [] };
  const out = {};
  for (const [store, fieldsFn] of Object.entries(HAYSTACK)) {
    const rows = await db.all(store);
    out[store] = rows.filter((r) => fieldsFn(r).filter(Boolean).join(' ').toLowerCase().includes(term)).slice(0, 20);
  }
  return out;
}

/* ---------------------- 接地检索（Phase 6：Ask My Library） ---------------------- *
 * 从用户自己的数据库抓取与查询相关的片段，作为 AI 回答的「证据」。
 * 只返回文本命中的片段（不会虚构），每条带来源类型 / 书籍 / 日期。
 * --------------------------------------------------------------------------- */
export async function retrieve(q, limit = 14) {
  const term = (q || '').trim();
  if (!term) return [];
  const [books, ideas, logs, evidence, actions, decisions, principles] = await Promise.all([
    db.all('books'), db.all('ideas'), db.all('logs'), db.all('evidence'),
    db.all('actions'), db.all('decisions'), db.all('principles'),
  ]);
  const bmap = Object.fromEntries(books.map((b) => [b.id, b]));
  const out = [];
  const push = (store, id, type, text, source, date, bookId) => {
    if (text && String(text).toLowerCase().includes(term.toLowerCase())) {
      out.push({
        store, id, type, text: String(text).slice(0, 220), source: source || '',
        date: date || '', bookId: bookId || '', bookTitle: bmap[bookId]?.title || '',
      });
    }
  };
  books.forEach((b) => push('books', b.id, '书籍', [b.title, b.author, (b.topics || []).join(' '), b.oneLineSummary].join(' '), '', '', ''));
  ideas.forEach((i) => push('ideas', i.id, '思想', [i.idea, i.interpretation, (i.tags || []).join(' ')].join(' '), '', i.date, i.bookId));
  logs.forEach((l) => push('logs', l.id, '阅读记录', [l.summary, l.importantIdea, l.question, l.interpretation].join(' '), '', l.date, l.bookId));
  evidence.forEach((e) => push('evidence', e.id, '证据', e.content, e.source, (e.createdAt || '').slice(0, 10), e.bookId));
  actions.forEach((a) => push('actions', a.id, '行动', [a.action, a.expectedResult, a.actualResult, a.review].join(' '), '', (a.createdAt || '').slice(0, 10), ''));
  decisions.forEach((d) => push('decisions', d.id, '决策', [d.decision, d.choice, d.reason, d.result].join(' '), '', d.date, d.bookId));
  principles.forEach((p) => push('principles', p.id, '原则', [p.principle, p.conditions, p.applications, p.result].join(' '), '', p.lastReview, ''));
  return out.slice(0, limit);
}

/* ---------------------- 混合 / 语义搜索（Phase 6） ---------------------- *
 * mode = 'full'    → 纯全文（默认，无需任何外部服务）
 * mode = 'semantic'→ 配了 AI 用 embedding 真语义；否则退化为本地分词近似
 * 返回按类型分组、带 _score 与 _why（为何命中），供 UI 显示「为什么匹配」。
 * ------------------------------------------------------------------------- */
export async function hybridSearch(q, { mode = 'full' } = {}) {
  const term = (q || '').trim().toLowerCase();
  if (!term) return { mode, total: 0, results: {} };
  const stores = ['books', 'ideas', 'logs', 'evidence', 'actions', 'decisions', 'principles'];
  const data = {};
  for (const s of stores) data[s] = await db.all(s);

  const embCache = {};
  let qEmb = null;
  if (mode === 'semantic' && aiEnabled()) {
    for (const s of stores) {
      const texts = data[s].map((r) => HAYSTACK[s](r).filter(Boolean).join(' '));
      const embs = texts.length ? await aiEmbed(texts) : null;
      if (embs) embCache[s] = embs;
    }
    qEmb = (await aiEmbed([q]))?.[0] || null;
  }

  const results = {};
  let total = 0;
  for (const s of stores) {
    const fn = HAYSTACK[s];
    const items = [];
    data[s].forEach((r, idx) => {
      const text = fn(r).filter(Boolean).join(' ');
      const hit = text.toLowerCase().includes(term);
      let score = hit ? 1 : 0;
      let why = hit ? '文本命中' : '';
      if (mode === 'semantic') {
        const emb = embCache[s]?.[idx];
        const sim = (qEmb && emb) ? cosine(qEmb, emb) : localSemanticScore(q, text);
        if (sim > score) { score = sim; if (!hit) why = `语义相关（${Math.round(sim * 100)}%）`; }
      }
      if (score > 0.04) items.push({ ...r, _score: +score.toFixed(3), _why: why || '文本命中' });
    });
    items.sort((a, b) => b._score - a._score);
    results[s] = items.slice(0, 20);
    total += results[s].length;
  }
  return { mode, total, results };
}

/* ---------------------- 个人进化纵向视图（Phase 5） ---------------------- *
 * 同一个问题 / 主题 / 书，几年后我的答案发生了什么变化？
 * 不新增表：从现有带日期的实体（Ideas/Logs/Evidence/Actions/Decisions/
 * Principles/Reviews）按 track 聚合，按时间排序成时间线。
 * ----------------------------------------------------------------------- */
export async function evolutionTracks() {
  const [principles, ideas, books] = await Promise.all([Principles.all(), Ideas.all(), Books.all()]);
  const tracks = [];
  // 原则 track：每条在用原则是一个可追踪的「我的判断」
  principles.filter((p) => p.status !== 'archived').forEach((p) => {
    tracks.push({ id: 'PR|' + p.id, kind: 'principle', title: p.principle, subtitle: `原则 · 复审 ${p.lastReview || '从未'}`, anchor: p.id, keyword: (p.principle || '').slice(0, 10) });
  });
  // 书 track：每本书
  books.forEach((b) => {
    tracks.push({ id: 'BK|' + b.id, kind: 'book', title: b.title, subtitle: `书籍 · ${b.author || ''}`, anchor: b.id, keyword: b.title || '' });
  });
  // 主题 track：出现 ≥2 次的高频标签
  const tagCount = {};
  ideas.forEach((i) => (i.tags || []).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  Object.entries(tagCount).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([t]) => tracks.push({ id: 'TAG|' + t, kind: 'tag', title: t, subtitle: '主题 · 反复出现的标签', anchor: t, keyword: t }));
  return tracks;
}

export async function evolutionTimeline(track) {
  if (!track) return { entries: [], years: [] };
  const [books, logs, ideas, evidence, actions, decisions, principles] = await Promise.all([
    Books.all(), Logs.all(), Ideas.all(), Evidence.all(), Actions.all(), Decisions.all(), Principles.all(),
  ]);
  const bmap = Object.fromEntries(books.map((b) => [b.id, b]));
  const kw = (track.keyword || '').toLowerCase();
  const entries = [];

  const add = (entity, r, type, text, date, bookId, extra = {}) => {
    if (!date) return;
    const text2 = String(text || '').toLowerCase();
    let related = false;
    if (track.kind === 'book') related = (entity === 'books' && r.id === track.anchor) || bookId === track.anchor;
    else if (track.kind === 'tag') related = (entity === 'ideas' && (r.tags || []).includes(track.anchor)) || text2.includes(kw);
    else if (track.kind === 'principle') related = (entity === 'principles' && r.id === track.anchor) || text2.includes(kw);
    if (!related) return;
    entries.push({ entity, id: r.id, type, text: String(text || '').slice(0, 240), date, bookTitle: bmap[bookId]?.title || '', ...extra });
  };

  books.forEach((b) => add('books', b, '书籍', [b.title, b.author, b.oneLineSummary].join(' · '), b.startDate || b.finishDate, b.id));
  ideas.forEach((i) => add('ideas', i, '思想', [i.idea, i.interpretation].join(' — '), i.date, i.bookId));
  logs.forEach((l) => add('logs', l, '阅读记录', [l.summary, l.importantIdea, l.question].join(' — '), l.date, l.bookId));
  evidence.forEach((e) => add('evidence', e, '证据', e.content, (e.createdAt || '').slice(0, 10), e.bookId));
  actions.forEach((a) => add('actions', a, '行动', [a.action, a.expectedResult, a.actualResult].join(' — '), (a.createdAt || '').slice(0, 10), ''));
  decisions.forEach((d) => add('decisions', d, '决策', [d.decision, d.choice, d.reason].join(' — '), d.date, d.bookId));
  principles.forEach((p) => add('principles', p, '原则', p.principle, p.lastReview, ''));

  entries.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const years = [...new Set(entries.map((e) => (e.date || '').slice(0, 4)).filter(Boolean))].sort();
  return { entries, years };
}

/* ---------------------- 备份 / 恢复 / 导入 ---------------------- */
export const Backup = {
  dump: () => db.dump(),
  restore: (json, merge) => db.restore(json, { merge }),
  wipe: () => db.wipe(),
  async setLastBackup() {
    await db.put('meta', { key: 'lastBackup', value: nowISO() });
  },
  /** 导入前快照全量数据，供一键回滚（路线图：Backup → Migration → Validation → Rollback） */
  async snapshotBeforeImport() {
    const dump = await db.dump();
    await db.put('meta', { key: 'lastImportSnapshot', value: { at: nowISO(), dump } });
  },
  /** 回滚到上次导入前的状态；返回快照时间 */
  async rollbackLastImport() {
    const snap = await db.get('meta', 'lastImportSnapshot');
    if (!snap?.value?.dump) throw new Error('没有可回滚的导入快照');
    await db.restore(snap.value.dump, { merge: false });
    return snap.value.at;
  },
  async info() {
    const dump = await db.dump();
    const [lastBackup] = await Promise.all([db.get('meta', 'lastBackup')]);
    return {
      size: new Blob([JSON.stringify(dump)]).size,
      books: dump.books.length,
      ideas: dump.ideas.length,
      actions: dump.actions.length,
      lastBackup: lastBackup?.value || null,
    };
  },
};

/** 批量导入（Excel / JSON 转换后的行）
 *  Phase 2 工程化：
 *   - 导入前自动快照（可回滚）
 *   - 按 SCHEMA.sample 做类型与数组还原
 *   - Books 缺关键字段（ISBN/作者）自动标记 needsReview + reviewReasons
 *   - 缺书名的行跳过（不写库）
 *   - 增量幂等：有 ID 合并更新，无 ID 补发；绝不清空其它数据
 *   - 分块回调进度，避免 1000+ 行卡死 UI
 *  @param {Record<string,Array>} rowsByStore
 *  @param {(done:number,total:number)=>void} [onProgress]
 */
export async function importRows(rowsByStore, onProgress) {
  await Backup.snapshotBeforeImport();
  const result = {};
  const stores = Object.entries(rowsByStore).filter(([s, r]) => SCHEMA[s] && Array.isArray(r));
  const total = stores.reduce((s, [, r]) => s + r.length, 0);
  let done = 0;
  for (const [store, rows] of stores) {
    let added = 0, updated = 0, skipped = 0, needsReview = 0;
    for (const raw of rows) {
      const base = { ...SCHEMA[store].sample };
      const obj = {};
      for (const [k, sv] of Object.entries(base)) obj[k] = normalizeValue(raw[k], sv);
      for (const [k, v] of Object.entries(raw)) if (!(k in base)) obj[k] = v; // 保留未知列，不丢数据

      if (store === 'books') applyBookRules(obj);
      if (store === 'books' && !obj.title) { skipped++; done++; bump(); continue; }

      if (!obj.id) { obj.id = await nextId(store); added++; }
      else { const ex = await db.get(store, obj.id); ex ? updated++ : added++; }
      obj.createdAt = obj.createdAt || nowISO();
      if ('updatedAt' in base) obj.updatedAt = nowISO();
      await db.put(store, obj);
      if (store === 'books' && obj.needsReview) needsReview++;
      done++; bump();
    }
    result[store] = { added, updated, skipped, needsReview };
  }
  await syncCounters(rowsByStore);
  return result;

  function bump() { if (done % 200 === 0 || done === total) onProgress?.(done, total); }
}

/** 按 sample 类型还原：数组按 ；/; 拆分；数字空值归 ''；布尔按真值表 */
function normalizeValue(v, sample) {
  if (Array.isArray(sample)) {
    if (Array.isArray(v)) return v;
    return String(v ?? '').split(/[；;]/).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof sample === 'number') return (v === '' || v == null) ? '' : Number(v);
  if (typeof sample === 'boolean') return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
  if (v === undefined || v === null) return '';
  return v;
}

/** Books 专属规则：作者规范化 + 缺关键字段标需复核 */
function applyBookRules(b) {
  const authors = Array.isArray(b.authors) && b.authors.length
    ? b.authors
    : String(b.author || b.authors || '').split(/[、/，,;；]/).map((s) => s.trim()).filter(Boolean);
  b.authors = authors;
  if (!b.author && authors.length) b.author = authors.join('、');
  const reasons = [];
  if (!b.isbn && !b.author) reasons.push('缺 ISBN 与作者');
  else if (!b.isbn) reasons.push('缺 ISBN');
  else if (!b.author) reasons.push('缺作者');
  if (reasons.length) { b.needsReview = true; b.reviewReasons = reasons; }
}

export { todayStr, nowISO };
