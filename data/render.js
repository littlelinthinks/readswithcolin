/**
 * Reads with Colin · 数据驱动渲染器 v1.0
 * 从 data/posts.json + data/categories.json 读取并渲染 archive / categories / index
 */
(function () {
  'use strict';

  const today = () => new Date().toISOString().slice(0, 10);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getSearchText(p) {
    return [p.titleEn, p.titleZh, p.authorEn, p.authorZh, p.teaserEn, p.teaserZh, p.categoryLabel].join(' ').toLowerCase();
  }

  function coverOf(p) {
    // 优先使用 posts.json 里的真实封面（jpg/png/webp）；否则回退占位 svg
    if (p.cover && p.cover.indexOf('.svg') === -1) return p.cover;
    return 'img/covers/' + esc(p.slug) + '.svg';
  }

  function cardHTML(p) {
    return `
    <article class="card t-${esc(p.category)}" data-cat="${esc(p.category)}" data-text="${esc(getSearchText(p))}">
      <div class="card-cover"><img class="jkt" src="${coverOf(p)}" alt="${esc(p.titleEn)}"></div>
      <div class="card-body">
        <div class="card-meta">
          <span class="read-badge">RWC #${String(p.rwcNumber).padStart(3, '0')}</span>
          <span lang="en">${esc(p.categoryLabel)}</span>
          <span lang="zh">${esc(p.categoryLabelZh)}</span>
        </div>
        <h3 class="card-title">
          <a href="posts/${esc(p.slug)}.html">
            <span lang="zh">${esc(p.titleZh)}</span>
            <span lang="en">${esc(p.titleEn)}</span>
          </a>
        </h3>
        <p class="card-author">
          <span lang="en">${esc(p.authorEn)}</span>
          <span lang="zh">${esc(p.authorZh)}</span>
        </p>
        <p class="card-teaser">
          <span lang="en">${esc(p.teaserEn)}</span>
          <span lang="zh">${esc(p.teaserZh)}</span>
        </p>
        <div class="card-foot">
          <span>
            <span lang="en">${p.readMin} min read</span>
            <span lang="zh">读后笔记 · ${p.readMin} 分钟</span>
          </span>
        </div>
      </div>
    </article>`;
  }

  async function loadData() {
    const [postsRes, catsRes] = await Promise.all([
      fetch('data/posts.json?t=' + Date.now()),
      fetch('data/categories.json?t=' + Date.now())
    ]);
    const postsData = await postsRes.json();
    const catsData = await catsRes.json();
    return { posts: postsData.items || [], categories: catsData.categories || [] };
  }

  /* ========== archive.html ========== */
  async function initArchive() {
    const grid = document.querySelector('.feed .grid');
    const countEl = document.querySelector('.toolbar .count b');
    const searchInput = document.getElementById('search');
    const filterBtns = document.querySelectorAll('.toolbar .filter button');
    if (!grid) return;

    const { posts } = await loadData();
    const sorted = posts.slice().sort((a, b) => b.rwcNumber - a.rwcNumber);

    function render(list) {
      grid.innerHTML = list.map(cardHTML).join('') || '<p style="grid-column:1/-1;text-align:center;color:var(--muted)">No books found.</p>';
      if (countEl) countEl.textContent = list.length;
      bindLang();
    }

    function applyFilter() {
      const cat = document.querySelector('.toolbar .filter button.active')?.dataset.cat || 'all';
      const q = (searchInput?.value || '').toLowerCase().trim();
      let list = sorted;
      if (cat !== 'all') list = list.filter(p => p.category === cat);
      if (q) list = list.filter(p => getSearchText(p).includes(q));
      render(list);
    }

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFilter();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', applyFilter);
    }

    render(sorted);
    document.querySelectorAll('.js-count').forEach(el => el.textContent = sorted.length);
  }

  function categoriesCardHTML(p) {
    return `
    <article class="card t-${esc(p.category)}">
      <div class="card-cover"><img class="jkt" src="${coverOf(p)}" alt="${esc(p.titleEn)}"></div>
      <div class="card-body">
        <div class="card-meta"><span class="ctag ct-${esc(p.category)}"><span lang="en">${esc(p.categoryLabel)}</span><span lang="zh">${esc(p.categoryLabelZh)}</span></span></div>
        <h3 class="card-title"><a href="posts/${esc(p.slug)}.html"><span lang="zh">《${esc(p.titleZh)}》</span><span lang="en">${esc(p.titleEn)}</span></a></h3>
        <p class="card-author"><span lang="en">${esc(p.authorEn)}</span><span lang="zh">${esc(p.authorZh)}</span></p>
        <p class="card-teaser"><span lang="en">${esc(p.teaserEn)}</span><span lang="zh">${esc(p.teaserZh)}</span></p>
      </div>
    </article>`;
  }

  async function initCategories() {
    const container = document.querySelector('.sections');
    if (!container) return;
    const { posts, categories } = await loadData();

    categories.forEach(cat => {
      const section = container.querySelector(`#${cat.slug}.section`);
      if (!section) return;
      const grid = section.querySelector('.grid');
      if (!grid) return;
      const list = posts.filter(p => p.category === cat.slug).sort((a, b) => b.rwcNumber - a.rwcNumber);
      grid.innerHTML = list.map(categoriesCardHTML).join('') || '<p style="color:var(--muted)">暂无书评。</p>';

      // update count chip
      const countEl = section.querySelector('.count');
      if (countEl) countEl.textContent = list.length;

      // update top chip count
      const chipN = document.querySelector(`.chip[href="#${cat.slug}"] .chip-n`);
      if (chipN) chipN.textContent = list.length;
    });
    bindLang();
  }

  function indexCardHTML(p) {
    return `
    <article class="card">
      <div class="card-cover"><img class="jkt" src="${coverOf(p)}" alt="${esc(p.titleEn)}"></div>
      <div class="card-body">
        <div class="card-meta"><span lang="en">${esc(p.categoryLabel)}</span><span lang="zh">${esc(p.categoryLabelZh)}</span></div>
        <h3 class="card-title"><a href="posts/${esc(p.slug)}.html"><span lang="en">${esc(p.titleEn)}</span><span lang="zh">《${esc(p.titleZh)}》</span></a></h3>
        <p class="card-teaser"><span lang="en">${esc(p.teaserEn)}</span><span lang="zh">${esc(p.teaserZh)}</span></p>
        <div class="card-foot"><span><span lang="en">${esc(p.authorEn)}</span><span lang="zh">${esc(p.authorZh)}</span></span></div>
      </div>
    </article>`;
  }

  /* ========== index.html ========== */
  async function initIndex() {
    const { posts } = await loadData();
    const sorted = posts.slice().sort((a, b) => b.rwcNumber - a.rwcNumber);

    // Featured: 标记 featured 或最新
    const featured = sorted.find(p => p.featured) || sorted[0];
    const featuredLink = document.getElementById('featuredLink');
    if (featuredLink && featured) {
      featuredLink.href = `posts/${featured.slug}.html`;
      const cover = document.getElementById('featuredCover');
      if (cover) cover.setAttribute('src', coverOf(featured));
      const meta = document.getElementById('featuredMeta');
      if (meta) {
        meta.innerHTML = `<span class="cat"><span lang="en">${esc(featured.categoryLabel)}</span><span lang="zh">${esc(featured.categoryLabelZh)}</span></span><span lang="en"> · ${featured.readMin} min read</span><span lang="zh"> · ${featured.readMin} 分钟</span>`;
      }
      const title = document.getElementById('featuredTitle');
      if (title) title.innerHTML = `<span lang="en">${esc(featured.titleEn)} — ${esc(featured.teaserEn.slice(0, 60))}${featured.teaserEn.length > 60 ? '…' : ''}</span><span lang="zh">《${esc(featured.titleZh)}》：${esc(featured.teaserZh.slice(0, 40))}${featured.teaserZh.length > 40 ? '…' : ''}</span>`;
      const teaser = document.getElementById('featuredTeaser');
      if (teaser) teaser.innerHTML = `<span lang="en">${esc(featured.introEn)}</span><span lang="zh">${esc(featured.introZh)}</span>`;
      const quote = document.getElementById('featuredQuote');
      if (quote) quote.innerHTML = `<span lang="en">${esc(featured.quote.textEn)}</span><span lang="zh">${esc(featured.quote.textZh)}</span>`;
      const author = document.getElementById('featuredAuthor');
      if (author) author.innerHTML = `<span lang="en">${esc(featured.authorEn)}</span><span lang="zh">${esc(featured.authorZh)}</span>`;
    }

    // 精选卡：最近的 5 本（不含 featured）
    const picks = sorted.filter(p => p.slug !== featured.slug).slice(0, 5);
    const grid = document.querySelector('.feed .grid');
    const viewall = document.querySelector('.feed .grid .card.viewall');
    if (grid) {
      const picksHTML = picks.map(indexCardHTML).join('');
      if (viewall) {
        viewall.insertAdjacentHTML('beforebegin', picksHTML);
      } else {
        grid.innerHTML = picksHTML;
      }
    }

    // 书墙：最近的 6 本（真实书封）
    const wall = document.querySelector('.wall');
    if (wall) {
      wall.innerHTML = sorted.slice(0, 6).map(p => `
        <a class="wall-book" href="posts/${esc(p.slug)}.html" title="${esc(p.titleEn)} / ${esc(p.titleZh)}">
          <img class="jkt-wall" src="${coverOf(p)}" alt="${esc(p.titleEn)}">
        </a>
      `).join('');
    }

    // 更新所有 35 计数占位符
    document.querySelectorAll('.js-count').forEach(el => el.textContent = sorted.length);

    bindLang();
  }

  function bindLang() {
    // 配合现有 js/main.js 的语言切换
    const html = document.documentElement;
    const current = html.getAttribute('lang') || 'en';
    // 触发一次显示/隐藏
    html.setAttribute('lang', current === 'zh' ? 'en' : 'zh');
    setTimeout(() => html.setAttribute('lang', current), 0);
  }

  function boot() {
    const path = location.pathname.split('/').pop() || 'index.html';
    if (path === 'archive.html') {
      initArchive();
    } else if (path === 'categories.html') {
      initCategories();
    } else if (path === 'index.html') {
      initIndex();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
