/* Reads with Colin — Archive 页面交互
 * 数据：3 篇真实文章 + 24 条 stub（来自 readswithravi.beehiiv.com 真实推荐书单）
 * 功能：JS 渲染、搜索（中英任一命中）、分页（≥5 页显示省略号）、双语同步
 */
(function () {
  'use strict';

  // ===== 数据（按日期降序）=====
  var POSTS = [
    // ====== 真实文章（3 篇） ======
    {
      url: 'posts/atomic-habits.html',
      date: 'Aug 27, 2026', mins: 5,
      en: 'Atomic Habits, identity change and the quiet power of 1%',
      zh: '《原子习惯》，身份认同与 1% 的复利',
      subEn: 'Why the smallest choices, repeated daily, end up changing who you are.',
      subZh: '最小的选择日复一日，最终会改变你是谁。'
    },
    {
      url: 'posts/thinking-fast-and-slow.html',
      date: 'Aug 20, 2026', mins: 6,
      en: 'Thinking, Fast and Slow, three kinds of attachments and discipline',
      zh: '《思考，快与慢》，三种依附与纪律',
      subEn: 'Two systems in the mind, and where most mistakes quietly come from.',
      subZh: '大脑中的两套系统，大多数错误悄悄发生的地方。'
    },
    {
      url: 'posts/walden.html',
      date: 'Aug 13, 2026', mins: 7,
      en: 'Walden, on the art of living deliberately',
      zh: '《瓦尔登湖》，论从容地活',
      subEn: 'A 19th-century experiment in simplifying life — and what it still teaches us.',
      subZh: '一场 19 世纪的极简实验，至今仍在教我们。'
    },

    // ====== Stub（24 条，来自 readswithravi.beehiiv.com 真实书单） ======
    {
      url: '#', date: 'Aug 06, 2026', mins: 4,
      en: 'Indistractable, focus on the now and paradise',
      zh: '《不可干扰》，专注当下与心流',
      subEn: 'You are not addicted to your phone — you are bored. The fix is not willpower.',
      subZh: '你不是对手机上瘾——你是无聊。解药不是意志力。'
    },
    {
      url: '#', date: 'Jul 30, 2026', mins: 4,
      en: 'What You\'re Made For, fighting chaos and taking risk',
      zh: '《你为谁而生》，对抗混乱与拥抱风险',
      subEn: 'A field manual for finding the work only you can do.',
      subZh: '一本只属于你的工作定位指南。'
    },
    {
      url: '#', date: 'Jul 23, 2026', mins: 5,
      en: 'Becoming Yourself, finding your unique knowledge',
      zh: '成为你自己，发掘你独有的知识',
      subEn: 'The journey from copying others to letting your own voice lead.',
      subZh: '从模仿他人到让内心的声音领航。'
    },
    {
      url: '#', date: 'Jul 16, 2026', mins: 3,
      en: 'Good Energy, patience and doing nothing meditation',
      zh: '《好能量》，耐心与什么都不做的冥想',
      subEn: 'Calm is not laziness — it is the soil from which good work grows.',
      subZh: '平静不是懒惰——它是好工作生长的土壤。'
    },
    {
      url: '#', date: 'Jul 09, 2026', mins: 3,
      en: 'How to Try Again, on our own and fairy tales',
      zh: '《如何再来一次》，独自上路与童话',
      subEn: 'Restarting is not failure — it is the most underrated skill of the decade.',
      subZh: '重启不是失败——它是这个十年最被低估的能力。'
    },
    {
      url: '#', date: 'Jul 02, 2026', mins: 3,
      en: 'Deep Work, on being truly ambitious',
      zh: '《深度工作》，论真正的雄心',
      subEn: 'The ability to focus without distraction is the new superpower.',
      subZh: '专注不分心的能力，是新的超能力。'
    },
    {
      url: '#', date: 'Jun 25, 2026', mins: 4,
      en: 'The Courage to Commit, learning something new',
      zh: '《承诺的勇气》，学习新事物',
      subEn: 'Commitment is not a cage — it is the architecture of a meaningful life.',
      subZh: '承诺不是牢笼——它是有意义生活的架构。'
    },
    {
      url: '#', date: 'Jun 18, 2026', mins: 3,
      en: 'Scarcity Brain, nonjudgemental curiosity',
      zh: '《稀缺心态》，不带评判的好奇',
      subEn: 'Why a full calendar feels like a successful life — and why it usually is not.',
      subZh: '为什么满日历看起来像成功生活——但往往不是。'
    },
    {
      url: '#', date: 'Jun 11, 2026', mins: 3,
      en: 'Master of Change, building character through adversity',
      zh: '《变化的主人》，借逆境铸造性格',
      subEn: 'Resilience is not a trait you are born with — it is a muscle you train.',
      subZh: '韧性不是天生的特质——它是训练出来的肌肉。'
    },
    {
      url: '#', date: 'Jun 04, 2026', mins: 3,
      en: 'Hidden Potential, achieving greatness',
      zh: '《隐藏的潜能》，通向卓越',
      subEn: 'Talent is overrated. The systems around it are everything.',
      subZh: '天赋被高估了。它周围的系统才是一切。'
    },
    {
      url: '#', date: 'May 28, 2026', mins: 3,
      en: 'Runnin\' Down a Dream, the power of experiments',
      zh: '实验的力量，小步快跑',
      subEn: 'How the small, curious experiments compound into a life you actually wanted.',
      subZh: '微小的好奇实验如何复利成你想要的生活。'
    },
    {
      url: '#', date: 'May 21, 2026', mins: 3,
      en: 'How To Not Know, the loop of wisdom',
      zh: '《如何承认不知道》，智慧的回路',
      subEn: 'Wisdom is not what you know — it is knowing where your knowing ends.',
      subZh: '智慧不是你知道什么——而是知道你的知道在哪里止步。'
    },
    {
      url: '#', date: 'May 14, 2026', mins: 4,
      en: 'Same As Ever, learning is vital',
      zh: '《一如既往》，学习至关重要',
      subEn: 'What is timeless about human nature — and what is just noise.',
      subZh: '人性的哪些部分是不变的，哪些只是噪声。'
    },
    {
      url: '#', date: 'May 07, 2026', mins: 3,
      en: 'The Mental Strength Playbook, uncertainty tolerance',
      zh: '《心理韧性手册》，容忍不确定',
      subEn: 'A practical field guide for the days the world feels unmoored.',
      subZh: '世界显得失重时，一本实用的实战指南。'
    },
    {
      url: '#', date: 'Apr 30, 2026', mins: 3,
      en: 'Clear Thinking, solving problems',
      zh: '《清晰思考》，解决问题',
      subEn: 'The first step to better arguments is admitting the bad ones you keep winning.',
      subZh: '更好的论证始于承认：你总赢的那些其实是错的。'
    },
    {
      url: '#', date: 'Apr 23, 2026', mins: 3,
      en: 'Slow Productivity, learn to be silent',
      zh: '《慢生产力》，学会沉默',
      subEn: 'A counter-argument to hustle culture, grounded in research and quiet practice.',
      subZh: '对忙碌文化的有力反驳，扎根于研究与安静的练习。'
    },
    {
      url: '#', date: 'Apr 16, 2026', mins: 3,
      en: 'Beyond Belief, doing hard things',
      zh: '《超越信念》，做难事',
      subEn: 'When you cannot control outcomes, the only thing left is the kind of person you become.',
      subZh: '当你无法掌控结果，剩下唯一能做的就是成为什么样的人。'
    },
    {
      url: '#', date: 'Apr 09, 2026', mins: 8,
      en: 'Discipline is Destiny, breadth vs depth',
      zh: '《纪律即命运》，博与深',
      subEn: 'Self-command is the engine of every other virtue you want to build.',
      subZh: '自律是你想建立的一切美德的发动机。'
    },
    {
      url: '#', date: 'Apr 02, 2026', mins: 8,
      en: 'How to Make Your Brain Your Best Friend',
      zh: '《如何与大脑成为朋友》',
      subEn: 'Small wins and routine — the underrated architecture of every quiet life.',
      subZh: '小赢与日常——每个宁静生活的隐性架构。'
    },
    {
      url: '#', date: 'Mar 26, 2026', mins: 7,
      en: 'Meditations for Mortals, training your mind',
      zh: '《凡人的冥想》，训练你的心',
      subEn: 'A week-by-week guide to thinking more clearly without becoming insufferable.',
      subZh: '一周一练的指南，让思维更清晰却不必变得讨厌。'
    },
    {
      url: '#', date: 'Mar 19, 2026', mins: 7,
      en: 'The Let Them Theory, non-competition',
      zh: '《让他们去吧》，非竞争',
      subEn: 'Some people will leave your life; the rest is yours to design.',
      subZh: '有些人会离开你的生活；剩下的是你该设计的。'
    }
  ];

  var PER_PAGE = 9;
  var page = 1;
  var q = '';

  // 渲染卡片
  function cardHTML(p) {
    return [
      '<a class="archive-card" href="', p.url, '">',
        '<div class="archive-card-meta">',
          p.date,
          '<span class="dot">•</span>',
          p.mins, ' min read',
        '</div>',
        '<h3>',
          '<span lang="en">', escape(p.en), '</span>',
          '<span lang="zh">', escape(p.zh), '</span>',
        '</h3>',
        '<p class="archive-card-teaser">',
          '<span lang="en">', escape(p.subEn), '</span>',
          '<span lang="zh">', escape(p.subZh), '</span>',
        '</p>',
        '<div class="archive-card-author">Colin</div>',
      '</a>'
    ].join('');
  }

  // 简单 HTML 转义
  function escape(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // 过滤
  function list() {
    if (!q) return POSTS;
    var k = q.toLowerCase();
    return POSTS.filter(function (p) {
      return p.en.toLowerCase().indexOf(k) >= 0
          || p.zh.toLowerCase().indexOf(k) >= 0;
    });
  }

  // 渲染网格
  function renderGrid() {
    var items = list();
    var totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
    if (page > totalPages) page = totalPages;
    var start = (page - 1) * PER_PAGE;
    var slice = items.slice(start, start + PER_PAGE);

    var grid = document.getElementById('archiveGrid');
    var empty = document.getElementById('archiveEmpty');
    if (slice.length === 0) {
      grid.innerHTML = '';
      empty.hidden = false;
    } else {
      grid.innerHTML = slice.map(cardHTML).join('');
      empty.hidden = true;
    }

    // 计数
    var isEn = document.documentElement.lang === 'en';
    var count = document.getElementById('archiveCount');
    if (q) {
      var matchWord = isEn ? (items.length === 1 ? 'match' : 'matches') : '个匹配';
      count.innerHTML = isEn
        ? '<b>' + items.length + '</b> ' + matchWord + ' for "' + escape(q) + '"'
        : '匹配"<b>' + escape(q) + '</b>" · <b>' + items.length + '</b> ' + matchWord;
    } else {
      count.innerHTML = isEn
        ? 'Showing <b>' + slice.length + '</b> of <b>' + items.length + '</b> letters'
        : '共 <b>' + items.length + '</b> 篇 · 当前显示 <b>' + slice.length + '</b>';
    }

    renderPager(totalPages);
  }

  // 分页（≥5 页时显示首尾省略号）
  function renderPager(totalPages) {
    var pager = document.getElementById('pagination');
    pager.innerHTML = '';
    if (totalPages <= 1) return;

    var pages = [];
    if (totalPages <= 5) {
      for (var i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      var from = Math.max(2, page - 1);
      var to = Math.min(totalPages - 1, page + 1);
      if (from > 2) pages.push('…');
      for (var j = from; j <= to; j++) pages.push(j);
      if (to < totalPages - 1) pages.push('…');
      pages.push(totalPages);
    }

    pages.forEach(function (n) {
      if (n === '…') {
        var span = document.createElement('span');
        span.className = 'page-ellipsis';
        span.textContent = '…';
        pager.appendChild(span);
      } else {
        var btn = document.createElement('button');
        btn.className = 'page-btn' + (n === page ? ' active' : '');
        btn.dataset.page = String(n);
        btn.textContent = n;
        btn.setAttribute('aria-label', 'Page ' + n);
        pager.appendChild(btn);
      }
    });
  }

  // ===== 同步 placeholder / 空态文案 =====
  function syncLang() {
    var isEn = document.documentElement.lang === 'en';
    var input = document.getElementById('archiveSearch');
    input.placeholder = isEn ? 'Search by title…' : '按标题搜索…';
    var empty = document.getElementById('archiveEmpty');
    empty.textContent = isEn ? 'No letters match your search.' : '没有找到匹配的文章。';
    renderGrid();
  }

  // ===== 初始化 =====
  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('archiveSearch');
    input.addEventListener('input', function (e) {
      q = e.target.value.trim();
      page = 1;
      renderGrid();
    });

    document.getElementById('pagination').addEventListener('click', function (e) {
      var btn = e.target.closest('.page-btn');
      if (!btn) return;
      page = parseInt(btn.dataset.page, 10) || 1;
      renderGrid();
      // 滚回工具栏
      document.querySelector('.archive-toolbar').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // 监听语言切换（main.js 改 documentElement.lang）
    new MutationObserver(syncLang).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });

    syncLang();
  });
})();