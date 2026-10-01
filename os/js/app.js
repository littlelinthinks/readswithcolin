/* =============================================================
 * READS WITH COLIN OS — 应用外壳：路由 / 交互 / Quick Capture
 * ============================================================= */

import { db } from './db.js';
import * as S from './store.js';
import * as V from './views.js';
import * as UI from './ui.js';
import { exportExcel, importExcel, exportJSON, importJSON, exportTemplate } from './xlsxio.js';
import { seedIfEmpty, loadDemoData } from './seed.js';

const app = document.getElementById('app');

/* 导航分组（PRD 第三条：完整导航）
 *  INPUT   Dashboard / Books / Daily Log / Ideas
 *  SENSE   Evidence / Connections / Actions
 *  OUTPUT  Decisions / Principles / Reviews
 *  SYSTEM  Search / Settings
 */
const NAV = [
  ['#/dashboard', 'Dashboard', '今日'],
  ['#/books', 'Books', '书籍'],
  ['#/log', 'Daily Log', '记录'],
  ['#/ideas', 'Ideas', '思想'],
];
const MID = [
  ['#/evidence', 'Evidence', '证据'],
  ['#/connections', 'Connections', '连接'],
  ['#/graph', 'Graph', '图谱'],
  ['#/actions', 'Actions', '行动'],
];
const MORE = [
  ['#/decisions', 'Decisions', '决策'],
  ['#/principles', 'Principles', '原则'],
  ['#/reviews', 'Reviews', '复盘'],
  ['#/evolution', 'Evolution', '进化'],
  ['#/assistant', 'AI 助手', 'AI'],
  ['#/search', 'Search', '搜索'],
  ['#/settings', 'Settings', '设置'],
];
const ALL_NAV = [...NAV, ...MID, ...MORE];

let booksState = { q: '', status: '', sort: 'updated' };
let searchState = { q: '', mode: 'full' };
let evidenceState = { type: '' };
let connectionsState = { rel: '' };
let actionsState = { status: '' };
let principlesState = { show: 'active' };
let graphState = { rel: '', type: '', q: '' };
let evolutionState = { track: null };
let reviewsState = { period: 'weekly', key: '' };
let currentBookId = null;

/* ---------------------- 导航渲染 ---------------------- */
const linkOf = ([h, en, zh], here) =>
  `<a class="${here.startsWith(h) ? 'on' : ''}" href="${h}"><span>${en}</span><em>${zh}</em></a>`;

function renderNav() {
  const here = location.hash || '#/dashboard';
  document.getElementById('nav-main').innerHTML = NAV.map((n) => linkOf(n, here)).join('');
  document.getElementById('nav-mid').innerHTML = MID.map((n) => linkOf(n, here)).join('');
  document.getElementById('nav-more').innerHTML = MORE.map((n) => linkOf(n, here)).join('');
  document.getElementById('tabbar').innerHTML = [
    ['#/dashboard', 'Dashboard'], ['#/books', 'Books'], null, ['#/ideas', 'Ideas'], null,
  ].map((n) => {
    if (!n) return '<span class="rwc-tab-slot"></span>';
    return `<a class="${here.startsWith(n[0]) ? 'on' : ''}" href="${n[0]}"><i data-ico="${n[1]}"></i><span>${n[1]}</span></a>`;
  }).join('');
  // 中间那个 slot 换成 FAB，最后一个换成 More
  const slots = document.getElementById('tabbar').querySelectorAll('.rwc-tab-slot');
  if (slots[0]) slots[0].outerHTML = '<a class="rwc-tab-plus" data-act="qc" aria-label="快速记录"><i>+</i></a>';
  if (slots[1]) {
    const on = MORE.some(([h]) => here.startsWith(h));
    slots[1].outerHTML = `<a class="${on ? 'on' : ''}" data-act="more" aria-label="更多"><i data-ico="More"></i><span>More</span></a>`;
  }
}

/** 手机端 More 抽屉：列出全部导航 */
function openMoreSheet() {
  const sheet = document.createElement('div');
  sheet.className = 'rwc-overlay rwc-qc';
  const here = location.hash || '#/dashboard';
  sheet.innerHTML = `<div class="rwc-sheet">
      <div class="rwc-sheet-bar"></div>
      <h3>全部功能</h3>
      <div class="rwc-more-grid">
        ${ALL_NAV.map(([h, en, zh]) => `<a class="${here.startsWith(h) ? 'on' : ''}" href="${h}"><b>${en}</b><span>${zh}</span></a>`).join('')}
      </div>
      <button class="rwc-btn ghost full" data-close>关闭</button>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add('in'));
  const close = () => { sheet.classList.remove('in'); setTimeout(() => sheet.remove(), 220); };
  sheet.querySelector('[data-close]').onclick = close;
  sheet.addEventListener('mousedown', (e) => { if (e.target === sheet) close(); });
  sheet.querySelectorAll('a[href]').forEach((a) => { a.onclick = () => setTimeout(close, 60); });
}

/* ---------------------- 路由 ---------------------- */
async function route() {
  const raw = location.hash.replace(/^#\/?/, '');      // book/BK-0001?tab=ideas
  const [path, qs] = raw.split('?');
  const seg = path.split('/').filter(Boolean);
  const params = new URLSearchParams(qs || '');
  renderNav();
  window.scrollTo(0, 0);

  try {
    if (seg[0] === 'books') app.innerHTML = await V.viewBooks(booksState);
    else if (seg[0] === 'book' && seg[1]) {
      currentBookId = seg[1];
      app.innerHTML = await V.viewBookDetail(seg[1], params.get('tab') || 'overview');
    } else if (seg[0] === 'log') app.innerHTML = await V.viewLog();
    else if (seg[0] === 'ideas') app.innerHTML = await V.viewIdeas();
    else if (seg[0] === 'evidence') app.innerHTML = await V.viewEvidence(evidenceState);
    else if (seg[0] === 'connections') app.innerHTML = await V.viewConnections(connectionsState);
    else if (seg[0] === 'graph') app.innerHTML = await V.viewGraph(graphState);
    else if (seg[0] === 'actions') app.innerHTML = await V.viewActions(actionsState);
    else if (seg[0] === 'decisions') app.innerHTML = await V.viewDecisions();
    else if (seg[0] === 'principles') app.innerHTML = await V.viewPrinciples(principlesState);
    else if (seg[0] === 'reviews') {
      reviewsState.period = params.get('period') || reviewsState.period || 'weekly';
      reviewsState.key = params.get('key') || '';
      app.innerHTML = await V.viewReviews(reviewsState);
    } else if (seg[0] === 'evolution') app.innerHTML = await V.viewEvolution(evolutionState);
    else if (seg[0] === 'assistant') app.innerHTML = await V.viewAssistant();
    else if (seg[0] === 'search') app.innerHTML = await V.viewSearch(searchState.q, searchState.mode);
    else if (seg[0] === 'settings') app.innerHTML = await V.viewSettings();
    else app.innerHTML = await V.viewDashboard();
    if (seg[0] === 'graph') await V.initGraph(graphState);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="rwc-panel"><h3>出错了</h3><p>${UI.esc(e.message)}</p></div>`;
  }
  afterRender();
}

function afterRender() {
  const si = app.querySelector('[data-act="book-search"]');
  if (si && booksState.q) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
  const gs = app.querySelector('[data-act="global-search"]');
  if (gs && searchState.q && document.activeElement !== gs) {
    gs.focus(); gs.setSelectionRange(gs.value.length, gs.value.length);
  }
}

/* ---------------------- Quick Capture（PRD 第八条） ---------------------- */
const QC_TYPES = [
  { k: 'idea', t: 'Idea', d: '记一个观点', ic: '思' },
  { k: 'evidence', t: 'Quote / Source', d: '存一句引文或证据', ic: '证' },
  { k: 'question', t: 'Question', d: '记下产生的疑问', ic: '问' },
  { k: 'action', t: 'Action', d: '把想法变成行动', ic: '行' },
  { k: 'log', t: 'Book Note', d: '今日阅读记录', ic: '读' },
];

function openQuickCapture() {
  const sheet = document.createElement('div');
  sheet.className = 'rwc-overlay rwc-qc';
  sheet.innerHTML = `<div class="rwc-sheet">
      <div class="rwc-sheet-bar"></div>
      <h3>Quick Capture</h3>
      <p>你想记下什么？</p>
      <div class="rwc-qc-grid">
        ${QC_TYPES.map((t) => `<button data-qc="${t.k}"><i>${t.ic}</i><b>${t.t}</b><span>${t.d}</span></button>`).join('')}
      </div>
      <button class="rwc-btn ghost full" data-close>关闭</button>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add('in'));
  const close = () => { sheet.classList.remove('in'); setTimeout(() => sheet.remove(), 220); };
  sheet.querySelector('[data-close]').onclick = close;
  sheet.addEventListener('mousedown', (e) => { if (e.target === sheet) close(); });
  sheet.querySelectorAll('[data-qc]').forEach((b) => {
    b.onclick = () => { close(); setTimeout(() => captureForm(b.dataset.qc), 180); };
  });
}

const TAB_FOR = { idea: 'ideas', question: 'ideas', evidence: 'evidence', action: 'actions', log: 'notes' };

async function captureForm(kind) {
  const books = await S.Books.all();
  const today = S.todayStr();
  // 保存后回到这本书对应的 Tab，让记录立刻可见
  const done = (msg) => {
    UI.toast(msg);
    if (currentBookId && location.hash.startsWith('#/book')) {
      go(`#/book/${currentBookId}?tab=${TAB_FOR[kind] || 'notes'}`);
    } else { route(); }
  };
  if (kind === 'idea') {
    UI.formModal({
      title: '记录一个想法', subtitle: 'Idea · 想到就记，别整理',
      fields: await V.ideaFields(books),
      values: { date: today, bookId: currentBookIdMatch(books) },
      onSubmit: async (d) => {
        await S.Ideas.create({ ...d, tags: splitTags(d.tags) });
        done('想法已保存');
      },
    });
  } else if (kind === 'question') {
    UI.formModal({
      title: '记下疑问', subtitle: 'Question · 好问题比答案更值钱',
      fields: await V.ideaFields(books),
      values: { date: today, tags: '待解答', bookId: currentBookIdMatch(books) },
      onSubmit: async (d) => {
        await S.Ideas.create({ ...d, tags: ['待解答', ...splitTags(d.tags)] });
        done('疑问已保存');
      },
    });
  } else if (kind === 'evidence') {
    UI.formModal({
      title: '存一条引文 / 证据', subtitle: '请务必选对类型：作者主张 ≠ 事实',
      fields: await V.evidenceFields(books),
      values: { bookId: currentBookIdMatch(books), type: 'author_claim', confidence: 3 },
      onSubmit: async (d) => { await S.Evidence.create(d); done('证据已保存'); },
    });
  } else if (kind === 'action') {
    UI.formModal({
      title: '新增行动', subtitle: 'Action · 阅读不落到行动，就只是消遣',
      fields: V.actionFields,
      values: { status: 'todo' },
      onSubmit: async (d) => { await S.Actions.create({ ...d, sourceType: 'idea', sourceId: currentBookId || '' }); done('行动已创建'); },
    });
  } else {
    UI.formModal({
      title: '今日阅读记录', subtitle: 'Daily Log · 3 分钟就够',
      fields: await V.logFields(books),
      values: { date: today, bookId: currentBookIdMatch(books) },
      onSubmit: async (d) => { await S.Logs.create(d); done('已记录今天'); },
    });
  }
}

function currentBookIdMatch(books) {
  if (currentBookId && books.some((b) => b.id === currentBookId)) return currentBookId;
  return books[0]?.id || '';
}

const splitTags = (s) => String(s || '').split(/[；;，,]/).map((x) => x.trim()).filter(Boolean);

/* ---------------------- 事件委托 ---------------------- */
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  /* --- Quick Capture --- */
  if (act === 'qc') { e.preventDefault(); openQuickCapture(); return; }

  /* --- Books --- */
  if (act === 'new-book') {
    UI.formModal({
      title: '新增书籍', subtitle: 'Duplicate protection：同名同作者会被拦下',
      fields: await V.bookFields,
      values: { status: 'to_read', format: '纸质书', readingCount: 1, startDate: S.todayStr() },
      onSubmit: async (d) => {
        const dup = await S.Books.findDuplicate(d.title, d.author);
        if (dup) throw new Error(`已存在同名书籍：${dup.title}（${dup.id}）`);
        const b = await S.Books.create({
          ...d, topics: splitTags(d.topics),
          authors: splitTags(d.authors),
          author: splitTags(d.authors).length ? splitTags(d.authors).join('、') : d.author,
          coreIdeas: String(d.coreIdeas || '').split('\n').map((x) => x.trim()).filter(Boolean),
        });
        UI.toast(`已新增《${b.title}》`); go(`#/book/${b.id}`);
      },
    });
    return;
  }
  if (act === 'edit-book') {
    const b = await S.Books.get(el.dataset.id);
    UI.formModal({
      title: '编辑书籍', fields: await V.bookFields,
      values: { ...b, topics: (b.topics || []).join('；'), coreIdeas: (b.coreIdeas || []).join('\n') },
      onSubmit: async (d) => {
        await S.Books.update(b.id, {
          ...d, topics: splitTags(d.topics),
          authors: splitTags(d.authors),
          author: splitTags(d.authors).length ? splitTags(d.authors).join('、') : d.author,
          coreIdeas: String(d.coreIdeas || '').split('\n').map((x) => x.trim()).filter(Boolean),
        });
        UI.toast('已保存'); route();
      },
    });
    return;
  }
  if (act === 'del-book') {
    UI.confirmModal(`删除《${(await S.Books.get(el.dataset.id))?.title}》？相关日志与想法不会被删除。`, async () => {
      await S.Books.remove(el.dataset.id); UI.toast('已删除'); go('#/books');
    });
    return;
  }
  if (act === 'book-tab') {
    location.hash = `#/book/${currentBookId}?tab=${el.dataset.tab}`; return;
  }
  if (act === 'book-filter') { booksState.status = el.dataset.v; route(); return; }
  if (act === 'book-more') { e.preventDefault(); V.loadMoreBooks(); return; }

  /* --- Logs / Ideas / Evidence / Actions --- */
  if (act === 'new-log') {
    const books = await S.Books.all();
    if (!books.length) { UI.toast('先去 Books 添加一本书', 'warn'); return; }
    UI.formModal({
      title: '今日阅读记录', subtitle: 'Daily Log · 每天 3 分钟',
      fields: await V.logFields(books),
      values: { date: S.todayStr(), bookId: el.dataset.book || books[0].id },
      onSubmit: async (d) => { await S.Logs.create(d); UI.toast('已记录'); route(); },
    });
    return;
  }
  if (act === 'open-log') {
    const l = await db.get('logs', el.dataset.id);
    const books = await S.Books.all();
    UI.formModal({
      title: '编辑阅读记录', fields: await V.logFields(books), values: l,
      onSubmit: async (d) => { await S.Logs.update(l.id, d); UI.toast('已保存'); route(); },
    });
    return;
  }
  if (act === 'new-idea' || act === 'open-idea') {
    const id = el.dataset.id;
    const cur = id ? await db.get('ideas', id) : null;
    const books = await S.Books.all();
    UI.formModal({
      title: cur ? '编辑想法' : '新增想法',
      fields: await V.ideaFields(books),
      values: cur ? { ...cur, tags: (cur.tags || []).join('；') }
        : { date: S.todayStr(), bookId: el.dataset.book || '' },
      onSubmit: async (d) => {
        const payload = { ...d, tags: splitTags(d.tags) };
        cur ? await S.Ideas.update(cur.id, payload) : await S.Ideas.create(payload);
        UI.toast('已保存'); route();
      },
    });
    return;
  }
  if (act === 'new-evidence' || act === 'open-evidence') {
    const id = el.dataset.id;
    const cur = id ? await db.get('evidence', id) : null;
    const books = await S.Books.all();
    UI.formModal({
      title: cur ? '编辑证据' : '新增证据', subtitle: '作者主张 ≠ 事实',
      fields: await V.evidenceFields(books),
      values: cur || { bookId: el.dataset.book || '', type: 'author_claim', confidence: 3 },
      onSubmit: async (d) => {
        cur ? await S.Evidence.update(cur.id, d) : await S.Evidence.create(d);
        UI.toast('已保存'); route();
      },
    });
    return;
  }
  if (act === 'new-action' || act === 'open-action') {
    const id = el.dataset.id;
    const cur = id ? await db.get('actions', id) : null;
    UI.formModal({
      title: cur ? '编辑行动' : '新增行动',
      fields: V.actionFields,
      values: cur || { status: 'todo', sourceType: 'book', sourceId: el.dataset.book || '' },
      onSubmit: async (d) => {
        cur ? await S.Actions.update(cur.id, d) : await S.Actions.create(d);
        UI.toast('已保存'); route();
      },
    });
    return;
  }
  /* --- Evidence --- */
  if (act === 'ev-filter') { evidenceState.type = el.dataset.v; route(); return; }

  /* --- Connections --- */
  if (act === 'cn-filter') { connectionsState.rel = el.dataset.v; route(); return; }
  if (act === 'new-connection' || act === 'open-connection') {
    const id = el.dataset.id;
    const cur = id ? await S.Connections.get(id) : null;
    const fields = await V.connectionFields();
    const preset = cur ? {} : { fromId: el.dataset.book || '' };
    UI.formModal({
      title: cur ? '编辑连接' : '新建连接',
      subtitle: '两本书碰撞之后，你多知道了什么？',
      fields,
      values: cur || { relation: 'similar', ...preset },
      onSubmit: async (d) => {
        if (d.fromId === d.toId) throw new Error('起点和终点不能是同一个');
        cur ? await S.Connections.update(cur.id, d) : await S.Connections.create(d);
        UI.toast('连接已保存'); route();
      },
    });
    return;
  }

  /* --- Actions 闭环 --- */
  if (act === 'ac-filter') { actionsState.status = el.dataset.v; route(); return; }
  if (act === 'ac-toggle') {
    const a = await S.Actions.get(el.dataset.id);
    if (!a) return;
    if (a.status === 'done') { await S.Actions.setStatus(a.id, 'todo'); UI.toast('已回到待办'); route(); return; }
    UI.formModal({
      title: '完成这个行动', subtitle: 'Action Review · 说说实际发生了什么',
      fields: [
        { name: 'actualResult', label: '实际结果', type: 'textarea', required: true, rows: 3 },
        { name: 'review', label: '复盘', type: 'textarea', rows: 3, hint: '和预期不一样的地方，才是收获' },
      ],
      values: { actualResult: a.actualResult || '' },
      submitText: '标记完成',
      onSubmit: async (d) => {
        await S.Actions.complete(a.id, d.actualResult, d.review);
        UI.toast('行动已完成'); route();
      },
    });
    return;
  }
  if (act === 'ac-start') {
    const a = await S.Actions.get(el.dataset.id);
    if (!a) return;
    if (a.status === 'doing') {
      UI.formModal({
        title: '完成这个行动', subtitle: 'Action Review',
        fields: [
          { name: 'actualResult', label: '实际结果', type: 'textarea', required: true, rows: 3 },
          { name: 'review', label: '复盘', type: 'textarea', rows: 3 },
        ],
        values: { actualResult: a.actualResult || '' },
        submitText: '标记完成',
        onSubmit: async (d) => { await S.Actions.complete(a.id, d.actualResult, d.review); UI.toast('行动已完成'); route(); },
      });
    } else {
      await S.Actions.setStatus(a.id, 'doing'); UI.toast('已开始'); route();
    }
    return;
  }

  /* --- Decisions --- */
  if (act === 'new-decision' || act === 'open-decision') {
    const id = el.dataset.id;
    const cur = id ? await S.Decisions.get(id) : null;
    const [books, principles] = await Promise.all([S.Books.all(), S.Principles.all()]);
    UI.formModal({
      title: cur ? '编辑决策' : '记录一个决策',
      subtitle: 'Decision Journal · 决策当下写清楚，未来才有的复盘',
      fields: await V.decisionFields(books, principles),
      values: cur || { date: S.todayStr(), bookId: currentBookId || '' },
      onSubmit: async (d) => {
        cur ? await S.Decisions.update(cur.id, d) : await S.Decisions.create(d);
        UI.toast('已保存'); route();
      },
    });
    return;
  }

  /* --- Principles --- */
  if (act === 'pr-filter') { principlesState.show = el.dataset.v; route(); return; }
  if (act === 'new-principle' || act === 'open-principle') {
    const id = el.dataset.id;
    const cur = id ? await S.Principles.get(id) : null;
    const [books, ideas] = await Promise.all([S.Books.all(), S.Ideas.all()]);
    UI.formModal({
      title: cur ? '修改原则' : '新建原则',
      subtitle: '原则不是摘录 · 它需要经历应用与复审',
      fields: await V.principleFields(books, ideas),
      values: cur ? {
        ...cur,
        sourceBookIds: (cur.sourceBookIds || []).join('；'),
        sourceIdeaIds: (cur.sourceIdeaIds || []).join('；'),
      } : {},
      onSubmit: async (d) => {
        const payload = { ...d, sourceBookIds: splitTags(d.sourceBookIds), sourceIdeaIds: splitTags(d.sourceIdeaIds) };
        cur ? await S.Principles.update(cur.id, payload) : await S.Principles.create(payload);
        UI.toast('已保存'); route();
      },
    });
    return;
  }
  if (act === 'pr-review') {
    const p = await S.Principles.get(el.dataset.id);
    UI.formModal({
      title: '复审原则', subtitle: 'Review · 它还成立吗？',
      fields: [
        { name: 'stillValid', label: '是否仍然成立', type: 'select', options: [{ value: 'true', label: '仍然成立' }, { value: 'false', label: '需要修正' }] },
        { name: 'result', label: '最近的实际效果', type: 'textarea', rows: 3, hint: '它帮你做对了什么，或让你错过了什么？' },
      ],
      values: { stillValid: String(p.stillValid !== false), result: p.result || '' },
      submitText: '完成复审',
      onSubmit: async (d) => {
        await S.Principles.review(p.id, d.stillValid !== 'false', d.result);
        UI.toast(`已复审 · ${d.stillValid !== 'false' ? '仍然成立' : '需要修正'}`); route();
      },
    });
    return;
  }
  if (act === 'pr-archive') {
    await S.Principles.archive(el.dataset.id); UI.toast('已归档'); route(); return;
  }
  if (act === 'pr-restore') {
    await S.Principles.activate(el.dataset.id); UI.toast('已恢复'); route(); return;
  }
  if (act === 'del-principle') {
    UI.confirmModal('删除这条原则？', async () => {
      await S.Principles.remove(el.dataset.id); UI.toast('已删除'); route();
    });
    return;
  }

  /* --- Reviews --- */
  if (act === 'rv-period') {
    reviewsState.period = el.dataset.v; reviewsState.key = '';
    go(`#/reviews?period=${el.dataset.v}`); return;
  }
  if (act === 'rv-save') {
    const data = await S.buildReview(reviewsState.period, reviewsState.key || S.periodKeyOf(reviewsState.period));
    const notesEl = app.querySelector('[data-act="rv-notes"]');
    data.notes = notesEl ? notesEl.value : (reviewsState.notesDraft || '');
    const exist = await S.Reviews.findByKey(reviewsState.period, reviewsState.key || S.periodKeyOf(reviewsState.period));
    if (exist) await S.Reviews.update(exist.id, { content: data });
    else await S.Reviews.create({ period: reviewsState.period, periodKey: reviewsState.key || S.periodKeyOf(reviewsState.period), content: data });
    UI.toast('复盘已保存'); route();
    return;
  }
  if (act === 'rv-del') {
    UI.confirmModal('删除这份复盘？', async () => {
      await S.Reviews.remove(el.dataset.id); UI.toast('已删除'); route();
    });
    return;
  }
  if (act === 'more') { e.preventDefault(); openMoreSheet(); return; }

  /* --- Evolution（Phase 5） --- */
  if (act === 'evo-track') { evolutionState.track = el.dataset.id; route(); return; }

  /* --- Search 模式切换（Phase 6） --- */
  if (act === 'search-mode') { searchState.mode = el.dataset.v; route(); return; }

  /* --- AI 助手（Phase 6） --- */
  if (act === 'ai-send') {
    const inp = document.getElementById('rwc-ai-q');
    if (inp) V.runAskLibrary(inp.value);
    return;
  }
  if (act === 'ai-analyze') {
    const sel = document.getElementById('rwc-ai-book');
    if (sel) V.runAnalyzeBook(sel.value);
    return;
  }
  if (act === 'ai-save-idea' || act === 'ai-save-question' || act === 'ai-save-action' || act === 'ai-save-note') {
    const content = el.dataset.content;
    const bookId = el.dataset.book || '';
    const kind = el.dataset.act.replace('ai-save-', '');
    try {
      if (kind === 'idea') await S.Ideas.create({ bookId, idea: content, aiGenerated: true, date: S.todayStr(), tags: ['AI'] });
      else if (kind === 'question') await S.Ideas.create({ bookId, idea: content, aiGenerated: true, date: S.todayStr(), tags: ['待解答', 'AI'] });
      else if (kind === 'note') await S.Ideas.create({ bookId, idea: content, aiGenerated: true, date: S.todayStr(), tags: ['待验证', 'AI'] });
      else if (kind === 'action') await S.Actions.create({ sourceType: 'book', sourceId: bookId, action: content, aiGenerated: true, status: 'todo' });
      UI.toast('已保存为 AI 草稿（请人工复核）'); route();
    } catch (err) { UI.toast(err.message || '保存失败', 'warn'); }
    return;
  }

  /* --- AI 配置 / 云端同步 --- */
  if (act === 'ai-config-save') {
    const cfg = {
      enabled: document.getElementById('ai-enabled')?.value === 'true',
      endpoint: document.getElementById('ai-endpoint')?.value?.trim() || 'https://api.openai.com/v1',
      model: document.getElementById('ai-model')?.value?.trim() || 'gpt-4o-mini',
      embeddingModel: document.getElementById('ai-embed')?.value?.trim() || 'text-embedding-3-small',
      apiKey: document.getElementById('ai-key')?.value?.trim() || '',
    };
    const { saveAIConfig } = await import('./ai.js');
    saveAIConfig(cfg);
    UI.toast(cfg.enabled && cfg.apiKey ? 'AI 配置已保存并启用' : 'AI 配置已保存（未启用）'); route();
    return;
  }
  if (act === 'sync-save' || act === 'sync-now') {
    const cfg = {
      enabled: document.getElementById('sync-enabled')?.value === 'true',
      endpoint: document.getElementById('sync-endpoint')?.value?.trim() || '',
      anonKey: document.getElementById('sync-key')?.value?.trim() || '',
      bucket: document.getElementById('sync-bucket')?.value?.trim() || 'rwc-os-backups',
    };
    const { saveSyncConfig, pushBackup, syncEnabled: se } = await import('./sync.js');
    saveSyncConfig(cfg);
    if (act === 'sync-now') {
      if (!se()) { UI.toast('请先填好端点与 Anon Key 并启用', 'warn'); }
      else {
        try { const path = await pushBackup(await S.Backup.dump());
          UI.toast('已备份到云端：' + path); } catch (err) { UI.toast(err.message || '同步失败', 'warn'); }
      }
    } else UI.toast('同步配置已保存');
    route();
    return;
  }

  /* --- 备份 --- */
  if (act === 'export-json') { await exportJSON(); UI.toast('JSON 备份已下载'); route(); return; }
  if (act === 'export-excel') { await exportExcel(); UI.toast('Excel 已导出'); return; }
  if (act === 'import-json') return pickFile('.json', async (f) => {
    await importJSON(f, true); UI.toast('JSON 已导入（合并）'); route();
  });
  if (act === 'import-excel') return pickFile('.xlsx,.xls', async (f) => {
    const pm = UI.progressModal('正在导入（自动备份可回滚）');
    try {
      const r = await importExcel(f, (d, t) => pm.update(d, t));
      pm.close();
      const bk = r.books || {};
      UI.resultModal('导入完成', [
        { k: '新增', v: bk.added || 0 },
        { k: '更新', v: bk.updated || 0 },
        { k: '跳过（缺书名）', v: bk.skipped || 0 },
        { k: '标记需复核', v: bk.needsReview || 0 },
      ]);
      route();
    } catch (e) { pm.close(); UI.toast(e.message || '导入失败', 'warn'); }
  });
  if (act === 'download-template') { exportTemplate(); UI.toast('导入模板已下载'); return; }
  if (act === 'rollback-import') {
    UI.confirmModal('回滚到上次导入前的状态？这会撤销该次导入新增/修改的数据（之后手动录入的不受影响，但同次会话的变更会被还原）。', async () => {
      try { const at = await S.Backup.rollbackLastImport(); UI.toast(`已回滚（快照 ${at.slice(0, 19).replace('T', ' ')}）`); route(); }
      catch (e) { UI.toast(e.message || '回滚失败', 'warn'); }
    });
    return;
  }
  if (act === 'wipe') {
    UI.confirmModal('清空全部数据？建议先导出 JSON 备份。', async () => {
      await S.Backup.wipe(); UI.toast('已清空'); go('#/dashboard');
    });
    return;
  }
  if (act === 'logout') {
    localStorage.removeItem('rwc_auth');
    location.reload();
    return;
  }
  if (act === 'demo-data') {
    document.querySelectorAll('.rwc-overlay').forEach((o) => {
      o.classList.remove('in'); setTimeout(() => o.remove(), 220);
    });
    await loadDemoData();
    UI.toast('演示数据已载入');
    route();
    return;
  }

  /* --- Graph（Phase 3） --- */
  if (act === 'graph-filter-rel') { graphState.rel = el.dataset.v; route(); return; }
  if (act === 'graph-filter-type') { graphState.type = el.dataset.v; route(); return; }
  if (act === 'graph-clear-focus') { route(); return; }
  if (act === 'graph-open-book') { location.hash = '#/book/' + el.dataset.id; return; }
  if (act === 'graph-open-idea') { location.hash = '#/ideas'; UI.toast('已跳到 Ideas，可点开该条'); return; }
  if (act === 'graph-open-evidence') { location.hash = '#/evidence'; UI.toast('已跳到 Evidence，可点开该条'); return; }
});

/* 输入类（防抖） */
let t1;
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.act === 'book-search') {
    clearTimeout(t1);
    t1 = setTimeout(() => { booksState.q = el.value; route(); }, 320);
  }
  if (el.dataset.act === 'graph-search') {
    clearTimeout(t1);
    t1 = setTimeout(() => { graphState.q = el.value; route(); }, 320);
  }
  if (el.dataset.act === 'global-search') {
    clearTimeout(t1);
    t1 = setTimeout(() => { searchState.q = el.value; route(); }, 320);
  }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.act === 'book-sort') { booksState.sort = el.value; route(); }
  if (el.dataset.act === 'rv-key') { reviewsState.key = el.value; route(); }
  // 复盘笔记随写随存（已保存的复盘才会自动写入）
  if (el.dataset.act === 'rv-notes') {
    reviewsState.notesDraft = el.value;
    (async () => {
      const key = reviewsState.key || S.periodKeyOf(reviewsState.period);
      const exist = await S.Reviews.findByKey(reviewsState.period, key);
      if (exist) {
        await S.Reviews.update(exist.id, { content: { ...exist.content, notes: el.value } });
        UI.toast('笔记已自动保存');
      }
    })();
  }
});

/* Enter 发送 AI 提问（Ask My Library） */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target && e.target.id === 'rwc-ai-q') {
    e.preventDefault();
    V.runAskLibrary(e.target.value);
  }
});

function pickFile(accept, cb) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept;
  inp.onchange = () => { if (inp.files[0]) cb(inp.files[0]); };
  inp.click();
}

const go = (h) => { location.hash = h; };
window.addEventListener('hashchange', route);

/* ---------------------- 登录门禁 ---------------------- */
const AUTH_KEY = 'rwc_auth';
const AUTH_USER_SHA = 'd616e691ff6458623a137a77a521f2ec8877073ef9755ecc71efbccf19a4f476';
const AUTH_PASS_SHA = 'd616e691ff6458623a137a77a521f2ec8877073ef9755ecc71efbccf19a4f476';

async function sha256hex(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function ensureAuth() {
  if (localStorage.getItem(AUTH_KEY) === 'ok') return Promise.resolve(true);
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = 'rwc-login';
    ov.innerHTML = `<div class="rwc-login-card">
      <img class="rwc-login-logo" src="./img/logo-rwc.png" alt="Reads with Colin">
      <h2>READS WITH COLIN OS</h2>
      <p class="rwc-login-sub">READING TO CHANGE YOURSELF</p>
      <label>账号<input id="lg-user" autocomplete="username" placeholder=""></label>
      <label>密码<input id="lg-pass" type="password" autocomplete="current-password" placeholder=""></label>
      <p class="rwc-login-err" hidden>账号或密码不正确</p>
      <button class="rwc-btn primary" id="lg-go">进入</button>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('in'));
    const err = ov.querySelector('.rwc-login-err');
    async function tryLogin() {
      const u = ov.querySelector('#lg-user').value.trim();
      const p = ov.querySelector('#lg-pass').value;
      if (!crypto.subtle) { err.textContent = '浏览器过旧，请用现代浏览器打开'; err.hidden = false; return; }
      if ((await sha256hex(u)) === AUTH_USER_SHA && (await sha256hex(p)) === AUTH_PASS_SHA) {
        localStorage.setItem(AUTH_KEY, 'ok');
        ov.classList.remove('in'); setTimeout(() => { ov.remove(); resolve(true); }, 220);
      } else {
        err.hidden = false;
        ov.querySelector('#lg-pass').value = '';
      }
    }
    ov.querySelector('#lg-go').onclick = tryLogin;
    ov.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
    setTimeout(() => ov.querySelector('#lg-user').focus(), 250);
  });
}

/* ---------------------- 启动 ---------------------- */
async function boot() {
  const authed = await ensureAuth();
  if (!authed) return;
  renderNav();
  await seedIfEmpty(async () => {
    const ov = document.createElement('div');
    ov.className = 'rwc-overlay';
    ov.innerHTML = `<div class="rwc-modal sm">
      <header><div><h3>欢迎使用 READS WITH COLIN OS</h3>
        <p>READING TO CHANGE YOURSELF</p></div></header>
      <div class="rwc-welcome">
        <p>这不是读书笔记，而是：<b>书 → 思想 → 证据 → 连接 → 行动 → 决策 → 原则</b> 的系统。</p>
        <p>数据保存在本设备浏览器（IndexedDB），离线可用。建议定期在 Settings 导出 JSON 备份。</p>
      </div>
      <footer class="col">
        <button class="rwc-btn primary" data-act="demo-data">载入演示数据看看结构</button>
        <button class="rwc-btn" data-w="close">直接开始（先加一本书）</button>
      </footer></div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('in'));
    ov.querySelector('[data-w="close"]').onclick = () => {
      ov.classList.remove('in'); setTimeout(() => ov.remove(), 220); go('#/books');
    };
  });
  if (!location.hash) history.replaceState(null, '', '#/dashboard');
  await route();   // 按当前 hash 渲染（刷新后仍停留在原来的书 / Tab）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
boot();
