/**
 * <quote-flashcard> — 独立、无侵入的金句闪卡组件（Web Component / Shadow DOM）
 *
 * 特点：
 *  - 样式全部封装在 Shadow DOM 内，绝不会污染你老网站的 CSS / 主题。
 *  - 零依赖，纯原生 JS，任何老项目（静态 HTML / WordPress / 框架页）都能直接塞。
 *
 * 嵌入步骤：
 *   1) 引入本脚本：  <script src="quote-flashcard.js"></script>
 *   2) 在你想放的位置放标签：  <quote-flashcard></quote-flashcard>
 *   3) 想换内容，用 quotes 属性传 JSON：
 *      <quote-flashcard quotes='[{"quote":"...","author":"...","context":["a","b","c"],"action":"..."}]'></quote-flashcard>
 */
(function () {
  "use strict";

  const DEFAULTS = [
    {
      quote: "重建你与「附近」的关系，是抵御意义消散的第一道防线。",
      author: "项飙 × 斯多葛学派",
      context: [
        "项飙提醒：现代人败给了「附近的消失」——对楼下早餐铺都比对内心更陌生。",
        "斯多葛「控制二分法」：把能量只投向你能掌控之事，其余交还命运。",
        "两者相遇：用附近的确定性，对冲远方的焦虑。"
      ],
      action: "今天做一件「附近」的小事：记住一位常遇路人的面孔，或步行而非刷手机回家。"
    },
    {
      quote: "见路不走——不是不走路，是别照着别人的路走。",
      author: "豆豆《遥远的救世主》· 丁元英",
      context: [
        "「路」是既有的经验与成法；「见路不走」是看透因果，而非照搬结果。",
        "弱势文化盼救主，强势文化造因果——你信哪个，决定你站在哪边。",
        "照搬成功学的人，往往死在最像成功的地方。"
      ],
      action: "遇到一个「别人都这么做」的决策，先问：这背后的因果，在我这成立吗？"
    },
    {
      quote: "把问题拆解到不能再拆，真相往往就在最底层那块砖上。",
      author: "埃隆·马斯克 · 第一性原理",
      context: [
        "第一性原理：抛开类比与惯例，回到物理与事实的最底层重新推演。",
        "系统思维：看要素之间的反馈回路，而非孤立的成败。",
        "多数人困在「别人怎么做」，少数人从「本质是什么」起步。"
      ],
      action: "选一件你正在焦虑的事，写下它最底层的三个事实，再据此重做判断。"
    }
  ];

  const STYLE = `
    :host { display:block; max-width:680px; }
    * { box-sizing:border-box; }
    .card {
      background:linear-gradient(160deg,#1A365D 0%,#0F172A 100%);
      border:1px solid rgba(214,158,46,.35);
      border-radius:20px;
      padding:26px 28px;
      color:#F8FAFC;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
      box-shadow:0 10px 40px rgba(0,0,0,.35);
    }
    .tag {
      display:inline-block; font-size:11px; letter-spacing:.18em; text-transform:uppercase;
      color:#D69E2E; border:1px solid rgba(214,158,46,.4); border-radius:999px;
      padding:3px 10px; margin-bottom:14px;
    }
    .quote {
      font-family:Georgia,"Songti SC",serif; font-size:22px; line-height:1.6;
      margin:0 0 6px; color:#F8FAFC;
    }
    .author { font-size:13px; color:rgba(248,250,252,.55); margin-bottom:18px; }
    .rule { height:1px; background:linear-gradient(90deg,rgba(214,158,46,.5),transparent); margin:0 0 16px; }
    .ctx-label,.act-label { font-size:11px; letter-spacing:.15em; color:#D69E2E; margin-bottom:8px; }
    ul.ctx { margin:0 0 18px; padding-left:0; list-style:none; }
    ul.ctx li {
      position:relative; padding-left:22px; margin-bottom:9px; font-size:14px; line-height:1.6;
      color:rgba(248,250,252,.82);
    }
    ul.ctx li::before {
      content:"·"; position:absolute; left:6px; top:-1px; color:#D69E2E; font-size:20px; line-height:1;
    }
    .act {
      background:rgba(214,158,46,.12); border-left:3px solid #D69E2E; border-radius:0 12px 12px 0;
      padding:12px 14px; font-size:14px; line-height:1.6; color:#F8FAFC;
    }
    .foot { display:flex; gap:10px; margin-top:18px; }
    button {
      flex:1; cursor:pointer; border:none; border-radius:12px; padding:10px 12px; font-size:13px;
      font-weight:600; transition:transform .12s ease, opacity .12s ease;
    }
    button:active { transform:scale(.97); }
    .next { background:#D69E2E; color:#0F172A; }
    .copy { background:rgba(248,250,252,.12); color:#F8FAFC; }
    .toast {
      position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
      background:#0F172A; color:#D69E2E; border:1px solid rgba(214,158,46,.4);
      padding:8px 16px; border-radius:10px; font-size:13px; opacity:0; transition:opacity .2s;
      pointer-events:none; font-family:sans-serif;
    }
    .toast.show { opacity:1; }
  `;

  class QuoteFlashcard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._idx = 0;
    }
    connectedCallback() {
      let data = DEFAULTS;
      const attr = this.getAttribute("quotes");
      if (attr) {
        try {
          const parsed = JSON.parse(attr);
          if (Array.isArray(parsed) && parsed.length) data = parsed;
        } catch (e) { /* 用默认数据 */ }
      }
      this._data = data;
      this.render();
    }
    render() {
      const item = this._data[this._idx % this._data.length];
      const ctx = (item.context || []).map((c) => `<li>${escapeHtml(c)}</li>`).join("");
      this.shadowRoot.innerHTML = `
        <style>${STYLE}</style>
        <div class="card">
          <span class="tag">Colin · 金句闪卡</span>
          <p class="quote">“${escapeHtml(item.quote)}”</p>
          <div class="author">— ${escapeHtml(item.author || "")}</div>
          <div class="rule"></div>
          <div class="ctx-label">1-3-1 · 三层解构</div>
          <ul class="ctx">${ctx}</ul>
          <div class="act-label">微行动锚点</div>
          <div class="act">${escapeHtml(item.action || "")}</div>
          <div class="foot">
            <button class="next">换一张</button>
            <button class="copy">复制金句</button>
          </div>
        </div>
        <div class="toast">已复制到剪贴板</div>`;
      this.shadowRoot.querySelector(".next").addEventListener("click", () => this.next());
      this.shadowRoot.querySelector(".copy").addEventListener("click", () => this.copy(item));
    }
    next() {
      this._idx = (this._idx + 1) % this._data.length;
      this.render();
    }
    copy(item) {
      const text = `“${item.quote}” — ${item.author}\n\n${item.action}`;
      const toast = this.shadowRoot.querySelector(".toast");
      const done = () => { toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(done);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta); done();
      }
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  if (!customElements.get("quote-flashcard")) {
    customElements.define("quote-flashcard", QuoteFlashcard);
  }
})();
