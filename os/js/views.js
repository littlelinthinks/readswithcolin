/* =============================================================
 * READS WITH COLIN OS — 视图层（Phase 1）
 * Dashboard / Books / Book Detail / Daily Log / Ideas / Search / Settings
 * ============================================================= */

import {
  Books, Logs, Ideas, Evidence, Actions, Decisions, Principles, Connections, Reviews,
  stats, search, STATUS, Backup, todayStr,
  buildReview, periodKeyOf, PERIODS, connectionsWithContext, nodeOptions, buildGraphData,
  retrieve, hybridSearch, evolutionTracks, evolutionTimeline,
} from './store.js';
import { db } from './db.js';
import { esc, empty, pill, progressBar, barChart, catBars, fmtDate } from './ui.js';
import { aiEnabled, aiChat, safeJson, getAIConfig, saveAIConfig } from './ai.js';
import { getSyncConfig, saveSyncConfig, syncEnabled } from './sync.js';

export const CATEGORIES = ['心智', '决策', '历史', '商业', '传记', '科学', '文学', '哲学', '心理', '其他'];
export const FORMATS = ['纸质书', '电子书', '音频', '其他'];

/** 由 ID 生成稳定的柔和封面色（不用图片，保证离线与一致感） */
function coverStyle(seed) {
  let h = 0;
  for (const ch of String(seed || 'x')) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const h2 = (h + 38) % 360;
  return `background:linear-gradient(150deg,hsl(${h} 24% 88%),hsl(${h2} 20% 78%))`;
}
function cover(title, seed, big) {
  const t = (title || '').slice(0, 12);
  return `<div class="rwc-cover${big ? ' big' : ''}" style="${coverStyle(seed)}">
    <span class="rwc-cover-line"></span><b>${esc(t)}</b></div>`;
}

/* ==================== Dashboard（PRD 第四条） ==================== */
export async function viewDashboard() {
  const s = await stats();
  const books = await Books.all();
  const bmap = Object.fromEntries(books.map((b) => [b.id, b]));

  const core = [
    { k: 'Ideas Generated', v: s.ideas, n: '思想沉淀' },
    { k: 'Actions Taken', v: s.completedActions, n: '行动完成' },
    { k: 'Decisions Improved', v: s.decisions, n: '决策记录' },
    { k: 'Principles Formed', v: s.principles, n: '原则形成' },
  ];
  const secondary = [
    ['Total Books', s.totalBooks], ['Completed', s.completed], ['Reading', s.reading],
    ['To Read', s.toRead], ['Reading Hours', s.readingHours], ['Evidence', s.evidence],
    ['Connections', s.connections], ['Actions', s.actions],
  ];

  const curBooks = await Promise.all(s.currentBooks.slice(0, 4).map(async (b) => ({
    b, pct: await Books.progress(b.id),
  })));

  return `
  <section class="rwc-page-head">
    <div>
      <h1>Dashboard</h1>
      <p>${esc(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }))} · 阅读是否真的改变了判断？看下面四个数。</p>
    </div>
  </section>

  <div class="rwc-core4">
    ${core.map((c) => `<div class="rwc-core-card">
      <b>${c.v}</b><span>${esc(c.k)}</span><em>${esc(c.n)}</em></div>`).join('')}
  </div>

  <div class="rwc-metrics">
    ${secondary.map(([k, v]) => `<div class="rwc-metric"><b>${v}</b><span>${esc(k)}</span></div>`).join('')}
  </div>

  <div class="rwc-grid-2">
    <div class="rwc-panel"><h3>Monthly Reading Trend</h3>${barChart(s.months, '小时')}</div>
    <div class="rwc-panel"><h3>Reading by Category</h3>${catBars(s.categories)}</div>
  </div>

  <div class="rwc-grid-2">
    <div class="rwc-panel">
      <h3>Current Books</h3>
      ${curBooks.length ? curBooks.map(({ b, pct }) => `
        <a class="rwc-row-link" href="#/book/${b.id}">
          ${cover(b.title, b.id)}
          <div class="rwc-row-main"><b>${esc(b.title)}</b><span>${esc(b.author || '')} · ${esc(b.category || '')}</span>
            ${progressBar(pct)}</div>
          <i>${pct}%</i></a>`).join('')
        : empty('还没有在读的书', '去 Books 添加一本，或把某本书标记为 Reading')}
    </div>

    <div class="rwc-panel">
      <h3>Recent Ideas</h3>
      ${s.recentIdeas.length ? s.recentIdeas.map((i) => `
        <div class="rwc-item" data-act="open-idea" data-id="${i.id}">
          <p>${esc(i.idea)}</p>
          <span>${esc(bmap[i.bookId]?.title || '未关联书籍')} · ${fmtDate(i.date)}</span></div>`).join('')
        : empty('还没有思想记录', '按右下角 + ，3 秒记一个想法')}
    </div>
  </div>

  <div class="rwc-grid-2">
    <div class="rwc-panel">
      <h3>Pending Actions</h3>
      ${s.pendingActions.length ? s.pendingActions.map((a) => `
        <div class="rwc-item" data-act="open-action" data-id="${a.id}">
          <p>${esc(a.action)}</p>
          <span>${pill(STATUS.action[a.status] || a.status, a.status === 'doing' ? 'gold' : '')} ${esc(a.category || '')}</span>
        </div>`).join('') : empty('没有待办行动', '把想法转成行动，阅读才算闭环')}
      ${s.actions ? `<div class="rwc-panel-foot">行动完成率 ${s.actionRate}%（${s.completedActions}/${s.actions}）</div>` : ''}
    </div>

    <div class="rwc-panel">
      <h3>Recently Read</h3>
      ${s.recentlyRead.length ? s.recentlyRead.map((l) => `
        <div class="rwc-item" data-act="open-log" data-id="${l.id}">
          <p>${esc(l.summary || l.importantIdea || '（无摘要）')}</p>
          <span>${esc(bmap[l.bookId]?.title || '')} · ${esc(l.chapter || '')} · ${fmtDate(l.date)} · ${l.minutes || 0} 分钟</span>
        </div>`).join('') : empty('还没有阅读日志', '每天 3 分钟：读了哪章、想到什么')}
    </div>
  </div>`;
}

/* ==================== Books（PRD 第五条） ==================== */
/* Books 列表分块渲染缓存（Phase 2：承载 1000~10000+ 本，首屏只渲 CHUNK 本） */
let _bv = { list: [], shown: 0, CHUNK: 48 };

export async function viewBooks({ q = '', status = '', sort = 'updated' } = {}) {
  let books = await Books.all();
  if (q) {
    const t = q.toLowerCase();
    books = books.filter((b) => [b.title, b.titleEn, b.author, (b.authors || []).join(' '), b.category, (b.topics || []).join(' ')]
      .filter(Boolean).join(' ').toLowerCase().includes(t));
  }
  if (status === 'needsReview') books = books.filter((b) => b.needsReview);
  else if (status) books = books.filter((b) => b.status === status);
  if (sort === 'title') books.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh'));
  if (sort === 'rating') books.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  _bv.list = books;
  _bv.shown = 0;

  const needCount = books.filter((b) => b.needsReview).length;
  const chips = [['', '全部'], ['needsReview', `需复核 (${needCount})`], ...Object.entries(STATUS.book)];
  const grid = books.length ? renderBookGrid()
    : empty('没有匹配的书', '换个关键词，或新增一本');
  const more = (books.length > _bv.shown)
    ? `<div class="rwc-books-more"><button class="rwc-btn ghost" id="book-more-btn" data-act="book-more">
         加载更多 <span class="cnt">${books.length - _bv.shown} 本</span></button></div>` : '';

  return `
  <section class="rwc-page-head">
    <div><h1>Books</h1><p>${books.length} 本 · 书是入口，思想是资产</p></div>
    <button class="rwc-btn primary" data-act="new-book">+ 新增书籍</button>
  </section>

  <div class="rwc-toolbar">
    <input class="rwc-search" placeholder="搜索书名 / 作者 / 主题…" value="${esc(q)}" data-act="book-search">
    <select data-act="book-sort">
      <option value="updated" ${sort === 'updated' ? 'selected' : ''}>最近更新</option>
      <option value="title" ${sort === 'title' ? 'selected' : ''}>按书名</option>
      <option value="rating" ${sort === 'rating' ? 'selected' : ''}>按评分</option>
    </select>
  </div>
  <div class="rwc-chips">
    ${chips.map(([v, l]) => `<button class="${status === v ? 'on' : ''}" data-act="book-filter" data-v="${v}">${esc(l)}</button>`).join('')}
  </div>

  ${grid}
  ${more}`;
}

function renderBookGrid() {
  const slice = _bv.list.slice(0, _bv.shown + _bv.CHUNK);
  _bv.shown = slice.length;
  return `<div class="rwc-books">
    ${slice.map(bookCard).join('')}
  </div>`;
}

/** 点击「加载更多」时增量追加下一块（不整页重渲染，保留滚动位置） */
export function loadMoreBooks() {
  const grid = document.querySelector('.rwc-books');
  if (!grid) return;
  const start = _bv.shown;
  const end = Math.min(start + _bv.CHUNK, _bv.list.length);
  const slice = _bv.list.slice(start, end);
  grid.insertAdjacentHTML('beforeend', slice.map(bookCard).join(''));
  _bv.shown = end;
  const btn = document.getElementById('book-more-btn');
  if (btn) {
    if (_bv.shown >= _bv.list.length) btn.remove();
    else btn.querySelector('.cnt').textContent = `${_bv.list.length - _bv.shown} 本`;
  }
}

function bookCard(b) {
  const author = (b.authors && b.authors.length) ? b.authors.join('、') : (b.author || '—');
  return `<a class="rwc-book-card" href="#/book/${b.id}">
      ${cover(b.title, b.id, true)}
      <div class="rwc-bc-body">
        <b>${esc(b.title)}</b>
        <span>${esc(author)}</span>
        <div class="rwc-bc-foot">${pill(STATUS.book[b.status] || b.status, b.status === 'reading' ? 'gold' : '')}
          ${b.rating ? `<i class="rwc-rate">${'★'.repeat(b.rating)}</i>` : ''}
          ${b.needsReview ? `<i class="rwc-flag" title="${esc((b.reviewReasons || []).join('；'))}">需复核</i>` : ''}</div>
      </div></a>`;
}

/* ==================== Book Detail（PRD 第六条） ==================== */
export async function viewBookDetail(id, tab = 'overview') {
  const d = await Books.detail(id);
  if (!d.book) return empty('找不到这本书');
  const b = d.book;
  const pct = await Books.progress(id);
  const questionCount = d.logs.filter((l) => (l.question || '').trim()).length;
  const bookPrinciples = (await Principles.all()).filter((p) => (p.sourceBookIds || []).includes(b.id));
  const tabs = [['overview', 'Overview'], ['notes', 'Daily Notes'], ['ideas', 'Ideas'],
    ['evidence', 'Evidence'], ['questions', 'Questions'], ['connections', 'Connections'],
    ['actions', 'Actions'], ['principles', 'Principles'], ['reviews', 'Reviews']];

  let panel = '';
  if (tab === 'overview') {
    const mini = [['notes', '记录', d.logs.length], ['ideas', '思想', d.ideas.length],
      ['evidence', '证据', d.evidence.length], ['questions', '问题', questionCount],
      ['connections', '连接', d.connections.length], ['actions', '行动', d.actions.length],
      ['principles', '原则', bookPrinciples.length], ['reviews', '复盘', d.reviews.length]];
    panel = `
      <div class="rwc-mini-stats">
        ${mini.map(([t, l, n]) => `<a href="#/book/${b.id}?tab=${t}"><b>${n}</b><span>${l}</span></a>`).join('')}
      </div>
      <div class="rwc-kv">
        ${row('One-line Summary', b.oneLineSummary)}
        ${row('Core Question', b.coreQuestion)}
        ${row('Core Ideas', (b.coreIdeas || []).map((c) => `· ${c}`).join('<br>'))}
        ${row('作者 / 译者', [b.author, b.translator].filter(Boolean).join(' / '))}
        ${row('出版 / 国别', [b.year, b.country].filter(Boolean).join(' · '))}
        ${row('出版社 / ISBN', [b.publisher, b.isbn].filter(Boolean).join(' · '))}
        ${row('语言 / 版次', [b.language, b.edition].filter(Boolean).join(' · '))}
        ${b.source ? row('数据来源', `<span class="rwc-pill">${esc(b.source)}</span>`) : ''}
        ${row('分类 / 主题', [b.category, (b.topics || []).join('、')].filter(Boolean).join(' · '))}
        ${row('形式 / 次数', [b.format, b.readingCount ? `第 ${b.readingCount} 遍` : ''].filter(Boolean).join(' · '))}
        ${row('Notes', b.notes)}
      </div>
      <div class="rwc-panel-foot">
        <button class="rwc-btn ghost sm" data-act="edit-book" data-id="${b.id}">编辑</button>
        <button class="rwc-btn ghost sm" data-act="del-book" data-id="${b.id}">删除</button>
      </div>`;
  } else if (tab === 'notes') {
    panel = `
      <div class="rwc-panel-head-row"><h4>每日阅读记录</h4>
        <button class="rwc-btn primary sm" data-act="new-log" data-book="${b.id}">+ 今日记录</button></div>
      ${d.logs.length ? d.logs.map((l) => `
        <div class="rwc-item" data-act="open-log" data-id="${l.id}">
          <p>${esc(l.summary || l.importantIdea || '（无摘要）')}</p>
          <span>${fmtDate(l.date)} · ${esc(l.chapter || '')} · ${l.pagesFrom || 0}-${l.pagesTo || 0} 页 · ${l.minutes || 0} 分钟</span>
        </div>`).join('') : empty('还没有阅读记录', '每天读完顺手记一笔，3 分钟')}`;
  } else if (tab === 'ideas') {
    panel = `
      <div class="rwc-panel-head-row"><h4>从这本书产生的思想</h4>
        <button class="rwc-btn primary sm" data-act="new-idea" data-book="${b.id}">+ 新增想法</button></div>
      ${d.ideas.length ? d.ideas.map((i) => `
        <div class="rwc-item" data-act="open-idea" data-id="${i.id}">
          <p>${esc(i.idea)}</p>
          <span>${fmtDate(i.date)}${(i.tags || []).length ? ' · ' + esc((i.tags || []).join('、')) : ''}</span>
        </div>`).join('') : empty('还没有想法', '读到触动的地方，点右上角 + 记下来')}`;
  } else if (tab === 'evidence') {
    panel = `
      <div class="rwc-panel-head-row"><h4>证据（严格区分「作者主张」与「事实」）</h4>
        <button class="rwc-btn primary sm" data-act="new-evidence" data-book="${b.id}">+ 新增证据</button></div>
      ${d.evidence.length ? `<div class="rwc-ev-list">${d.evidence
        .sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || ''))
        .map((e) => evidenceCard(e, { [b.id]: b }, false)).join('')}</div>`
        : empty('还没有证据条目', '记住：作者说的 ≠ 事实')}`;
  } else if (tab === 'questions') {
    const qs = d.logs.filter((l) => (l.question || '').trim());
    panel = `
      <div class="rwc-panel-head-row"><h4>本书留下的未解问题</h4>
        <button class="rwc-btn primary sm" data-act="new-log" data-book="${b.id}">+ 在阅读中提问</button></div>
      ${qs.length ? qs.map((l) => `
        <div class="rwc-item" data-act="open-log" data-id="${l.id}">
          <p>${esc(l.question)}</p>
          <span>${fmtDate(l.date)} · ${esc(l.chapter || '')} · 来自当日阅读记录</span></div>`).join('')
        : empty('还没有从这本书里提出过问题', '读的时候卡住的地方，往往是最值钱的问题')}`;
  } else if (tab === 'connections') {
    panel = `
      <div class="rwc-panel-head-row"><h4>Connections · 与别的书 / 别的想法碰撞</h4>
        <button class="rwc-btn primary sm" data-act="new-connection" data-book="${b.id}">+ 新建连接</button></div>
      ${d.connections.length ? `<div class="rwc-cn-list">${d.connections
        .sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || ''))
        .map(connectionCard).join('')}</div>`
        : empty('还没有连接', '把本书的某个观点，与另一本书的观点连起来：相似 / 冲突 / 互补 / 因果 / 延伸 / 修正')}`;
  } else if (tab === 'actions') {
    panel = `
      <div class="rwc-panel-head-row"><h4>由本书催生的行动</h4>
        <button class="rwc-btn primary sm" data-act="new-action" data-book="${b.id}">+ 新增行动</button></div>
      ${d.actions.length ? d.actions.map((a) => `
        <div class="rwc-item" data-act="open-action" data-id="${a.id}">
          <p>${esc(a.action)}</p>
          <span>${pill(STATUS.action[a.status] || a.status, a.status === 'done' ? 'ok' : a.status === 'doing' ? 'gold' : '')}
            ${esc(a.expectedResult || '')}</span></div>`).join('') : empty('还没有行动', '读到 → 想到 → 做到，闭环才成立')}`;
  } else if (tab === 'principles') {
    panel = `
      <div class="rwc-panel-head-row"><h4>从这本书沉淀出的原则</h4>
        <a class="rwc-btn ghost sm" href="#/principles">去 Principles</a></div>
      ${bookPrinciples.length ? bookPrinciples.map((p) => `
        <div class="rwc-item" data-act="open-principle" data-id="${p.id}">
          <p>${esc(p.principle)}</p>
          <span>${pill(p.status === 'active' ? '使用中' : '已归档', p.status === 'active' ? 'ok' : '')} · 复审 ${fmtDate(p.lastReview)}</span></div>`).join('')
        : empty('这本书还没沉淀出原则', '读完 → 试做 → 复盘 → 才长成你的原则')}`;
  } else if (tab === 'reviews') {
    panel = `
      <div class="rwc-panel-head-row"><h4>Reviews · 这本书出现在哪些复盘里</h4>
        <a class="rwc-btn ghost sm" href="#/reviews">去 Reviews</a></div>
      ${d.reviews.length ? d.reviews.map((r) => `
        <a class="rwc-item" href="#/reviews?period=${esc(r.period)}&key=${esc(r.periodKey)}">
          <p>${esc(PERIODS[r.period] || r.period)}度复盘 ${esc(r.periodKey)}</p>
          <span>${esc((r.content?.range || []).join(' ~ '))}${r.content?.notes ? ' · 有笔记' : ''}</span></a>`).join('')
        : empty('这本书还没出现在任何复盘里', '去 Reviews 生成一份周/月复盘')}`;
  }

  return `
  <div class="rwc-crumb"><a href="#/books">Books</a> / ${esc(b.title)}</div>
  <section class="rwc-book-head">
    ${cover(b.title, b.id, true)}
    <div class="rwc-bh-main">
      <h1>${esc(b.title)}</h1>
      <p class="rwc-bh-sub">${esc(b.titleEn || '')}</p>
      <p class="rwc-bh-meta">${esc(b.author || '—')} · ${esc(b.category || '未分类')} · ${pill(STATUS.book[b.status] || b.status, b.status === 'reading' ? 'gold' : '')}</p>
      ${progressBar(pct)}
      <div class="rwc-bh-dates">
        <span>开始 ${fmtDate(b.startDate)}</span><span>完成 ${fmtDate(b.finishDate)}</span><span>进度 ${pct}%</span>
        ${b.rating ? `<span>${'★'.repeat(b.rating)}</span>` : ''}
      </div>
    </div>
  </section>

  <div class="rwc-tabs">
    ${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="book-tab" data-tab="${k}">${esc(l)}</button>`).join('')}
  </div>
  <div class="rwc-panel">${panel}</div>`;
}

const row = (k, v) => (v ? `<div class="rwc-kv-row"><span>${esc(k)}</span><p>${v}</p></div>` : '');

/* ==================== Daily Log ==================== */
export async function viewLog() {
  const logs = await Logs.all();
  const books = await Books.all();
  const bmap = Object.fromEntries(books.map((b) => [b.id, b]));
  const byDate = {};
  logs.forEach((l) => { (byDate[l.date || '未标日期'] ||= []).push(l); });
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return `
  <section class="rwc-page-head">
    <div><h1>Daily Log</h1><p>${logs.length} 条记录 · 每天 3 分钟，别让它变负担</p></div>
    <button class="rwc-btn primary" data-act="new-log">+ 今日记录</button>
  </section>
  ${dates.length ? dates.map((dt) => `
    <div class="rwc-day-group">
      <h4>${esc(dt)}</h4>
      ${byDate[dt].map((l) => `
        <div class="rwc-item" data-act="open-log" data-id="${l.id}">
          <p>${esc(l.summary || l.importantIdea || '（无摘要）')}</p>
          <span><a href="#/book/${l.bookId}">${esc(bmap[l.bookId]?.title || '未关联')}</a> · ${esc(l.chapter || '')} · ${l.minutes || 0} 分钟</span>
        </div>`).join('')}
    </div>`).join('') : empty('还没有阅读日志', '读完今天这几页，记一笔')}`;
}

/* ==================== Ideas ==================== */
export async function viewIdeas() {
  const ideas = await Ideas.all();
  const books = await Books.all();
  const bmap = Object.fromEntries(books.map((b) => [b.id, b]));
  return `
  <section class="rwc-page-head">
    <div><h1>Ideas</h1><p>${ideas.length} 条思想 · 这是整个系统最值钱的部分</p></div>
    <button class="rwc-btn primary" data-act="new-idea">+ 新增想法</button>
  </section>
  ${ideas.length ? `<div class="rwc-idea-list">${ideas.map((i) => `
    <article class="rwc-idea-card" data-act="open-idea" data-id="${i.id}">
      <p class="rwc-idea-text">${esc(i.idea)}</p>
      ${i.interpretation ? `<p class="rwc-idea-sub">我的解读：${esc(i.interpretation)}</p>` : ''}
      <footer>
        <span><a href="#/book/${i.bookId}">${esc(bmap[i.bookId]?.title || '未关联')}</a></span>
        <span>${fmtDate(i.date)}</span>
        ${(i.tags || []).map((t) => pill(t)).join('')}
      </footer>
    </article>`).join('')}</div>` : empty('还没有思想记录', '右下角 + ，两次点击就能记')}`;
}

/* ==================== Search（PRD 第十六条 · Phase 6 混合/语义） ==================== */
export async function viewSearch(q, mode = 'full') {
  if (!q) {
    return `<section class="rwc-page-head"><div><h1>Search</h1><p>跨库搜索：书名 / 作者 / 思想 / 标签 / 行动 / 原则 / 决策</p></div></section>
      <div class="rwc-toolbar"><input class="rwc-search big" placeholder="试试输入「scarcity」「决策」「原则」…" data-act="global-search"></div>
      <div class="rwc-note">搜索模式：${mode === 'semantic' ? '语义（本地分词近似，配 AI 后升级为 embedding 真语义）' : '全文'}。切换下方开关可在结果页实时改变。</div>`;
  }
  const r = await hybridSearch(q, { mode });
  const bmap = Object.fromEntries((await Books.all()).map((b) => [b.id, b]));
  const total = r.total;
  const why = (it) => it._why ? `<span class="rwc-sr-why">${esc(it._why)}</span>` : '';

  const group = (title, rows, fn) => rows.length ? `<div class="rwc-panel">
      <h3>${esc(title)} <i>${rows.length}</i></h3>
      ${rows.map(fn).join('')}</div>` : '';

  return `
  <section class="rwc-page-head"><div><h1>Search</h1><p>“${esc(q)}” · ${total} 条结果 · ${mode === 'semantic' ? '语义模式' : '全文模式'}</p></div></section>
  <div class="rwc-toolbar"><input class="rwc-search big" value="${esc(q)}" data-act="global-search"></div>
  <div class="rwc-search-modes">
    <span>匹配方式</span>
    <button class="rwc-chip ${mode === 'full' ? 'on' : ''}" data-act="search-mode" data-v="full">全文</button>
    <button class="rwc-chip ${mode === 'semantic' ? 'on' : ''}" data-act="search-mode" data-v="semantic">语义${aiEnabled() ? '' : '（本地）'}</button>
    <span class="rwc-note rwc-inline">语义模式在无 AI 时用本地分词近似；配置 AI 后自动升级为 embedding 真语义</span>
  </div>
  ${group('Books', r.results.books, (b) => `<a class="rwc-item" href="#/book/${b.id}"><p>${esc(b.title)}</p><span>${esc(b.author || '')} · ${esc(b.category || '')}</span>${why(b)}</a>`)}
  ${group('Ideas', r.results.ideas, (i) => `<div class="rwc-item" data-act="open-idea" data-id="${i.id}"><p>${esc(i.idea)}</p><span>${esc(bmap[i.bookId]?.title || '')} · ${fmtDate(i.date)}</span>${why(i)}</div>`)}
  ${group('Daily Log', r.results.logs, (l) => `<div class="rwc-item" data-act="open-log" data-id="${l.id}"><p>${esc(l.summary || l.importantIdea || '')}</p><span>${esc(bmap[l.bookId]?.title || '')} · ${fmtDate(l.date)}</span>${why(l)}</div>`)}
  ${group('Evidence', r.results.evidence, (e) => `<div class="rwc-item" data-act="open-evidence" data-id="${e.id}"><p>${esc(e.content)}</p><span>${pill(STATUS.evidence[e.type] || e.type)}</span>${why(e)}</div>`)}
  ${group('Actions', r.results.actions, (a) => `<div class="rwc-item" data-act="open-action" data-id="${a.id}"><p>${esc(a.action)}</p><span>${pill(STATUS.action[a.status] || a.status)}</span>${why(a)}</div>`)}
  ${group('Decisions', r.results.decisions, (d) => `<div class="rwc-item" data-act="open-decision" data-id="${d.id}"><p>${esc(d.decision)}</p><span>${fmtDate(d.date)}</span>${why(d)}</div>`)}
  ${group('Principles', r.results.principles, (p) => `<div class="rwc-item" data-act="open-principle" data-id="${p.id}"><p>${esc(p.principle)}</p><span>${fmtDate(p.lastReview)}</span>${why(p)}</div>`)}
  ${total ? '' : empty('没有找到相关内容')}`;
}

/* ==================== Settings / Backup ==================== */
export async function viewSettings() {
  const info = await Backup.info();
  const kb = (info.size / 1024).toFixed(1);
  return `
  <section class="rwc-page-head"><div><h1>Settings</h1><p>数据在你自己的浏览器里 · 请定期备份</p></div></section>

  <div class="rwc-panel">
    <h3>数据概况</h3>
    <div class="rwc-metrics">
      <div class="rwc-metric"><b>${info.books}</b><span>Books</span></div>
      <div class="rwc-metric"><b>${info.ideas}</b><span>Ideas</span></div>
      <div class="rwc-metric"><b>${info.actions}</b><span>Actions</span></div>
      <div class="rwc-metric"><b>${kb} KB</b><span>Database Size</span></div>
    </div>
    <div class="rwc-panel-foot">Last Backup：${info.lastBackup ? esc(info.lastBackup.slice(0, 19).replace('T', ' ')) : '从未备份'}</div>
  </div>

  <div class="rwc-grid-2">
    <div class="rwc-panel">
      <h3>备份与导出</h3>
      <div class="rwc-btn-row">
        <button class="rwc-btn primary" data-act="export-json">导出 JSON 备份</button>
        <button class="rwc-btn" data-act="export-excel">导出 Excel</button>
      </div>
      <div class="rwc-btn-row">
        <button class="rwc-btn ghost" data-act="import-json">导入 JSON（合并）</button>
        <button class="rwc-btn ghost" data-act="import-excel">导入 Excel</button>
      </div>
      <div class="rwc-btn-row">
        <button class="rwc-btn ghost" data-act="download-template">下载导入模板</button>
        <button class="rwc-btn ghost" data-act="rollback-import">回滚上次导入</button>
      </div>
      <p class="rwc-note">导入前自动备份，可一键回滚。已有 ID 一律保留，不会破坏关联。缺书名跳过，缺 ISBN/作者自动标记「需复核」。</p>
    </div>

    <div class="rwc-panel">
      <h3>路线图（对齐《WorkBuddy Engineering Roadmap》总纲）</h3>
      <ul class="rwc-road">
        <li class="done"><b>Phase 1</b> 项目审计与系统接管 · 架构 / 功能 / 数据审计，IndexDB 9 表底座与本地持久化跑通</li>
        <li class="done"><b>Phase 2</b> 数据库与知识资产工程化 · Evidence / Connections / Actions / Decision Journal / Principles / Reviews 全量闭环 + 千本级数据底座（导入器 v2：快照回滚 / 增量幂等 / 需复核标记）</li>
        <li class="done"><b>Phase 3</b> 核心阅读体验与 Mobile First · 书详情 9 Tab 全景 · Quick Capture · 手机端 Tabbar/More 抽屉 · 响应式走查零 console error</li>
        <li class="done"><b>Phase 4</b> 知识图谱 · D3 力导向总览 + 聚焦钻取 + 关系/类型筛选 + 搜索定位</li>
        <li class="done"><b>Phase 5</b> 行动-决策-原则-个人进化 · Decisions/Principles/Reviews 闭环 + Personal Evolution 纵向时间线（同一问题几年后的答案变化）</li>
        <li class="done"><b>Phase 6</b> AI 助手 + 语义搜索 + Supabase 同步 · AI 抽象层（接地/降级，AI 内容强制 aiGenerated）· Ask My Library · 书籍分析草稿 · 混合/语义搜索 · 云端同步脚手架</li>
      </ul>
    </div>
  </div>

  <div class="rwc-grid-2">
    <div class="rwc-panel">
      <h3>AI 配置（可选）</h3>
      <p class="rwc-note">默认关闭。启用后，Ask My Library、书籍分析、语义搜索（embedding）自动解锁。Key 只存本机浏览器，绝不上传。</p>
      ${aiSettingsForm(getAIConfig())}
      <button class="rwc-btn primary" data-act="ai-config-save">保存 AI 配置</button>
      <p class="rwc-note">支持任意 OpenAI 兼容服务（OpenAI / DeepSeek / 豆包 / 本地 Ollama 等）——只需把端点改成对应地址。</p>
    </div>

    <div class="rwc-panel">
      <h3>云端同步（可选 · Supabase）</h3>
      <p class="rwc-note">默认关闭，本地优先不变。启用后可在本页一键把数据库备份到 Supabase Storage，实现多端恢复。需你自己建一个 Supabase 项目与 bucket。</p>
      ${syncSettingsForm(getSyncConfig())}
      <div class="rwc-btn-row">
        <button class="rwc-btn primary" data-act="sync-save">保存同步配置</button>
        <button class="rwc-btn" data-act="sync-now">立即备份到云端</button>
      </div>
      <p class="rwc-note">上次同步：${getSyncConfig().lastSync ? esc(getSyncConfig().lastSync.slice(0, 19).replace('T', ' ')) : '从未'}${syncEnabled() ? ' · 已启用' : ' · 未启用'}</p>
    </div>
  </div>

  <div class="rwc-panel">
    <h3>危险操作</h3>
    <button class="rwc-btn danger" data-act="wipe">清空全部数据</button>
    <p class="rwc-note">会删除本设备上全部书籍、日志与思想，且不可撤销。请先导出 JSON。</p>
  </div>`;
}

/* ==================== 表单定义（供 app.js 调用） ==================== */
export const bookFields = [
  { name: 'title', label: '书名', required: true, half: true, placeholder: '思考，快与慢' },
  { name: 'titleEn', label: 'English Title', half: true },
  { name: 'author', label: '作者', half: true },
  { name: 'translator', label: '译者', half: true },
  { name: 'authors', label: '多位作者（；分隔）', half: true, placeholder: '作者A；作者B' },
  { name: 'publisher', label: '出版社', half: true },
  { name: 'isbn', label: 'ISBN', half: true },
  { name: 'language', label: '语言', half: true, placeholder: '中文 / 英文' },
  { name: 'edition', label: '版次', half: true },
  { name: 'source', label: '数据来源', half: true, placeholder: '豆包 / 豆瓣 / 手动' },
  { name: 'year', label: '出版年', type: 'number', half: true },
  { name: 'country', label: '国别', half: true },
  { name: 'category', label: '分类', type: 'select', options: CATEGORIES, half: true },
  { name: 'format', label: '形式', type: 'select', options: FORMATS, half: true },
  { name: 'status', label: '状态', type: 'select', options: Object.entries(STATUS.book).map(([v, l]) => ({ value: v, label: l })), half: true },
  { name: 'totalPages', label: '总页数', type: 'number', half: true },
  { name: 'topics', label: '主题标签', half: true, placeholder: '认知偏误；决策' },
  { name: 'rating', label: '评分', type: 'rating', half: true },
  { name: 'startDate', label: '开始日期', type: 'date', half: true },
  { name: 'finishDate', label: '完成日期', type: 'date', half: true },
  { name: 'oneLineSummary', label: '一句话总结', type: 'textarea', rows: 2 },
  { name: 'coreQuestion', label: '核心问题', type: 'textarea', rows: 2, hint: '这本书想回答什么？' },
  { name: 'coreIdeas', label: '核心思想', type: 'textarea', rows: 3, hint: '一行一条' },
  { name: 'notes', label: '备注', type: 'textarea', rows: 2 },
];

export const logFields = (books) => [
  { name: 'bookId', label: '书籍', type: 'select', required: true, options: [{ value: '', label: '选择书籍…' }, ...books.map((b) => ({ value: b.id, label: b.title }))] },
  { name: 'date', label: '日期', type: 'date', half: true },
  { name: 'chapter', label: '章节', half: true, placeholder: '第 7 章' },
  { name: 'pagesFrom', label: '起始页', type: 'number', half: true },
  { name: 'pagesTo', label: '结束页', type: 'number', half: true },
  { name: 'minutes', label: '阅读时长（分钟）', type: 'number', half: true },
  { name: 'summary', label: '今日摘要', type: 'textarea', rows: 2 },
  { name: 'importantIdea', label: '重要观点', type: 'textarea', rows: 2 },
  { name: 'interpretation', label: '我的解读', type: 'textarea', rows: 2 },
  { name: 'question', label: '产生的疑问', type: 'textarea', rows: 2 },
  { name: 'disagreement', label: '不认同的地方', type: 'textarea', rows: 2 },
  { name: 'actionText', label: '想做的行动', type: 'textarea', rows: 2 },
];

export const ideaFields = (books) => [
  { name: 'bookId', label: '来源书籍', type: 'select', options: [{ value: '', label: '（可不关联）' }, ...books.map((b) => ({ value: b.id, label: b.title }))] },
  { name: 'date', label: '日期', type: 'date', half: true },
  { name: 'tags', label: '标签', half: true, placeholder: '决策；稀缺' },
  { name: 'idea', label: '观点 / 思想', type: 'textarea', required: true, rows: 3 },
  { name: 'interpretation', label: '我的解读', type: 'textarea', rows: 2 },
  { name: 'whyImportant', label: '为什么重要', type: 'textarea', rows: 2 },
  { name: 'application', label: '可应用在哪', type: 'textarea', rows: 2 },
];

export const evidenceFields = (books) => [
  { name: 'type', label: '证据类型', type: 'select', required: true, options: Object.entries(STATUS.evidence).map(([v, l]) => ({ value: v, label: l })), hint: '作者主张 ≠ 事实，请勿混用' },
  { name: 'bookId', label: '来源书籍', type: 'select', options: [{ value: '', label: '（可不关联）' }, ...books.map((b) => ({ value: b.id, label: b.title }))] },
  { name: 'content', label: '内容', type: 'textarea', required: true, rows: 3 },
  { name: 'source', label: '出处', half: true, placeholder: '页码 / 论文 / 史料' },
  { name: 'confidence', label: '可信度 1-5', type: 'number', half: true },
];

export const actionFields = [
  { name: 'action', label: '行动', type: 'textarea', required: true, rows: 2 },
  { name: 'category', label: '分类', half: true },
  { name: 'status', label: '状态', type: 'select', half: true, options: Object.entries(STATUS.action).map(([v, l]) => ({ value: v, label: l })) },
  { name: 'dueDate', label: '截止日期', type: 'date', half: true },
  { name: 'expectedResult', label: '预期结果', type: 'textarea', rows: 2 },
  { name: 'actualResult', label: '实际结果', type: 'textarea', rows: 2 },
  { name: 'review', label: '复盘', type: 'textarea', rows: 2 },
];

/* =============================================================
 * Phase 2
 * ============================================================= */

/* ---------------------- Evidence（PRD 第十条） ----------------------
 * 红线：绝不能把「作者说」显示成「事实」。
 * 所以每种类型有独立的视觉语言与明确标注。
 * -------------------------------------------------------------- */
const EV_META = {
  author_claim:    { flag: '这不是事实 · 是作者的判断', quote: true },
  my_inference:    { flag: '这不是事实 · 是我的推测', quote: false },
  book_fact:       { flag: '书中事实 · 可核查', quote: false },
  historical_fact: { flag: '历史事实 · 可核查', quote: false },
  research:        { flag: '研究证据 · 有方法与样本', quote: false },
};

const evConfidence = (n) => {
  const v = Math.max(0, Math.min(5, Number(n) || 0));
  return v ? `${'★'.repeat(v)}${'☆'.repeat(5 - v)}` : '';
};

export function evidenceCard(e, bmap, withBook = true) {
  const meta = EV_META[e.type] || EV_META.author_claim;
  const soft = e.type === 'author_claim' || e.type === 'my_inference';
  return `<article class="rwc-ev-card t-${esc(e.type)}${soft ? ' soft' : ''}" data-act="open-evidence" data-id="${e.id}">
    <div class="rwc-ev-top">
      <span class="rwc-ev-badge">${esc(STATUS.evidence[e.type] || e.type)}</span>
      <span class="rwc-ev-flag">${esc(meta.flag)}</span>
    </div>
    ${meta.quote
      ? `<blockquote>${esc(e.content)}</blockquote>`
      : `<p class="rwc-ev-body">${esc(e.content)}</p>`}
    <footer>
      <span>${withBook && bmap[e.bookId] ? `《${esc(bmap[e.bookId].title)}》` : ''} ${esc(e.source || '')}</span>
      <span>${evConfidence(e.confidence)}${e.aiGenerated ? pill('AI', 'ai') : ''}</span>
    </footer>
  </article>`;
}

export async function viewEvidence({ type = '' } = {}) {
  const [all, books] = await Promise.all([Evidence.all(), Books.all()]);
  const bmap = Object.fromEntries(books.map((b) => [b.id, b]));
  const list = type ? all.filter((e) => (e.type || 'author_claim') === type) : all;
  const softCount = all.filter((e) => e.type === 'author_claim' || e.type === 'my_inference').length;

  return `
  <section class="rwc-page-head">
    <div><h1>Evidence</h1><p>${all.length} 条证据 · 其中 ${softCount} 条是「主张/推断」，不是事实</p></div>
    <button class="rwc-btn primary" data-act="new-evidence">+ 新增证据</button>
  </section>

  <div class="rwc-note-bar">
    <b>Evidence 纪律</b>：作者主张 ≠ 事实。凡是来自作者判断、或个人推断的内容，
    系统一律标注来源性质，不允许它伪装成客观事实参与你的决策。
  </div>

  <div class="rwc-chips">
    <button class="${type === '' ? 'on' : ''}" data-act="ev-filter" data-v="">全部 ${all.length}</button>
    ${Object.entries(STATUS.evidence).map(([v, l]) => {
      const n = all.filter((e) => (e.type || 'author_claim') === v).length;
      return `<button class="${type === v ? 'on' : ''}" data-act="ev-filter" data-v="${v}">${esc(l)} ${n}</button>`;
    }).join('')}
  </div>

  ${list.length ? `<div class="rwc-ev-list">${list
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .map((e) => evidenceCard(e, bmap)).join('')}</div>`
    : empty('还没有证据条目', '读到有力量的句子或数据，先分清它是「作者说」还是「事实」，再存进来')}`;
}

/* ---------------------- Connections（PRD 第十一条） ---------------------- */
export async function viewConnections({ rel = '' } = {}) {
  const all = await connectionsWithContext();
  const list = rel ? all.filter((c) => c.relation === rel) : all;
  const cross = all.filter((c) => c.crossBook).length;

  return `
  <section class="rwc-page-head">
    <div><h1>Connections</h1><p>${all.length} 条连接 · 其中 ${cross} 条跨书 · 知识在这里变成网络</p></div>
    <button class="rwc-btn primary" data-act="new-connection">+ 新建连接</button>
  </section>

  <div class="rwc-note-bar">
    <b>连接的价值</b>：单本书给你观点，两本书的碰撞才给你判断。
    每次连接都要写下「我的新理解」——那才是真正属于你的东西。
  </div>

  <div class="rwc-chips">
    <button class="${rel === '' ? 'on' : ''}" data-act="cn-filter" data-v="">全部 ${all.length}</button>
    ${Object.entries(STATUS.relation).map(([v, l]) => {
      const n = all.filter((c) => c.relation === v).length;
      return `<button class="${rel === v ? 'on' : ''}" data-act="cn-filter" data-v="${v}">${esc(l)} ${n}</button>`;
    }).join('')}
  </div>

  ${list.length ? `<div class="rwc-cn-list">${list
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .map(connectionCard).join('')}</div>`
    : empty('还没有建立连接', '找两条互相印证（或互相打架）的观点，把它们连起来')}`;
}

export function connectionCard(c) {
  const side = (n, which) => n
    ? `<div class="rwc-cn-side ${which}">
         <span class="rwc-cn-type">${esc(n.typeLabel)}</span>
         <p>${esc(n.text)}</p>
         <em>${n.bookTitle ? esc(n.bookTitle) : '未关联书籍'}</em>
       </div>`
    : `<div class="rwc-cn-side missing"><p>（节点已删除）</p></div>`;
  return `<article class="rwc-cn-card" data-act="open-connection" data-id="${c.id}">
    <div class="rwc-cn-head">
      ${pill(STATUS.relation[c.relation] || c.relation, 'rel-' + (c.relation || ''))}
      ${c.crossBook ? pill('跨书', 'gold') : ''}
      ${c.aiGenerated ? pill('AI', 'ai') : ''}
    </div>
    <div class="rwc-cn-body">
      ${side(c.from, 'a')}
      <div class="rwc-cn-arrow">${relationGlyph(c.relation)}</div>
      ${side(c.to, 'b')}
    </div>
    ${c.newUnderstanding ? `<div class="rwc-cn-new"><span>我的新理解</span><p>${esc(c.newUnderstanding)}</p></div>`
      : `<div class="rwc-cn-new empty">还没写下新理解 —— 连接的意义在这里</div>`}
  </article>`;
}

const relationGlyph = (r) => ({
  similar: '≈', conflict: '≠', complementary: '+',
  causal: '→', extension: '↗', correction: '✎',
}[r] || '·');

export const connectionFields = async (bookId, presetFrom) => [
  { name: 'fromId', label: '起点', type: 'select', required: true, options: await nodeOptions(null), hint: '思想 / 书籍 / 证据' },
  { name: 'relation', label: '关系', type: 'select', required: true, half: true, options: Object.entries(STATUS.relation).map(([v, l]) => ({ value: v, label: l })) },
  { name: 'toId', label: '终点', type: 'select', required: true, options: await nodeOptions(null) },
  { name: 'newUnderstanding', label: '我的新理解', type: 'textarea', required: true, rows: 3, hint: '连接之后，你多知道了什么？这是必填项' },
];

/* ---------------------- Actions（PRD 第十二条） ---------------------- */
export async function viewActions({ status = '' } = {}) {
  const [all, books, ideas] = await Promise.all([Actions.all(), Books.all(), Ideas.all()]);
  const bmap = Object.fromEntries(books.map((b) => [b.id, b]));
  const imap = Object.fromEntries(ideas.map((i) => [i.id, i]));
  const list = status ? all.filter((a) => a.status === status) : all;
  const done = all.filter((a) => a.status === 'done').length;
  const rate = all.length ? Math.round((done / all.length) * 100) : 0;
  const order = { doing: 0, todo: 1, deferred: 2, done: 3, cancelled: 4 };
  const sorted = list.slice().sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9)
    || (b.createdAt || '').localeCompare(a.createdAt || ''));

  const srcOf = (a) => {
    if (a.sourceType === 'book' && bmap[a.sourceId]) return `来自《${bmap[a.sourceId].title}》`;
    if (imap[a.sourceId]) return `来自思想：${imap[a.sourceId].idea.slice(0, 24)}…`;
    return '';
  };

  return `
  <section class="rwc-page-head">
    <div><h1>Actions</h1><p>${all.length} 个行动 · 完成 ${done}（${rate}%）· 阅读不落到行动，就只是消遣</p></div>
    <button class="rwc-btn primary" data-act="new-action">+ 新增行动</button>
  </section>

  <div class="rwc-chips">
    <button class="${status === '' ? 'on' : ''}" data-act="ac-filter" data-v="">全部 ${all.length}</button>
    ${Object.entries(STATUS.action).map(([v, l]) => {
      const n = all.filter((a) => a.status === v).length;
      return `<button class="${status === v ? 'on' : ''}" data-act="ac-filter" data-v="${v}">${esc(l)} ${n}</button>`;
    }).join('')}
  </div>

  ${sorted.length ? `<div class="rwc-ac-list">${sorted.map((a) => `
    <article class="rwc-ac-card s-${esc(a.status)}">
      <label class="rwc-ac-check">
        <input type="checkbox" ${a.status === 'done' ? 'checked' : ''} data-act="ac-toggle" data-id="${a.id}">
        <span></span>
      </label>
      <div class="rwc-ac-main" data-act="open-action" data-id="${a.id}">
        <p class="rwc-ac-text">${esc(a.action)}</p>
        ${a.expectedResult ? `<p class="rwc-ac-line"><i>预期</i>${esc(a.expectedResult)}</p>` : ''}
        ${a.actualResult ? `<p class="rwc-ac-line"><i>实际</i>${esc(a.actualResult)}</p>` : ''}
        ${a.review ? `<p class="rwc-ac-line"><i>复盘</i>${esc(a.review)}</p>` : ''}
        <footer>
          ${pill(STATUS.action[a.status] || a.status, a.status === 'done' ? 'ok' : a.status === 'doing' ? 'gold' : '')}
          ${a.category ? pill(a.category) : ''}
          ${a.dueDate ? `<span>截止 ${fmtDate(a.dueDate)}</span>` : ''}
          ${srcOf(a) ? `<span>${esc(srcOf(a))}</span>` : ''}
        </footer>
      </div>
      <div class="rwc-ac-ops">
        ${a.status !== 'done' ? `<button class="rwc-btn ghost sm" data-act="ac-start" data-id="${a.id}">${a.status === 'doing' ? '完成' : '开始'}</button>` : ''}
      </div>
    </article>`).join('')}</div>`
    : empty('还没有行动', '挑一个想法，把它变成这周能做完的一件小事')}`;
}

/* ---------------------- Decision Journal（PRD 第十三条） ---------------------- */
export const decisionFields = (books, principles) => [
  { name: 'decision', label: '决策内容', type: 'textarea', required: true, rows: 2 },
  { name: 'date', label: '决策日期', type: 'date', half: true },
  { name: 'bookId', label: '相关书籍', type: 'select', half: true, options: [{ value: '', label: '（可不关联）' }, ...books.map((b) => ({ value: b.id, label: b.title }))] },
  { name: 'background', label: '背景', type: 'textarea', rows: 2 },
  { name: 'facts', label: '已知事实', type: 'textarea', rows: 2, hint: '只写可核查的' },
  { name: 'unknowns', label: '未知与风险', type: 'textarea', rows: 2 },
  { name: 'assumptions', label: '我的假设', type: 'textarea', rows: 2 },
  { name: 'mentalModel', label: '用到的心智模型', type: 'textarea', rows: 2, hint: '来自哪本书？' },
  { name: 'alternatives', label: '可选方案', type: 'textarea', rows: 2 },
  { name: 'choice', label: '最终选择', type: 'textarea', rows: 2 },
  { name: 'reason', label: '为什么这么选', type: 'textarea', rows: 2 },
  { name: 'principleId', label: '引用的原则', type: 'select', half: true, options: [{ value: '', label: '（可不关联）' }, ...principles.map((p) => ({ value: p.id, label: p.principle.slice(0, 30) }))] },
  { name: 'result', label: '实际结果', type: 'textarea', rows: 2, hint: '过一段时间再回来填' },
  { name: 'review', label: '复盘', type: 'textarea', rows: 2 },
];

export async function viewDecisions() {
  const [all, books, principles] = await Promise.all([Decisions.all(), Books.all(), Principles.all()]);
  const bmap = Object.fromEntries(books.map((b) => [b.id, b]));
  const pmap = Object.fromEntries(principles.map((p) => [p.id, p]));
  const list = all.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const reviewed = all.filter((d) => d.result || d.review).length;

  return `
  <section class="rwc-page-head">
    <div><h1>Decisions</h1><p>${all.length} 个决策 · ${reviewed} 个已回填结果 · 决策质量只能靠记录来校准</p></div>
    <button class="rwc-btn primary" data-act="new-decision">+ 记录决策</button>
  </section>

  <div class="rwc-note-bar">
    <b>决策日志的用法</b>：决策当下写清「事实 / 假设 / 用的模型 / 为什么这么选」，
    几个月后回来填「实际结果」——你会看到自己的判断偏差在哪。
  </div>

  ${list.length ? `<div class="rwc-dc-list">${list.map((d) => `
    <article class="rwc-dc-card" data-act="open-decision" data-id="${d.id}">
      <div class="rwc-dc-head">
        <b>${esc(d.decision)}</b>
        <span>${fmtDate(d.date)}</span>
      </div>
      ${d.choice ? `<p class="rwc-dc-line"><i>选择</i>${esc(d.choice)}</p>` : ''}
      ${d.reason ? `<p class="rwc-dc-line"><i>理由</i>${esc(d.reason)}</p>` : ''}
      ${d.result ? `<p class="rwc-dc-line"><i>结果</i>${esc(d.result)}</p>` : ''}
      ${d.review ? `<p class="rwc-dc-line"><i>复盘</i>${esc(d.review)}</p>` : ''}
      <footer>
        ${d.bookId && bmap[d.bookId] ? pill(bmap[d.bookId].title) : ''}
        ${d.principleId && pmap[d.principleId] ? pill(pmap[d.principleId].principle.slice(0, 18), 'gold') : ''}
        ${d.result || d.review ? pill('已回填结果', 'ok') : pill('待回填', 'warn')}
      </footer>
    </article>`).join('')}</div>`
    : empty('还没有决策记录', '下一次犹豫不决时，把它写进来')}`;
}

/* ---------------------- Principles（PRD 第十四条） ---------------------- */
export const principleFields = (books, ideas) => [
  { name: 'principle', label: '原则', type: 'textarea', required: true, rows: 2, hint: '一句话，能被执行的那种' },
  { name: 'sourceBookIds', label: '来源书籍', half: true, placeholder: 'BK-0001；BK-0002' },
  { name: 'sourceIdeaIds', label: '来源思想', half: true, placeholder: 'ID-0003' },
  { name: 'conditions', label: '适用条件', type: 'textarea', rows: 2 },
  { name: 'exceptions', label: '例外情况', type: 'textarea', rows: 2 },
  { name: 'risks', label: '风险与副作用', type: 'textarea', rows: 2 },
  { name: 'applications', label: '应用场景', type: 'textarea', rows: 2 },
  { name: 'result', label: '实际效果', type: 'textarea', rows: 2 },
];

export async function viewPrinciples({ show = 'active' } = {}) {
  const [all, books, ideas] = await Promise.all([Principles.all(), Books.all(), Ideas.all()]);
  const bmap = Object.fromEntries(books.map((b) => [b.id, b]));
  const imap = Object.fromEntries(ideas.map((i) => [i.id, i]));
  const list = all.filter((p) => (show === 'archived' ? p.status === 'archived' : p.status !== 'archived'));
  const sorted = list.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const stale = all.filter((p) => p.status !== 'archived' && !p.lastReview).length;

  const srcs = (p) => [
    ...(p.sourceBookIds || []).map((id) => bmap[id]?.title).filter(Boolean).map((t) => `《${t}》`),
    ...(p.sourceIdeaIds || []).map((id) => imap[id] ? imap[id].idea.slice(0, 18) + '…' : null).filter(Boolean),
  ];

  return `
  <section class="rwc-page-head">
    <div><h1>Principles</h1><p>${all.filter((p) => p.status !== 'archived').length} 条在用原则 · ${stale} 条从未复审</p></div>
    <button class="rwc-btn primary" data-act="new-principle">+ 新建原则</button>
  </section>

  <div class="rwc-note-bar">
    <b>原则不是摘录</b>：一段话不会因为被你抄下来就成为原则。
    它必须经历「形成 → 应用 → 复审 → 修正」，才配进入这里。
  </div>

  <div class="rwc-chips">
    <button class="${show === 'active' ? 'on' : ''}" data-act="pr-filter" data-v="active">在用</button>
    <button class="${show === 'archived' ? 'on' : ''}" data-act="pr-filter" data-v="archived">已归档</button>
  </div>

  ${sorted.length ? `<div class="rwc-pr-list">${sorted.map((p) => `
    <article class="rwc-pr-card${p.status === 'archived' ? ' archived' : ''}" data-act="open-principle" data-id="${p.id}">
      <h3>${esc(p.principle)}</h3>
      ${p.conditions ? `<p class="rwc-pr-line"><i>适用</i>${esc(p.conditions)}</p>` : ''}
      ${p.exceptions ? `<p class="rwc-pr-line"><i>例外</i>${esc(p.exceptions)}</p>` : ''}
      ${p.risks ? `<p class="rwc-pr-line"><i>风险</i>${esc(p.risks)}</p>` : ''}
      ${p.applications ? `<p class="rwc-pr-line"><i>应用</i>${esc(p.applications)}</p>` : ''}
      ${p.result ? `<p class="rwc-pr-line"><i>效果</i>${esc(p.result)}</p>` : ''}
      <footer>
        ${srcs(p).map((s) => pill(s)).join('')}
        <span>复审 ${fmtDate(p.lastReview)}</span>
        ${p.stillValid ? pill('仍然成立', 'ok') : pill('需要修正', 'warn')}
      </footer>
      <div class="rwc-pr-ops">
        <button class="rwc-btn ghost sm" data-act="pr-review" data-id="${p.id}">复审</button>
        <button class="rwc-btn ghost sm" data-act="open-principle" data-id="${p.id}">修改</button>
        ${p.status === 'archived'
          ? `<button class="rwc-btn ghost sm" data-act="pr-restore" data-id="${p.id}">恢复</button>`
          : `<button class="rwc-btn ghost sm" data-act="pr-archive" data-id="${p.id}">归档</button>`}
      </div>
    </article>`).join('')}</div>`
    : empty(show === 'archived' ? '没有归档的原则' : '还没有原则', '从一条反复被验证的想法开始，让它经过复审再进来')}`;
}

/* ---------------------- Reviews（PRD 第十五条） ---------------------- */
function recentKeys(period, n = 8) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    if (period === 'daily') d.setDate(d.getDate() - i);
    else if (period === 'weekly') d.setDate(d.getDate() - i * 7);
    else if (period === 'monthly') d.setMonth(d.getMonth() - i);
    else if (period === 'quarterly') d.setMonth(d.getMonth() - i * 3);
    else d.setFullYear(d.getFullYear() - i);
    out.push(periodKeyOf(period, d));
  }
  return [...new Set(out)];
}

export async function viewReviews({ period = 'weekly', key = '' } = {}) {
  const k = key || periodKeyOf(period);
  const [data, saved, history] = await Promise.all([
    buildReview(period, k),
    Reviews.findByKey(period, k),
    Reviews.all(),
  ]);
  const content = saved?.content || data;
  const [a, b] = content.range || ['—', '—'];

  const metric = (v, l) => `<div class="rwc-metric"><b>${v}</b><span>${esc(l)}</span></div>`;
  const cards = [
    metric(content.logCount, '阅读记录'),
    metric(content.hours, '阅读小时'),
    metric(content.ideas, '新思想'),
    metric(content.evidence, '新证据'),
    metric(content.connections, '新连接'),
    metric(content.actionsDone, '完成行动'),
    metric(content.decisions, '决策'),
    metric(content.principles, '新原则'),
  ].join('');

  return `
  <section class="rwc-page-head">
    <div><h1>Reviews</h1><p>自动汇总 · 把一段时间里的阅读转化成看得见的改变</p></div>
  </section>

  <div class="rwc-chips">
    ${Object.entries(PERIODS).map(([v, l]) => `<button class="${period === v ? 'on' : ''}" data-act="rv-period" data-v="${v}">${l}度复盘</button>`).join('')}
  </div>

  <div class="rwc-toolbar">
    <select data-act="rv-key">
      ${recentKeys(period, period === 'daily' ? 14 : 10).map((x) => `<option value="${esc(x)}" ${x === k ? 'selected' : ''}>${esc(x)}</option>`).join('')}
    </select>
    <button class="rwc-btn primary" data-act="rv-save">${saved ? '更新这份复盘' : '保存这份复盘'}</button>
    ${saved ? `<button class="rwc-btn ghost" data-act="rv-del" data-id="${saved.id}">删除</button>` : ''}
  </div>

  <div class="rwc-panel">
    <h3>${esc(PERIODS[period])}度复盘 · ${esc(k)} <i>${esc(a)} ~ ${esc(b)}</i></h3>
    <div class="rwc-metrics">${cards}</div>
  </div>

  <div class="rwc-grid-2">
    <div class="rwc-panel">
      <h3>本期思想</h3>
      ${(content.highlights || []).length ? content.highlights.map((h) => `
        <div class="rwc-item" data-act="open-idea" data-id="${h.id}"><p>${esc(h.text)}</p></div>`).join('')
        : empty('这段时间没有记录思想')}
    </div>
    <div class="rwc-panel">
      <h3>本期完成的行动</h3>
      ${(content.actionList || []).length ? content.actionList.map((x) => `
        <div class="rwc-item" data-act="open-action" data-id="${x.id}">
          <p>${esc(x.text)}</p>${x.result ? `<span>${esc(x.result)}</span>` : ''}</div>`).join('')
        : empty('这段时间没有完成行动')}
    </div>
  </div>

  <div class="rwc-panel">
    <h3>本期决策</h3>
    ${(content.decisionList || []).length ? content.decisionList.map((d) => `
      <div class="rwc-item" data-act="open-decision" data-id="${d.id}">
        <p>${esc(d.text)}</p>${d.choice ? `<span>选择：${esc(d.choice)}</span>` : ''}</div>`).join('')
      : empty('这段时间没有记录决策')}
  </div>

  <div class="rwc-panel">
    <h3>我的复盘笔记</h3>
    <textarea class="rwc-notes" data-act="rv-notes" rows="5"
      placeholder="这段时间，阅读真的改变了我的什么判断或行为？">${esc(content.notes || '')}</textarea>
    <div class="rwc-panel-foot">${saved ? `已保存 · ${esc((saved.createdAt || '').slice(0, 10))}` : '尚未保存 · 写完后记得点上方「保存」'}</div>
  </div>

  <div class="rwc-panel">
    <h3>历史复盘</h3>
    ${history.length ? history.slice(0, 12).map((r) => `
      <a class="rwc-item" href="#/reviews?period=${esc(r.period)}&key=${esc(r.periodKey)}">
        <p>${esc(PERIODS[r.period] || r.period)}度复盘 ${esc(r.periodKey)}</p>
        <span>${esc((r.createdAt || '').slice(0, 10))}${r.content?.notes ? ' · 有笔记' : ''}</span></a>`).join('')
      : empty('还没有保存过复盘')}
  </div>`;
}

/* ==================== Knowledge Graph（Phase 3） ==================== */
const NODE_TYPES = [
  { v: '', l: '全部类型' }, { v: 'book', l: '书籍' }, { v: 'idea', l: '思想' }, { v: 'evidence', l: '证据' },
];
const GRAPH_RELS = [
  { v: '', l: '全部关系' },
  { v: 'similar', l: '相似' }, { v: 'conflict', l: '冲突' }, { v: 'complementary', l: '互补' },
  { v: 'causal', l: '因果' }, { v: 'extension', l: '延伸' }, { v: 'correction', l: '修正' },
  { v: 'related', l: '相关书' },
];

export async function viewGraph(state = {}) {
  const relBtns = GRAPH_RELS.map((r) => `<button class="rwc-chip ${state.rel === r.v ? 'on' : ''}" data-act="graph-filter-rel" data-v="${r.v}">${esc(r.l)}</button>`).join('');
  const typeBtns = NODE_TYPES.map((t) => `<button class="rwc-chip ${state.type === t.v ? 'on' : ''}" data-act="graph-filter-type" data-v="${t.v}">${esc(t.l)}</button>`).join('');
  return `
  <section class="rwc-page-head">
    <div><h1>Knowledge Graph</h1><p>连接即判断 · 点击节点钻取它的关系网</p></div>
  </section>

  <div class="rwc-graph-toolbar">
    <div class="rwc-graph-filters">
      <span class="rwc-graph-flabel">关系</span>${relBtns}
      <span class="rwc-graph-sep"></span>
      <span class="rwc-graph-flabel">节点</span>${typeBtns}
    </div>
    <input class="rwc-graph-search" data-act="graph-search" placeholder="搜索节点（书名 / 思想 / 证据）…" value="${esc(state.q || '')}">
  </div>

  <div class="rwc-graph-wrap">
    <svg id="rwc-graph-svg" class="rwc-graph-svg" aria-label="知识图谱"></svg>
    <div class="rwc-graph-legend"></div>
    <aside class="rwc-graph-detail" id="rwc-graph-detail" hidden></aside>
  </div>`;
}

/* ---------- d3 渲染（innerHTML 挂载后由 app.js 调用） ---------- */
export async function initGraph(state = {}) {
  const d3 = window.d3;
  const svgEl = document.getElementById('rwc-graph-svg');
  const wrap = svgEl && svgEl.parentElement;
  if (!svgEl || !wrap) return;
  if (!d3) { console.warn('D3 未加载'); return; }

  const data = await buildGraphData({ rel: state.rel, type: state.type, q: state.q });

  wrap.querySelector('.rwc-graph-empty')?.remove();
  if (!data.nodes.length) {
    const e = document.createElement('div');
    e.className = 'rwc-graph-empty';
    e.innerHTML = `<div class="rwc-graph-empty-in"><h3>还没有连接</h3>
      <p>去 Connections 建立第一条跨书连接，知识网络就会在这里长出第一根线。</p>
      <a class="rwc-btn primary" href="#/connections">去建连接</a></div>`;
    wrap.insertBefore(e, svgEl);
    return;
  }

  const width = wrap.clientWidth || 900;
  const height = wrap.clientHeight || 560;
  const nodes = data.nodes.map((n) => ({ ...n }));
  const links = data.links.map((l) => ({ ...l }));
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d) => d.id).distance(95).strength(0.55))
    .force('charge', d3.forceManyBody().strength(-190))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide().radius((d) => nodeRadius(d) + 7));
  if (nodes.length > 500) { sim.alphaDecay(0.05); sim.velocityDecay(0.5); }

  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.2, 4]).on('zoom', (ev) => g.attr('transform', ev.transform));
  svg.call(zoom);

  const link = g.append('g').attr('class', 'rwc-graph-links')
    .selectAll('line').data(links).join('line')
    .attr('class', (d) => 'rwc-graph-edge rel-' + (d.relation || ''));

  const node = g.append('g').attr('class', 'rwc-graph-nodes')
    .selectAll('g').data(nodes).join('g')
    .attr('class', 'rwc-graph-node')
    .attr('data-id', (d) => d.id)
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.25).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on('end', (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
    .on('click', (ev, d) => { ev.stopPropagation(); focusNode(d, links, byId); });

  node.each(function (d) { drawNodeShape(d3.select(this), d); });
  node.append('text').attr('class', 'rwc-graph-label').text((d) => shortLabel(d))
    .attr('dy', (d) => nodeRadius(d) + 13).attr('text-anchor', 'middle');
  node.append('title').text((d) => `${NODE_NAME[d.type]}：${d.text}`);

  sim.on('tick', () => {
    link.attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
    node.attr('transform', (d) => `translate(${d.x},${d.y})`);
  });

  svg.on('click', () => clearFocus());
  renderLegend();

  // 把详情渲染与聚焦函数暴露给闭包
  function focusNode(d, links, byId) {
    const neighbors = new Set([d.id]);
    links.forEach((l) => {
      const s = l.source.id, t = l.target.id;
      if (s === d.id) neighbors.add(t);
      if (t === d.id) neighbors.add(s);
    });
    node.classed('dim', (n) => !neighbors.has(n.id));
    node.classed('focus', (n) => n.id === d.id);
    node.classed('nb', (n) => neighbors.has(n.id) && n.id !== d.id);
    link.classed('dim', (l) => l.source.id !== d.id && l.target.id !== d.id);
    link.classed('hot', (l) => l.source.id === d.id || l.target.id === d.id);
    showDetail(d, links, byId);
  }
  function clearFocus() {
    node.classed('dim', false).classed('focus', false).classed('nb', false);
    link.classed('dim', false).classed('hot', false);
    const det = document.getElementById('rwc-graph-detail');
    if (det) det.hidden = true;
  }
  function showDetail(d, links, byId) {
    const det = document.getElementById('rwc-graph-detail');
    if (!det) return;
    const rels = links.filter((l) => l.source.id === d.id || l.target.id === d.id)
      .map((l) => {
        const otherId = l.source.id === d.id ? l.target.id : l.source.id;
        const o = byId[otherId];
        return { rel: l.relation, other: o };
      });
    const items = rels.length ? rels.map((r) => `
      <li>
        <span class="g-rel">${relationGlyph(r.rel)} ${esc(STATUS.relation[r.rel] || (r.rel === 'related' ? '相关书' : r.rel))}</span>
        <span class="g-other">${esc(r.other ? r.other.text : '（已删除）')}</span>
        ${r.other ? `<button class="g-go" data-act="graph-open-${r.other.type}" data-id="${r.other.id}">查看</button>` : ''}
      </li>`).join('')
      : '<li class="g-empty">这个节点还没有连接</li>';
    det.innerHTML = `
      <button class="g-close" data-act="graph-clear-focus" aria-label="关闭">×</button>
      <div class="g-type g-type-${d.type}">${NODE_NAME[d.type]}</div>
      <h3>${esc(d.text)}</h3>
      ${d.bookTitle ? `<p class="g-book">📖 ${esc(d.bookTitle)}</p>` : ''}
      <p class="g-meta">连接度 ${d.degree} · 点击「查看」跳转原文</p>
      <h4>关系网（${rels.length}）</h4>
      <ul class="g-rel-list">${items}</ul>`;
    det.hidden = false;
  }
}

const NODE_NAME = { book: '书籍', idea: '思想', evidence: '证据' };

function nodeRadius(d) { return 7 + Math.min(11, Math.sqrt(d.degree || 0) * 2.2); }

function shortLabel(d) {
  const t = d.type === 'book' ? d.text : (d.text || '').replace(/\s+/g, ' ');
  return t.length > 14 ? t.slice(0, 13) + '…' : t;
}

function drawNodeShape(sel, d) {
  const r = nodeRadius(d);
  const cls = 'g-shape shape-' + d.type;
  if (d.type === 'book') {
    sel.append('rect').attr('class', cls)
      .attr('x', -r).attr('y', -r).attr('width', r * 2).attr('height', r * 2).attr('rx', 3);
  } else if (d.type === 'evidence') {
    sel.append('path').attr('class', cls)
      .attr('d', `M0,${-r} L${r},0 L0,${r} L${-r},0 Z`);
  } else {
    sel.append('circle').attr('class', cls).attr('r', r);
  }
}

function renderLegend() {
  const box = document.querySelector('.rwc-graph-legend');
  if (!box) return;
  box.innerHTML = `
    <div class="g-leg"><b>节点</b>
      <span><i class="lg-book"></i>书籍</span><span><i class="lg-idea"></i>思想</span><span><i class="lg-evidence"></i>证据</span>
    </div>
    <div class="g-leg"><b>关系</b>
      <span><i class="lg-rel rel-similar"></i>相似</span><span><i class="lg-rel rel-conflict"></i>冲突</span>
      <span><i class="lg-rel rel-causal"></i>因果</span><span><i class="lg-rel rel-related"></i>相关书</span>
    </div>`;
}

/* ==================== Phase 5：个人进化纵向视图 ==================== */
const EV_OPEN = {
  books: (id) => `<a class="rwc-evo-item" href="#/book/${id}">`,
  ideas: (id) => `<div class="rwc-evo-item" data-act="open-idea" data-id="${id}">`,
  logs: (id) => `<div class="rwc-evo-item" data-act="open-log" data-id="${id}">`,
  evidence: (id) => `<div class="rwc-evo-item" data-act="open-evidence" data-id="${id}">`,
  actions: (id) => `<div class="rwc-evo-item" data-act="open-action" data-id="${id}">`,
  decisions: (id) => `<div class="rwc-evo-item" data-act="open-decision" data-id="${id}">`,
  principles: (id) => `<div class="rwc-evo-item" data-act="open-principle" data-id="${id}">`,
};
const EV_CLOSE = { books: '</a>', ideas: '</div>', logs: '</div>', evidence: '</div>', actions: '</div>', decisions: '</div>', principles: '</div>' };

function evoItem(e) {
  const open = EV_OPEN[e.entity]?.(e.id) || '<div class="rwc-evo-item">';
  const close = EV_CLOSE[e.entity] || '</div>';
  return `${open}
    <div class="rwc-evo-dot"></div>
    <div class="rwc-evo-body">
      <div class="rwc-evo-meta"><span class="rwc-pill">${esc(e.type)}</span><span>${fmtDate(e.date)}</span>${e.bookTitle ? `<span>📖 ${esc(e.bookTitle)}</span>` : ''}</div>
      <p>${esc(e.text)}</p>
    </div>${close}`;
}

export async function viewEvolution(state = {}) {
  const tracks = await evolutionTracks();
  const selected = state.track || '';
  const [trackObj, timeline, books] = selected
    ? await Promise.all([Promise.resolve(tracks.find((t) => t.id === selected) || null), evolutionTimeline(tracks.find((t) => t.id === selected)), Books.all()])
    : [null, { entries: [], years: [] }, []];
  const bmap = Object.fromEntries(books.map((b) => [b.id, b]));

  const byKind = (k, label) => {
    const ts = tracks.filter((t) => t.kind === k);
    if (!ts.length) return '';
    return `<div class="rwc-evo-group"><p class="rwc-evo-glabel">${label}</p>
      <div class="rwc-chips">${ts.map((t) => `<button class="rwc-chip ${selected === t.id ? 'on' : ''}" data-act="evo-track" data-id="${esc(t.id)}" title="${esc(t.subtitle)}">${esc(t.title)}</button>`).join('')}</div></div>`;
  };

  let body;
  if (!selected) {
    body = empty('选择一个主题 / 书 / 原则，看你的思想如何随时间变化', '这条路记录「同一个问题，几年后我的答案变了什么」——系统保存的不是单一结论，而是思想的变化本身');
  } else if (!timeline.entries.length) {
    body = empty('这个时间线还没有带日期的条目', '去添加一些 Ideas / Logs / Decisions 并标上日期，时间线会逐渐长出来');
  } else {
    body = timeline.years.map((y) => {
      const items = timeline.entries.filter((e) => (e.date || '').slice(0, 4) === y);
      return `<div class="rwc-evo-year"><h3>${esc(y)}</h3>
        <div class="rwc-evo-line">${items.map(evoItem).join('')}</div></div>`;
    }).join('');
  }

  return `
  <section class="rwc-page-head">
    <div><h1>Personal Evolution</h1><p>同一问题，几年后我的答案发生了什么变化？</p></div>
  </section>
  <div class="rwc-note-bar"><b>思想变化，而非单一思想</b>：系统记录你某年某月的判断，几年后它是否还在成立、被修正、或长成了原则。这才是个人知识资产真正的复利。</div>

  <div class="rwc-evo-tracks">
    ${byKind('principle', '我的原则')}
    ${byKind('book', '书籍')}
    ${byKind('tag', '主题标签')}
  </div>

  ${selected ? `<div class="rwc-panel"><h3>${esc(trackObj ? trackObj.title : '时间线')} · ${timeline.entries.length} 条带日期的条目</h3>${body}</div>`
    : `<div class="rwc-panel"><h3>从一条反复出现的主题开始</h3>${body}</div>`}`;
}

/* ==================== Phase 6：AI 助手（Ask My Library + 书籍分析） ==================== */
export async function viewAssistant() {
  const books = await Books.all();
  const on = aiEnabled();
  return `
  <section class="rwc-page-head">
    <div><h1>AI 助手</h1><p>你的个人知识助手 · 只基于你自己的图书馆回答，绝不编造</p></div>
  </section>
  <div class="rwc-note-bar"><b>接地原则（Grounded）</b>：AI 回答只能引用你数据库里的片段；库中无证据时会明确说 "No evidence found in your library."。所有 AI 产出都标记为 AI 草稿，需你确认才入库。</div>

  ${on ? '' : `<div class="rwc-ai-warn">AI 尚未配置：Ask My Library 当前仅展示检索片段（不综合）；书籍分析不可用。去 Settings → AI 配置 启用后自动解锁。</div>`}

  <div class="rwc-ai-tools">
    <div class="rwc-panel">
      <h3>Ask My Library</h3>
      <p class="rwc-note">问我读过的书相关的问题，例如「我过去读过哪些关于决策 / 稀缺的书？」</p>
      <div class="rwc-ai-input">
        <input class="rwc-search" id="rwc-ai-q" placeholder="问我图书馆里的任何问题…">
        <button class="rwc-btn primary" data-act="ai-send">问一问</button>
      </div>
    </div>
    <div class="rwc-panel">
      <h3>书籍分析</h3>
      <p class="rwc-note">选一本书，AI 帮你提取核心思想 / 值得思考的问题 / 可落地的行动（草稿，待你保存）</p>
      <div class="rwc-ai-input">
        <select id="rwc-ai-book">${books.map((b) => `<option value="${b.id}">${esc(b.title)}</option>`).join('')}</select>
        <button class="rwc-btn primary" data-act="ai-analyze">分析</button>
      </div>
    </div>
  </div>

  <div id="rwc-ai-out" class="rwc-ai-out">${on ? empty('问个问题，或选一本书来分析') : empty('未配置 AI：输入问题后将展示从你图书馆检索到的相关片段')}</div>`;
}

function aiCitations(snippets) {
  if (!snippets.length) return '';
  return `<div class="rwc-ai-cites"><h4>引用的图书馆片段（${snippets.length}）</h4><ul>${snippets.map((s) => {
    const act = { ideas: 'open-idea', logs: 'open-log', evidence: 'open-evidence', actions: 'open-action', decisions: 'open-decision', principles: 'open-principle' }[s.store];
    if (s.store === 'books') {
      return `<li><a href="#/book/${s.id}"><span class="rwc-pill">${esc(s.type)}</span> ${esc(s.text)}</a><em>${esc(s.bookTitle || '')}${s.date ? ' · ' + esc(s.date) : ''}</em></li>`;
    }
    return `<li ${act ? `data-act="${act}" data-id="${s.id}"` : ''}><span class="rwc-pill">${esc(s.type)}</span> ${esc(s.text)}<em>${esc(s.bookTitle || '')}${s.date ? ' · ' + esc(s.date) : ''}</em></li>`;
  }).join('')}</ul></div>`;
}

export async function runAskLibrary(q) {
  const out = document.getElementById('rwc-ai-out');
  if (!out || !q || !q.trim()) return;
  out.innerHTML = `<div class="rwc-ai-think">正在从你的图书馆检索相关片段…</div>`;
  try {
    const snippets = await retrieve(q, 14);
    if (!aiEnabled()) {
      out.innerHTML = `<div class="rwc-ai-note">未配置 AI：以下是检索到的相关片段（配置 AI 后可自动综合成回答）。</div>`
        + aiCitations(snippets)
        + (snippets.length ? '' : '<div class="rwc-ai-note">没有检索到相关片段。试着换个问法，或先丰富你的读书记录。</div>');
      return;
    }
    const ctx = snippets.map((s, i) => `[${i + 1}] (${s.type}${s.bookTitle ? ' · ' + s.bookTitle : ''}) ${s.text}`).join('\n\n');
    const sys = `你是"我的个人知识助手"，只能基于【我的图书馆】提供的片段回答用户问题。如果片段里没有相关信息，明确回答 "No evidence found in your library."，不要编造任何书籍、作者或结论。在论断后用 [n] 标注引用了哪个片段编号。`;
    const content = await aiChat([
      { role: 'system', content: sys },
      { role: 'user', content: `【我的图书馆】\n${ctx}\n\n【用户问题】${q}` },
    ]);
    out.innerHTML = `<div class="rwc-ai-answer">${esc(content).replace(/\n/g, '<br>')}</div>` + aiCitations(snippets);
  } catch (e) {
    out.innerHTML = `<div class="rwc-ai-err">${esc(e.message)}</div>`;
  }
}

export async function runAnalyzeBook(bookId) {
  const out = document.getElementById('rwc-ai-out');
  const book = await Books.get(bookId);
  if (!book || !out) return;
  out.innerHTML = `<div class="rwc-ai-think">正在分析《${esc(book.title)}》…</div>`;
  try {
    if (!aiEnabled()) throw new Error('AI 尚未配置：请在 Settings → AI 配置 启用后再分析');
    const d = await Books.detail(bookId);
    const material = [
      book.oneLineSummary, book.coreQuestion, (book.coreIdeas || []).join('\n'),
      ...d.ideas.map((i) => i.idea + '：' + (i.interpretation || '')),
      ...d.evidence.map((e) => e.content),
      ...d.logs.map((l) => l.summary || l.importantIdea || ''),
    ].filter(Boolean).join('\n\n');
    const sys = `你是阅读分析助手。基于【书籍材料】产出 JSON，键为 coreIdeas/questions/actions/contradictions，每个是字符串数组（最多 6 条），内容必须来自材料、可落地。不要编造书籍未提及的内容。`;
    const raw = await aiChat([
      { role: 'system', content: sys },
      { role: 'user', content: `【书籍】《${book.title}》\n【材料】\n${material}` },
    ], { json: true, temperature: 0.4 });
    const parsed = safeJson(raw, {});
    out.innerHTML = aiDraftCards(parsed, book);
  } catch (e) {
    out.innerHTML = `<div class="rwc-ai-err">${esc(e.message)}</div>`;
  }
}

function aiDraftCards(parsed, book) {
  const sec = (title, items, kind) => (items && items.length)
    ? `<div class="rwc-ai-sec"><h4>${esc(title)} <span class="rwc-pill ai">AI 草稿</span></h4>
        ${items.slice(0, 6).map((t) => `<div class="rwc-ai-draft"><p>${esc(t)}</p>
          <button class="rwc-btn ghost sm" data-act="ai-save-${kind}" data-content="${esc(t)}" data-book="${book.id}">保存</button></div>`).join('')}</div>`
    : '';
  const any = (parsed.coreIdeas || []).length + (parsed.questions || []).length + (parsed.actions || []).length + (parsed.contradictions || []).length;
  return `<div class="rwc-ai-note">以下为 AI 基于《${esc(book.title)}》自动提取的草稿，全部标记 AI 生成；保存后请人工复核。</div>`
    + (any ? '' : '<div class="rwc-ai-note">没有提取到内容，可能材料太少。先为这本书多记几条 Ideas / Logs。</div>')
    + sec('核心思想', parsed.coreIdeas, 'idea')
    + sec('值得思考的问题', parsed.questions, 'question')
    + sec('可落地的行动', parsed.actions, 'action')
    + sec('可能的矛盾点', parsed.contradictions, 'note');
}

function aiSettingsForm(c) {
  return `
    <label class="rwc-field"><span>启用 AI</span>
      <select id="ai-enabled">
        <option value="true" ${c.enabled ? 'selected' : ''}>启用</option>
        <option value="false" ${!c.enabled ? 'selected' : ''}>关闭</option>
      </select></label>
    <label class="rwc-field"><span>API 端点（OpenAI 兼容）</span><input id="ai-endpoint" value="${esc(c.endpoint)}" placeholder="https://api.openai.com/v1"></label>
    <label class="rwc-field"><span>对话模型</span><input id="ai-model" value="${esc(c.model)}" placeholder="gpt-4o-mini"></label>
    <label class="rwc-field"><span>Embedding 模型</span><input id="ai-embed" value="${esc(c.embeddingModel)}" placeholder="text-embedding-3-small"></label>
    <label class="rwc-field"><span>API Key</span><input id="ai-key" type="password" value="${esc(c.apiKey)}" placeholder="sk-..."></label>`;
}

function syncSettingsForm(s) {
  return `
    <label class="rwc-field"><span>启用同步</span>
      <select id="sync-enabled">
        <option value="true" ${s.enabled ? 'selected' : ''}>启用</option>
        <option value="false" ${!s.enabled ? 'selected' : ''}>关闭</option>
      </select></label>
    <label class="rwc-field"><span>Supabase 端点</span><input id="sync-endpoint" value="${esc(s.endpoint)}" placeholder="https://xxxx.supabase.co"></label>
    <label class="rwc-field"><span>Anon Key</span><input id="sync-key" type="password" value="${esc(s.anonKey)}" placeholder="eyJ..."></label>
    <label class="rwc-field"><span>Bucket 名</span><input id="sync-bucket" value="${esc(s.bucket)}" placeholder="rwc-os-backups"></label>`;
}
