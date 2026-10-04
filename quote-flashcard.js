/**
 * <quote-flashcard> — Quote Strip · v3
 * ============================================================
 * 独立组件（零依赖，Shadow DOM 样式隔离，不碰老站任何 CSS/结构）。
 *
 * v3 新增：
 *  1. 双语跟随：自动跟随站点中/英文界面（rwc-lang / ?lang= / html[lang]），
 *     中文界面显示中文金句与中文按钮，英文界面显示英文；
 *  2. 金句仓库化：运行时拉取 data/posts.json，42 篇文章的金句全部自动收录——
 *     以后新发文章只要 posts.json 里有 quote 字段，闪卡自动更新，无需改代码；
 *  3. 拉取失败自动回退到内置 8 条（双语），本地预览也不空白。
 *
 * 用法：
 *   <script src="quote-flashcard.js"></script>
 *   <quote-flashcard></quote-flashcard>
 * 可选属性：
 *   base="/posts/"          文章链接前缀（默认 "posts/"）
 *   data-src="data/posts.json"  金句仓库地址（默认 "data/posts.json"）
 */
(function () {
  "use strict";
  if (customElements.get("quote-flashcard")) return;

  /* ---------- 内置回退数据（与 data/posts.json 同步的 8 条，双语） ---------- */
  var FALLBACK = [
    { slug: "think-fast-slow",
      en: { text: "Nothing in life is as important as you think it is, while you are thinking about it.", src: "Daniel Kahneman, Thinking, Fast and Slow", title: "Thinking, Fast and Slow" },
      zh: { text: "生活里没有什么事，会像你以为的那么重要——至少在你正在想它的那一刻。", src: "— 丹尼尔·卡尼曼，《思考，快与慢》", title: "思考，快与慢" } },
    { slug: "reading-os",
      en: { text: "In my whole life, I have known no wise people who didn't read all the time — none, zero.", src: "Charlie Munger, Poor Charlie's Almanack", title: "Learn, Then Transcend: A Reading OS" },
      zh: { text: "在我的一生中，我认识的所有聪明人，没有一个不是在时刻阅读的——一个都没有。", src: "— 查理·芒格，《穷查理宝典》", title: "习而新之：将查理·芒格与《资治通鉴》融为一体的阅读操作系统" } },
    { slug: "internal-anchor",
      en: { text: "Men are disturbed not by things, but by the views which they take of things.", src: "Epictetus, Enchiridion", title: "When Modern Psychology Met the Eastern Path of Liberation" },
      zh: { text: "人不是被事物本身所扰，而是被他们对事物所持的看法所扰。", src: "— 爱比克泰德，《手册》第 5 节", title: "当现代心理学撞上东方解脱道——重构高 Agency 的内在锚" } },
    { slug: "great-mental-models",
      en: { text: "When all you have is a hammer, everything looks like a nail. But check first.", src: "Shane Parrish, The Great Mental Models", title: "The Great Mental Models" },
      zh: { text: "当你手里有把锤子，你看什么都像钉子。但首先看看是不是钉子。", src: "— 沙恩·帕里什，《思考的框架》", title: "思考的框架" } },
    { slug: "scarcity",
      en: { text: "Scarcity is not about having less — it is about having less mental bandwidth.", src: "Sendhil Mullainathan, Scarcity", title: "Scarcity" },
      zh: { text: "稀缺不是缺什么——是缺乏脑力带宽。", src: "— 塞德希尔·穆来纳森，《稀缺》", title: "稀缺" } },
    { slug: "beyond-shallows",
      en: { text: "If you don't produce, you won't thrive — no matter how skilled or talented you are.", src: "Cal Newport, So Good They Can't Ignore You", title: "Beyond Shallows: Deconstructing Cal Newport's Deep Reading Framework" },
      zh: { text: "无论你多么有才华或技能高超，如果你不持续输出，你就无法在这个时代繁荣。", src: "— 卡尔·纽波特，《深度提问》播客", title: "越过浅水区：拆解卡尔·纽波特的深度阅读框架" } },
    { slug: "pyramid-principle",
      en: { text: "Think top-down: state the answer, then support it.", src: "Barbara Minto, The Pyramid Principle", title: "The Pyramid Principle" },
      zh: { text: "思考自顶向下：先给答案，再给支撑。", src: "— 芭芭拉·明托，《金字塔原理》", title: "金字塔原理" } },
    { slug: "power-of-summarizing",
      en: { text: "Clarity is the highest courtesy you can offer yourself.", src: "Colin, The Power of Summarizing", title: "The Power of Summarizing" },
      zh: { text: "说得清，是对自己最大的礼貌。", src: "— 山口拓朗，《概括力》", title: "概括力" } }
  ];

  var CARDS = FALLBACK.slice();

  /* ---------- 样式（贴站点主题：纸白/墨黑/细线/淡金） ---------- */
  var STYLE = [
    ":host{all:initial;display:block;font-family:Georgia,'Times New Roman',serif;}",
    "*{box-sizing:border-box;margin:0;padding:0;}",
    ".strip{background:#FFFFFF;border:1px solid #E7E0D2;border-left:3px solid #C9A668;",
    "  border-radius:8px;cursor:pointer;overflow:hidden;",
    "  transition:box-shadow .18s ease,border-color .18s ease;}",
    ".strip:hover{border-color:#C9A668;box-shadow:0 2px 10px rgba(20,17,12,.06);}",
    ".row{display:flex;align-items:center;gap:12px;padding:12px 16px;}",
    ".tag{flex:none;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:.12em;",
    "  color:#C9A668;text-transform:uppercase;white-space:nowrap;}",
    ":host([lang=zh]) .tag{letter-spacing:.08em;}",
    ".q{flex:1;min-width:0;font-size:14.5px;font-style:italic;color:#14110C;",
    "  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
    ".q .qm{color:#C9A668;font-style:normal;}",
    ".chev{flex:none;color:#6E675B;font-family:Arial,sans-serif;font-size:11px;",
    "  transition:transform .18s ease;user-select:none;}",
    ".open .chev{transform:rotate(90deg);}",
    ".body{max-height:0;overflow:hidden;transition:max-height .22s ease;}",
    ".open .body{max-height:260px;}",
    ".body-in{padding:2px 18px 14px 31px;border-top:1px solid #F0EAD9;}",
    ".full{margin-top:10px;font-size:15.5px;font-style:italic;line-height:1.55;color:#14110C;}",
    ".src{margin-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6E675B;}",
    ".linkrow{margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:12px;}",
    ".read{display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;",
    "  color:#8B5E3C;text-decoration:none;border-bottom:1px solid rgba(139,94,60,.35);",
    "  padding-bottom:1px;}",
    ".read:hover{color:#14110C;border-bottom-color:#14110C;}",
    ".next{flex:none;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#6E675B;",
    "  background:none;border:1px solid #E7E0D2;border-radius:6px;padding:4px 10px;cursor:pointer;}",
    ".next:hover{border-color:#C9A668;color:#8B5E3C;}",
    "@media (max-width:560px){.tag{display:none;}.q{font-size:13.5px;}.full{font-size:14.5px;}}"
  ].join("");

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' + STYLE + '</style>' +
    '<div class="strip" part="strip">' +
    '  <div class="row">' +
    '    <span class="tag"></span>' +
    '    <span class="q"><span class="qm">\u201C</span><span class="qt"></span><span class="qm">\u201D</span></span>' +
    '    <span class="chev">\u25B8</span>' +
    '  </div>' +
    '  <div class="body">' +
    '    <div class="body-in">' +
    '      <p class="full"></p>' +
    '      <p class="src"></p>' +
    '      <div class="linkrow">' +
    '        <a class="read" href="#"></a>' +
    '        <button class="next" type="button"></button>' +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  /* ---------- 语言检测（与站点 detectLang 同一套规则） ---------- */
  function detectLang() {
    try {
      var fromUrl = new URLSearchParams(location.search).get("lang");
      if (fromUrl === "zh" || fromUrl === "en") return fromUrl;
      var saved = localStorage.getItem("rwc-lang");
      if (saved === "zh" || saved === "en") return saved;
    } catch (e) {}
    var a = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    if (a === "zh" || a === "en") return a;
    var nav = (navigator.language || "en").toLowerCase();
    return nav.indexOf("zh") === 0 ? "zh" : "en";
  }

  function QuoteFlashcard() {
    var self = Reflect.construct(HTMLElement, [], QuoteFlashcard);
    self._i = 0;
    self._lang = "en";
    self._base = "posts/";
    self._dataSrc = "data/posts.json";
    return self;
  }
  QuoteFlashcard.prototype = Object.create(HTMLElement.prototype);

  QuoteFlashcard.prototype.connectedCallback = function () {
    var self = this;
    var root = this.attachShadow({ mode: "open" });
    root.appendChild(template.content.cloneNode(true));

    var b = this.getAttribute("base");
    if (b) this._base = b;
    var d = this.getAttribute("data-src");
    if (d) this._dataSrc = d;

    this._strip = root.querySelector(".strip");
    this._tag = root.querySelector(".tag");
    this._qt = root.querySelector(".qt");
    this._full = root.querySelector(".full");
    this._src = root.querySelector(".src");
    this._link = root.querySelector(".read");
    this._next = root.querySelector(".next");

    this._i = Math.floor(Math.random() * CARDS.length);
    this._lang = detectLang();
    this._render();

    // 点击横条 = 展开/收起；点链接/按钮不触发展开切换
    this._strip.addEventListener("click", function (e) {
      if (e.target.closest(".read") || e.target.closest(".next")) return;
      self._strip.classList.toggle("open");
    });
    this._next.addEventListener("click", function () {
      self._i = (self._i + 1) % CARDS.length;
      self._render();
    });

    // 跟随站点语言切换：applyLang 会改 html[lang]，用 MutationObserver 捕获
    if (window.MutationObserver) {
      this._mo = new MutationObserver(function () { self._syncLang(); });
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }
    // 兜底：语言按钮点击后稍作延迟再同步（防止 observer 时序问题）
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("[data-set-lang]")) {
        setTimeout(function () { self._syncLang(); }, 60);
      }
    });

    // 拉取金句仓库：posts.json 里 42 篇的 quote 全部自动收录
    this._loadData();
  };

  QuoteFlashcard.prototype.disconnectedCallback = function () {
    if (this._mo) this._mo.disconnect();
  };

  QuoteFlashcard.prototype._syncLang = function () {
    var l = detectLang();
    if (l !== this._lang) { this._lang = l; this._render(); }
  };

  QuoteFlashcard.prototype._loadData = function () {
    var self = this;
    if (!window.fetch) return;
    try {
      fetch(self._dataSrc, { cache: "no-cache" })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error(String(r.status))); })
        .then(function (data) {
          var items = (data && data.items) || [];
          var list = [];
          for (var k = 0; k < items.length; k++) {
            var x = items[k], q = x.quote;
            if (!q || !(q.textEn || q.textZh)) continue;
            list.push({
              slug: x.slug,
              en: { text: q.textEn || q.textZh, src: q.srcEn || q.srcZh || "", title: x.titleEn || x.titleZh || "" },
              zh: { text: q.textZh || q.textEn, src: q.srcZh || q.srcEn || "", title: x.titleZh || x.titleEn || "" }
            });
          }
          if (!list.length) return;
          CARDS = list;
          if (self._i >= CARDS.length) self._i = Math.floor(Math.random() * CARDS.length);
          self._render();
        })
        .catch(function () { /* 拉取失败：沿用内置 8 条 */ });
    } catch (e) {}
  };

  QuoteFlashcard.prototype._render = function () {
    if (!this._qt || !CARDS.length) return;
    var c = CARDS[this._i % CARDS.length];
    var v = this._lang === "zh" ? c.zh : c.en;
    this._tag.textContent = this._lang === "zh" ? "金句" : "Quote";
    this._qt.textContent = v.text;
    this._full.textContent = "\u201C" + v.text + "\u201D";
    this._src.textContent = v.src ? (v.src.indexOf("\u2014") === 0 ? v.src : "\u2014 " + v.src) : "";
    this._link.href = this._base + c.slug + ".html";
    this._link.title = v.title || "";
    this._link.textContent = this._lang === "zh" ? "阅读全文 \u2192" : "Read the full essay \u2192";
    this._next.textContent = this._lang === "zh" ? "换一条 \u21BB" : "Next quote \u21BB";
  };

  customElements.define("quote-flashcard", QuoteFlashcard);
})();
