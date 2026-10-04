/**
 * <quote-flashcard> — Quote Strip · v2
 * ============================================================
 * 独立组件（零依赖，Shadow DOM 样式隔离，不碰老站任何 CSS/结构）。
 *
 * v2 按反馈重做：
 *  1. 配色对齐站点主题：纸白卡片 / 墨黑文字 / #E7E0D2 细线 / #C9A668 淡金点缀；
 *  2. 全英文内容（金句与出处均来自线上真实书评数据）；
 *  3. 默认收起为一条纤细横条（约 60px 高），点击展开——不占地方；
 *  4. 展开后「Read the full essay →」直达对应文章 posts/<slug>.html，整条可点。
 *
 * 用法：
 *   <script src="quote-flashcard.js"></script>
 *   <quote-flashcard></quote-flashcard>
 * 可选属性：
 *   base="/posts/"   文章链接前缀（默认 "posts/"，即 posts/<slug>.html）
 */
(function () {
  "use strict";
  if (customElements.get("quote-flashcard")) return;

  // 数据：全部来自 readswithcolin.com/data/posts.json 的真实条目（quote.textEn / quote.srcEn / slug）
  var CARDS = [
    {
      slug: "think-fast-slow",
      quote: "Nothing in life is as important as you think it is, while you are thinking about it.",
      src: "Daniel Kahneman, Thinking, Fast and Slow",
      title: "Thinking, Fast and Slow"
    },
    {
      slug: "reading-os",
      quote: "In my whole life, I have known no wise people who didn't read all the time — none, zero.",
      src: "Charlie Munger · via A Reading OS",
      title: "Learn, Then Transcend: A Reading OS"
    },
    {
      slug: "internal-anchor",
      quote: "Men are disturbed not by things, but by the views which they take of things.",
      src: "Epictetus, Enchiridion",
      title: "When Modern Psychology Met the Eastern Path of Liberation"
    },
    {
      slug: "great-mental-models",
      quote: "When all you have is a hammer, everything looks like a nail. But check first.",
      src: "Shane Parrish, The Great Mental Models",
      title: "The Great Mental Models"
    },
    {
      slug: "scarcity",
      quote: "Scarcity is not about having less — it is about having less mental bandwidth.",
      src: "Sendhil Mullainathan, Scarcity",
      title: "Scarcity"
    },
    {
      slug: "beyond-shallows",
      quote: "If you don't produce, you won't thrive — no matter how skilled or talented you are.",
      src: "Cal Newport, So Good They Can't Ignore You",
      title: "Beyond Shallows: Deconstructing Cal Newport's Deep Reading Framework"
    },
    {
      slug: "pyramid-principle",
      quote: "Think top-down: state the answer, then support it.",
      src: "Barbara Minto, The Pyramid Principle",
      title: "The Pyramid Principle"
    },
    {
      slug: "power-of-summarizing",
      quote: "Clarity is the highest courtesy you can offer yourself.",
      src: "Colin, The Power of Summarizing",
      title: "The Power of Summarizing"
    }
  ];

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
    ".q{flex:1;min-width:0;font-size:14.5px;font-style:italic;color:#14110C;",
    "  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
    ".q .qm{color:#C9A668;font-style:normal;}",
    ".chev{flex:none;color:#6E675B;font-family:Arial,sans-serif;font-size:11px;",
    "  transition:transform .18s ease;user-select:none;}",
    ".open .chev{transform:rotate(90deg);}",
    ".body{max-height:0;overflow:hidden;transition:max-height .22s ease;}",
    ".open .body{max-height:220px;}",
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
    "@media (max-width:560px){.tag{display:none;}.q{font-size:13.5px;}}"
  ].join("");

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' + STYLE + '</style>' +
    '<div class="strip" part="strip">' +
    '  <div class="row">' +
    '    <span class="tag">Quote</span>' +
    '    <span class="q"><span class="qm">\u201C</span><span class="qt"></span><span class="qm">\u201D</span></span>' +
    '    <span class="chev">\u25B8</span>' +
    '  </div>' +
    '  <div class="body">' +
    '    <div class="body-in">' +
    '      <p class="full"></p>' +
    '      <p class="src"></p>' +
    '      <div class="linkrow">' +
    '        <a class="read" href="#">Read the full essay \u2192</a>' +
    '        <button class="next" type="button">Next quote \u21BB</button>' +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  function QuoteFlashcard() {
    var self = Reflect.construct(HTMLElement, [], QuoteFlashcard);
    self._i = Math.floor(Math.random() * CARDS.length);
    self._base = "posts/";
    return self;
  }
  QuoteFlashcard.prototype = Object.create(HTMLElement.prototype, {
    connectedCallback: {
      value: function () {
        var self = this;
        var root = this.attachShadow({ mode: "open" });
        root.appendChild(template.content.cloneNode(true));

        var b = this.getAttribute("base");
        if (b) this._base = b;

        this._strip = root.querySelector(".strip");
        this._qt = root.querySelector(".qt");
        this._full = root.querySelector(".full");
        this._src = root.querySelector(".src");
        this._link = root.querySelector(".read");

        this._render();

        // 点击横条 = 展开/收起；点链接/按钮不触发展开切换
        this._strip.addEventListener("click", function (e) {
          if (e.target.closest(".read") || e.target.closest(".next")) return;
          self._strip.classList.toggle("open");
        });
        root.querySelector(".next").addEventListener("click", function () {
          self._i = (self._i + 1) % CARDS.length;
          self._render();
        });
      }
    }
  });
  customElements.define("quote-flashcard", QuoteFlashcard);
})();
