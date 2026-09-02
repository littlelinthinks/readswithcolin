/* Reads with Colin — Archive 页面交互
 * 数据：3 篇真实文章 + 21 条 stub
 * 功能：JS 渲染、搜索、点赞（localStorage）、分页、双语同步
 */
(function () {
  'use strict';

  // ===== 心形点赞：localStorage 持久化 =====
  var HEART_KEY = 'rwc_likes_v1';

  function getLikes() {
    try { return JSON.parse(localStorage.getItem(HEART_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function setLikes(o) {
    try { localStorage.setItem(HEART_KEY, JSON.stringify(o)); }
    catch (e) {}
  }
  // 初始点赞基数（让 0 看上去合理；新文章会从 0 开始）
  var BASE_LIKES = {
    'posts/atomic-habits.html': 23,
    'posts/thinking-fast-and-slow.html': 18,
    'posts/walden.html': 14
  };
  // Stub 文章的基数（hash 映射到 2-12 之间）
  function stubBase(url) {
    var sum = 0;
    for (var i = 0; i < url.length; i++) sum = (sum + url.charCodeAt(i)) & 0xff;
    return 2 + (sum % 11);
  }

  // ===== 共享封面与 Slogan 池 =====
  var FALLBACK_COVERS = [
    'img/covers/atomic-habits.svg',
    'img/covers/thinking-fast-and-slow.svg',
    'img/covers/walden.svg',
    'img/covers/indistractable.svg',
    'img/covers/5-types-of-wealth.svg',
    'img/covers/hidden-potential.svg'
  ];

  var SHARED_SLOGANS = [
    {
      en: 'A little bit of daily reading goes a long way.',
      zh: '每天读一点，日积月累，必有回响。'
    },
    {
      en: 'The reading you don\'t do today is the wisdom you owe yourself tomorrow.',
      zh: '今天不读的，是明天欠自己的智慧。'
    },
    {
      en: 'Books are letters from people who lived before us — opened when we need them.',
      zh: '书是先我们而活的人寄来的信，需要时拆开。'
    },
    {
      en: 'A single idea, applied, is worth more than a hundred books merely collected.',
      zh: '一百本未用的书，不如一个被实践的理念。'
    },
    {
      en: 'Every book is a small mirror. See what reflects back.',
      zh: '每本书都是一面小镜子，看清自己的倒影。'
    },
    {
      en: 'To read is to plant a seed the future will harvest.',
      zh: '阅读是种下一颗由未来收获的种子。'
    }
  ];

  function pickByUrl(arr, url) {
    // 用 URL 字符长度做种子，让同一个文章每次拿到同一个值
    var sum = 0;
    for (var i = 0; i < url.length; i++) sum = (sum + url.charCodeAt(i)) & 0xffff;
    return arr[sum % arr.length];
  }

  // ===== 数据（按日期降序）=====
  var POSTS = [
    // ====== 真实文章（3 篇） ======
    {
      url: 'posts/atomic-habits.html',
      date: 'Aug 27, 2026', mins: 5,
      en: 'Atomic Habits, identity change and the quiet power of 1%',
      zh: '《原子习惯》，身份认同与 1% 的复利',
      subEn: 'Why the smallest choices, repeated daily, end up changing who you are.',
      subZh: '最小的选择日复一日，最终会改变你是谁。',
      cover: 'img/covers/atomic-habits.svg',
      sloganEn: 'You do not rise to the level of your goals. You fall to the level of your systems.',
      sloganZh: '你不是达到目标的高度，而是跌落到你系统的层次。'
    },
    {
      url: 'posts/thinking-fast-and-slow.html',
      date: 'Aug 20, 2026', mins: 6,
      en: 'Thinking, Fast and Slow, three kinds of attachments and discipline',
      zh: '《思考，快与慢》，三种依附与纪律',
      subEn: 'Two systems in the mind, and where most mistakes quietly come from.',
      subZh: '大脑中的两套系统，大多数错误悄悄发生的地方。',
      cover: 'img/covers/thinking-fast-and-slow.svg',
      sloganEn: 'Nothing in life is as important as you think it is, while you are thinking about it.',
      sloganZh: '生活中没有你以为的那么重要，当你正在想它的时候。'
    },
    {
      url: 'posts/walden.html',
      date: 'Aug 13, 2026', mins: 7,
      en: 'Walden, on the art of living deliberately',
      zh: '《瓦尔登湖》，论从容地活',
      subEn: 'A 19th-century experiment in simplifying life — and what it still teaches us.',
      subZh: '一场 19 世纪的极简实验，至今仍在教我们。',
      cover: 'img/covers/walden.svg',
      sloganEn: 'I went to the woods because I wished to live deliberately.',
      sloganZh: '我步入丛林，因为我希望生活得有意义。'
    },

    // ====== Stub（21 条） ======
    {
      url: '#', date: 'Aug 06, 2026', mins: 4,
      en: 'Indistractable, focus on the now and paradise',
      zh: '《不可干扰》，专注当下与心流',
      subEn: 'You are not addicted to your phone — you are bored. The fix is not willpower.',
      subZh: '你不是对手机上瘾——你是无聊。解药不是意志力。',
      cover: 'img/covers/indistractable.svg',
      sloganEn: 'The antidote to impulsiveness is premeditation.',
      sloganZh: '冲动的解药是事先打算。'
    },
    {
      url: '#', date: 'Jul 30, 2026', mins: 4,
      en: 'What You\'re Made For, fighting chaos and taking risk',
      zh: '《你为谁而生》，对抗混乱与拥抱风险',
      subEn: 'A field manual for finding the work only you can do.',
      subZh: '一本只属于你的工作定位指南。',
      cover: 'img/covers/hidden-potential.svg',
      sloganEn: 'Character is built in the moments you think no one is watching.',
      sloganZh: '性格在你以为没人看到的时刻里被塑造。'
    },
    {
      url: '#', date: 'Jul 23, 2026', mins: 5,
      en: 'Becoming Yourself, finding your unique knowledge',
      zh: '成为你自己，发掘你独有的知识',
      subEn: 'The journey from copying others to letting your own voice lead.',
      subZh: '从模仿他人到让内心的声音领航。',
      cover: 'img/covers/hidden-potential.svg',
      sloganEn: 'Originality is just sincerity without the pretense.',
      sloganZh: '原创只是去掉伪装的真诚。'
    },
    {
      url: '#', date: 'Jul 16, 2026', mins: 3,
      en: 'Good Energy, patience and doing nothing meditation',
      zh: '《好能量》，耐心与什么都不做的冥想',
      subEn: 'Calm is not laziness — it is the soil from which good work grows.',
      subZh: '平静不是懒惰——它是好工作生长的土壤。',
      cover: 'img/covers/atomic-habits.svg',
      sloganEn: 'Doing nothing is a skill. The world is rarely in a hurry to teach it.',
      sloganZh: '「什么都不做」也是一项本事。世界很少教它。'
    },
    {
      url: '#', date: 'Jul 09, 2026', mins: 3,
      en: 'How to Try Again, on our own and fairy tales',
      zh: '《如何再来一次》，独自上路与童话',
      subEn: 'Restarting is not failure — it is the most underrated skill of the decade.',
      subZh: '重启不是失败——它是这个十年最被低估的能力。',
      cover: 'img/covers/walden.svg',
      sloganEn: 'Begin again — that is the bravest sentence a person can write.',
      sloganZh: '「重新开始」是一个人能写出的最勇敢的句子。'
    },
    {
      url: '#', date: 'Jul 02, 2026', mins: 3,
      en: 'Deep Work, on being truly ambitious',
      zh: '《深度工作》，论真正的雄心',
      subEn: 'The ability to focus without distraction is the new superpower.',
      subZh: '专注不分心的能力，是新的超能力。',
      cover: 'img/covers/thinking-fast-and-slow.svg',
      sloganEn: 'Clarity about what matters is the highest leverage you can build.',
      sloganZh: '对重要之事的清晰，是你最值得建造的杠杆。'
    },
    {
      url: '#', date: 'Jun 25, 2026', mins: 4,
      en: 'The Courage to Commit, learning something new',
      zh: '《承诺的勇气》，学习新事物',
      subEn: 'Commitment is not a cage — it is the architecture of a meaningful life.',
      subZh: '承诺不是牢笼——它是有意义生活的架构。',
      cover: 'img/covers/indistractable.svg',
      sloganEn: 'A half-hearted life produces half-hearted results.',
      sloganZh: '三心二意的人生，得出三心二意的成果。'
    },
    {
      url: '#', date: 'Jun 18, 2026', mins: 3,
      en: 'Scarcity Brain, nonjudgemental curiosity',
      zh: '《稀缺心态》，不带评判的好奇',
      subEn: 'Why a full calendar feels like a successful life — and why it usually is not.',
      subZh: '为什么满日历看起来像成功生活——但往往不是。',
      cover: 'img/covers/thinking-fast-and-slow.svg',
      sloganEn: 'Curiosity is an open palm; judgement is a closed fist.',
      sloganZh: '好奇心是张开的手，判断是握紧的拳。'
    },
    {
      url: '#', date: 'Jun 11, 2026', mins: 3,
      en: 'Master of Change, building character through adversity',
      zh: '《变化的主人》，借逆境铸造性格',
      subEn: 'Resilience is not a trait you are born with — it is a muscle you train.',
      subZh: '韧性不是天生的特质——它是训练出来的肌肉。',
      cover: 'img/covers/walden.svg',
      sloganEn: 'The obstacle in front of you was always the path.',
      sloganZh: '眼前的障碍，事后看就是路本身。'
    },
    {
      url: '#', date: 'Jun 04, 2026', mins: 3,
      en: 'Hidden Potential, achieving greatness',
      zh: '《隐藏的潜能》，通向卓越',
      subEn: 'Talent is overrated. The systems around it are everything.',
      subZh: '天赋被高估了。它周围的系统才是一切。',
      cover: 'img/covers/hidden-potential.svg',
      sloganEn: 'Systems always beat goals in the long run.',
      sloganZh: '系统永远比目标跑得更远。'
    },
    {
      url: '#', date: 'May 28, 2026', mins: 3,
      en: 'Runnin\' Down a Dream, the power of experiments',
      zh: '实验的力量，小步快跑',
      subEn: 'How the small, curious experiments compound into a life you actually wanted.',
      subZh: '微小的好奇实验如何复利成你想要的生活。',
      cover: 'img/covers/atomic-habits.svg',
      sloganEn: 'Experiments are cheaper than regrets.',
      sloganZh: '做实验比留遗憾便宜得多。'
    },
    {
      url: '#', date: 'May 21, 2026', mins: 3,
      en: 'How To Not Know, the loop of wisdom',
      zh: '《如何承认不知道》，智慧的回路',
      subEn: 'Wisdom is not what you know — it is knowing where your knowing ends.',
      subZh: '智慧不是你知道什么——而是知道你的知道在哪里止步。',
      cover: 'img/covers/walden.svg',
      sloganEn: 'The most honest sentence in any conversation is "I don\'t know — yet."',
      sloganZh: '对话里最诚实的话是「我还没知道」。'
    },
    {
      url: '#', date: 'May 14, 2026', mins: 4,
      en: 'Same As Ever, learning is vital',
      zh: '《一如既往》，学习至关重要',
      subEn: 'What is timeless about human nature — and what is just noise.',
      subZh: '人性的哪些部分是不变的，哪些只是噪声。',
      cover: 'img/covers/indistractable.svg',
      sloganEn: 'Fashion is what you wear this year. Wisdom is what you wear every year.',
      sloganZh: '流行是今年穿的；智慧是每年都穿的。'
    },
    {
      url: '#', date: 'May 07, 2026', mins: 3,
      en: 'The Mental Strength Playbook, uncertainty tolerance',
      zh: '《心理韧性手册》，容忍不确定',
      subEn: 'A practical field guide for the days the world feels unmoored.',
      subZh: '世界显得失重时，一本实用的实战指南。',
      cover: 'img/covers/hidden-potential.svg',
      sloganEn: 'Uncertainty is not the enemy of action — it is the prerequisite of wisdom.',
      sloganZh: '不确定不是行动之敌——它是智慧的前提。'
    },
    {
      url: '#', date: 'Apr 30, 2026', mins: 3,
      en: 'Clear Thinking, solving problems',
      zh: '《清晰思考》，解决问题',
      subEn: 'The first step to better arguments is admitting the bad ones you keep winning.',
      subZh: '更好的论证始于承认：你总赢的那些其实是错的。',
      cover: 'img/covers/thinking-fast-and-slow.svg',
      sloganEn: 'A clear head is rare currency; protect it fiercely.',
      sloganZh: '清晰的头脑是稀缺货币；要用力保护。'
    },
    {
      url: '#', date: 'Apr 23, 2026', mins: 3,
      en: 'Slow Productivity, learn to be silent',
      zh: '《慢生产力》，学会沉默',
      subEn: 'A counter-argument to hustle culture, grounded in research and quiet practice.',
      subZh: '对忙碌文化的有力反驳，扎根于研究与安静的练习。',
      cover: 'img/covers/walden.svg',
      sloganEn: 'Slow is smooth. Smooth is fast.',
      sloganZh: '慢即是顺，顺即是快。'
    },
    {
      url: '#', date: 'Apr 16, 2026', mins: 3,
      en: 'Beyond Belief, doing hard things',
      zh: '《超越信念》，做难事',
      subEn: 'When you cannot control outcomes, the only thing left is the kind of person you become.',
      subZh: '当你无法掌控结果，剩下唯一能做的就是成为什么样的人。',
      cover: 'img/covers/hidden-potential.svg',
      sloganEn: 'Difficult roads often lead to beautiful destinations.',
      sloganZh: '难走的路，常常通向美的目的地。'
    },
    {
      url: '#', date: 'Apr 09, 2026', mins: 8,
      en: 'Discipline is Destiny, breadth vs depth',
      zh: '《纪律即命运》，博与深',
      subEn: 'Self-command is the engine of every other virtue you want to build.',
      subZh: '自律是你想建立的一切美德的发动机。',
      cover: 'img/covers/atomic-habits.svg',
      sloganEn: 'Discipline is choosing between what you want now and what you want most.',
      sloganZh: '自律是在「现在想要的」和「最想要的」之间选择后者。'
    },
    {
      url: '#', date: 'Apr 02, 2026', mins: 8,
      en: 'How to Make Your Brain Your Best Friend',
      zh: '《如何与大脑成为朋友》',
      subEn: 'Small wins and routine — the underrated architecture of every quiet life.',
      subZh: '小赢与日常——每个宁静生活的隐性架构。',
      cover: 'img/covers/walden.svg',
      sloganEn: 'Your brain will be your closest companion for life. Treat it kindly.',
      sloganZh: '你将与大脑终生相伴。请善待它。'
    },
    {
      url: '#', date: 'Mar 26, 2026', mins: 7,
      en: 'Meditations for Mortals, training your mind',
      zh: '《凡人的冥想》，训练你的心',
      subEn: 'A week-by-week guide to thinking more clearly without becoming insufferable.',
      subZh: '一周一练的指南，让思维更清晰却不必变得讨厌。',
      cover: 'img/covers/thinking-fast-and-slow.svg',
      sloganEn: 'A quiet mind sees things a tired one misses.',
      sloganZh: '安静的头脑能看见疲倦的头脑看不见的东西。'
    },
    {
      url: '#', date: 'Mar 19, 2026', mins: 7,
      en: 'The Let Them Theory, non-competition',
      zh: '《让他们去吧》，非竞争',
      subEn: 'Some people will leave your life; the rest is yours to design.',
      subZh: '有些人会离开你的生活；剩下的是你该设计的。',
      cover: 'img/covers/5-types-of-wealth.svg',
      sloganEn: 'Letting go is not losing — it is making room.',
      sloganZh: '放手不是失去——是腾出空间。'
    }
  ];

  // ===== 给 stub 自动补 cover / slogan =====
  //（真实文章的 cover / slogan 是显式的）
  POSTS.forEach(function (p) {
    if (!p.cover) {
      p.cover = pickByUrl(FALLBACK_COVERS, p.url + p.en);
      var sl = pickByUrl(SHARED_SLOGANS, p.url + p.en);
      p.sloganEn = sl.en;
      p.sloganZh = sl.zh;
    }
  });

  var PER_PAGE = 9;
  var page = 1;
  var q = '';

  // 简单 HTML 转义
  function escape(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // 渲染卡片
  function cardHTML(p) {
    var likes = getLikes();
    var base = BASE_LIKES[p.url] || (p.url === '#' ? stubBase(p.en + p.date) : 0);
    var userLiked = !!likes[p.url];
    var count = base + (likes[p.url] || 0);

    // 点赞按钮：因卡片整体是 <a>，按钮要用 JS 拦击，不跳
    return [
      '<a class="archive-card" href="', p.url, '">',
        '<div class="archive-card-meta">',
          p.date,
          '<span class="dot">•</span>',
          p.mins, ' min read',
        '</div>',

        '<div class="archive-card-hero">',
          '<img class="archive-card-cover" src="', p.cover, '" alt="" loading="lazy">',
          '<div class="archive-card-slogan">',
            '<span class="archive-card-slogan-quote">“</span>',
            '<div class="archive-card-slogan-text">',
              '<span lang="en">', escape(p.sloganEn || ''), '</span>',
              '<span lang="zh">', escape(p.sloganZh || ''), '</span>',
            '</div>',
          '</div>',
        '</div>',

        '<h3>',
          '<span lang="en">', escape(p.en), '</span>',
          '<span lang="zh">', escape(p.zh), '</span>',
        '</h3>',
        '<p class="archive-card-teaser">',
          '<span lang="en">', escape(p.subEn), '</span>',
          '<span lang="zh">', escape(p.subZh), '</span>',
        '</p>',

        '<div class="archive-card-bottom">',
          '<div class="archive-card-author">',
            '<img class="archive-card-avatar" src="img/logo.svg" alt="">',
            '<span class="archive-card-author-name">COLIN</span>',
          '</div>',
          '<button class="archive-card-heart', userLiked ? ' liked' : '', '" ',
                  'data-url="', p.url, '" data-base="', base, '" ',
                  'aria-label="Like this letter">',
            '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">',
              '<path fill="currentColor" d="M12 21s-7.5-4.6-9.5-9.3C1.4 9 3.4 5.6 6.5 5.2c2-.3 3.9.7 5 2.4 1-1.6 2.9-2.7 5-2.4 3.1.4 5.1 3.8 4 6.5C19.5 16.4 12 21 12 21z"/>',
            '</svg>',
            '<span class="heart-count">', count, '</span>',
          '</button>',
        '</div>',
      '</a>'
    ].join('');
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
    bindHearts();
  }

  // 点赞按钮：事件委托（每次重渲染后重新绑定）
  function bindHearts() {
    document.querySelectorAll('.archive-card-heart').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var url = btn.getAttribute('data-url');
        var base = parseInt(btn.getAttribute('data-base'), 10) || 0;
        var likes = getLikes();
        var wasLiked = !!likes[url];
        if (wasLiked) {
          delete likes[url];
        } else {
          likes[url] = 1;
        }
        setLikes(likes);
        var total = base + (likes[url] || 0);
        btn.classList.toggle('liked', !wasLiked);
        var span = btn.querySelector('.heart-count');
        if (span) span.textContent = total;
        // 心跳动画
        btn.classList.remove('pulse');
        // 重排触发动画
        void btn.offsetWidth;
        btn.classList.add('pulse');
      });
    });
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
      document.querySelector('.archive-toolbar').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    new MutationObserver(syncLang).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });

    syncLang();
  });
})();
