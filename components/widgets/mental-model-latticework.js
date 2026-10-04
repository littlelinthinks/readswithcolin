/**
 * <mental-model-latticework> — Colin 智库 · 思维模型网格（暗金风，数据驱动）
 * ============================================================
 * 独立组件（Web Component + Shadow DOM，零依赖，不碰老站任何代码/样式）。
 * 默认渲染内置 5 大决策网格；若提供 src 属性则异步拉取 JSON 渲染，
 * JSON 含 scenes 时自动渲染「场景过滤器」chip，点击按场景筛选项。
 *
 * 数据格式（data/xxx.json）：
 * {
 *   "title": "思维模型网格", "en": "Mental Model Latticework",
 *   "scenes": ["全部", "投资", "创业", "决策"],          // 可选；>1 时显示过滤器
 *   "grids": [
 *     { "icon":"📖", "title":"...", "en":"...", "desc":"...",
 *       "detail":["...","..."], "scene":"投资", "link":"posts/x.html" }  // scene/link 可选
 *   ]
 * }
 *
 * 嵌入步骤（2 行代码）：
 *   1) 想放的位置放：<mental-model-latticework src="data/books-grid.json"></mental-model-latticework>
 *   2) </body> 前放：<script src="components/widgets/mental-model-latticework.js"></script>
 */
(function () {
  "use strict";
  if (customElements.get("mental-model-latticework")) return;

  // 内置回退数据（无 src 或拉取失败时渲染）
  var FALLBACK = {
    title: "思维模型网格", en: "Mental Model Latticework", scenes: null, grids: [
      { icon: "🔍", title: "认知审计", en: "Cognitive Audit", scene: "心智",
        desc: "用卡尼曼系统 1 / 系统 2 框架，定期审计你的决策是否被直觉偏见劫持——确认偏误、锚定效应、损失厌恶。",
        detail: ["列出近 3 个重大决定，标注哪些是「系统 1 快思考」的产物", "为每个决定补一份「反方论据清单」，强制逆向思考", "建立「延迟 24 小时再下注」的硬性冷却规则"] },
      { icon: "⛓️", title: "因果律", en: "First Principles", scene: "决策",
        desc: "马斯克式第一性原理：砍掉一切经验类比，直接基于物理与经济底牌推演因果链，而非套用别人走过的路。",
        detail: ["把「别人都这么做」的所有假设单独标红、逐一推翻", "追问：去掉行业惯例后，这件事的最小可行单元是什么", "用单元经济（Unit Economics）验证能否独立存活"] },
      { icon: "🔄", title: "系统反馈", en: "System Feedback", scene: "决策",
        desc: "把事业与人生当成反馈系统：识别增强回路与调节回路，避免线性外推的致命错觉。",
        detail: ["画出你的核心增强回路（投入 → 产出 → 再投入）", "找出系统中被忽略的时间延迟与滞后指标", "为关键回路设置领先指标而非只看结果"] },
      { icon: "📜", title: "历史博弈", en: "Historical Game", scene: "投资",
        desc: "《资治通鉴》式案例库：在他人已付过代价的史实中预演你的决策，借势与风控双修。",
        detail: ["为每个重大决策找 1 个可对照的历史案例", "追问：我的「智伯陷阱」（杠杆过载）藏在哪里", "建立「事前剖析 Pre-mortem」复盘习惯"] },
      { icon: "💰", title: "复利杠杆", en: "Compounding Leverage", scene: "创业",
        desc: "Naval 式零边际成本杠杆：用代码与媒体放大认知资产，让正确的决策产生非线性回报。",
        detail: ["把一次性劳动转化为可复用数字资产（内容 / 代码 / SOP）", "清晰区分线性收入与复利资产", "在优势赛道上持续下注，让时间成为盟友"] }
    ]
  };

  var STYLE = [
    ":host{display:block;max-width:1100px;margin:0 auto;",
    "  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;",
    "  --bg:#020617;--panel:#0b1120;--border:#1e293b;--gold:#f59e0b;--gold-soft:#fbbf24;",
    "  --text:#e8e6e1;--muted:#94a3b8;}",
    "*{box-sizing:border-box;margin:0;padding:0;}",
    ".wrap{padding:8px 4px;}",
    ".head{display:flex;align-items:baseline;gap:10px;margin-bottom:14px;flex-wrap:wrap;}",
    ".head h2{color:var(--gold-soft);font-size:18px;font-weight:700;letter-spacing:.04em;}",
    ".head .en{color:var(--muted);font-size:12px;letter-spacing:.1em;text-transform:uppercase;}",
    ".filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}",
    ".chip{font-size:12.5px;color:var(--muted);border:1px solid var(--border);background:transparent;",
    "  border-radius:999px;padding:6px 14px;cursor:pointer;transition:all .15s;}",
    ".chip:hover{border-color:rgba(245,158,11,.5);color:var(--text);}",
    ".chip.on{border-color:var(--gold);background:rgba(245,158,11,.14);color:var(--gold-soft);font-weight:600;}",
    ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;}",
    ".card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:16px;",
    "  cursor:pointer;transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease;}",
    ".card:hover{border-color:rgba(245,158,11,.4);transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,0,0,.35);}",
    ".card.open{border-color:var(--gold);}",
    ".top{display:flex;align-items:center;gap:10px;}",
    ".ic{font-size:22px;line-height:1;}",
    ".t{font-size:15px;font-weight:700;color:var(--text);}",
    ".en{font-size:10px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-top:2px;}",
    ".desc{color:var(--muted);font-size:12.5px;line-height:1.65;margin-top:10px;}",
    ".detail{overflow:hidden;max-height:0;opacity:0;transition:max-height .25s ease,opacity .2s ease,margin .2s ease;}",
    ".card.open .detail{max-height:600px;opacity:1;margin-top:12px;}",
    ".detail ol{list-style:none;counter-reset:step;}",
    ".detail li{counter-increment:step;position:relative;padding-left:22px;color:var(--text);font-size:12.5px;",
    "  line-height:1.6;margin-bottom:8px;}",
    ".detail li::before{content:counter(step);position:absolute;left:0;top:0;width:16px;height:16px;",
    "  border-radius:50%;background:rgba(245,158,11,.15);color:var(--gold-soft);font-size:10px;",
    "  display:flex;align-items:center;justify-content:center;font-weight:700;}",
    ".lk{display:inline-block;margin-top:10px;color:var(--gold-soft);font-size:12.5px;font-weight:600;",
    "  text-decoration:none;border:1px solid rgba(245,158,11,.4);border-radius:8px;padding:6px 12px;}",
    ".lk:hover{background:rgba(245,158,11,.12);}",
    ".chev{margin-left:auto;color:var(--muted);font-size:12px;transition:transform .2s ease;}",
    ".card.open .chev{transform:rotate(180deg);color:var(--gold-soft);}",
    ".loading,.error{padding:30px;text-align:center;color:var(--muted);font-size:13px;}",
    ".error{color:#fca5a5;}"
  ].join("");

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function MentalModelLatticework() {
    var self = Reflect.construct(HTMLElement, [], MentalModelLatticework);
    return self;
  }
  MentalModelLatticework.prototype = Object.create(HTMLElement.prototype);

  MentalModelLatticework.prototype.connectedCallback = function () {
    var src = this.getAttribute("src");
    var root = this.attachShadow({ mode: "open" });
    root.innerHTML = '<style>' + STYLE + '</style><div class="loading">载入思维模型网格中…</div>';
    var self = this;
    if (!src) { render(root, FALLBACK); return; }
    fetch(src).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) { render(root, data && data.grids ? data : FALLBACK); })
      .catch(function (err) {
        var el = root.querySelector(".loading");
        el.className = "error";
        el.textContent = "载入失败：" + err.message + "（将回退内置网格）";
        render(root, FALLBACK);
      });
  };

  function render(root, data) {
    var grids = data.grids || [];
    var scenes = data.scenes && data.scenes.length > 1 ? data.scenes : null;
    var head =
      '<div class="head"><h2>' + esc(data.title || "思维模型网格") + '</h2>' +
      '<span class="en">' + esc(data.en || "Mental Model Latticework") + '</span></div>';
    var filters = scenes
      ? '<div class="filters">' + scenes.map(function (s, i) {
          return '<button class="chip' + (i === 0 ? " on" : "") + '" data-scene="' + esc(s) + '">' + esc(s) + '</button>';
        }).join("") + '</div>'
      : '';
    root.innerHTML = '<style>' + STYLE + '</style><div class="wrap">' + head + filters + '<div class="grid"></div></div>';

    var grid = root.querySelector(".grid");
    grids.forEach(function (g) {
      var card = document.createElement("div");
      card.className = "card";
      card.setAttribute("data-scene", esc(g.scene || ""));
      var linkHTML = g.link
        ? '<a class="lk" href="' + esc(g.link) + '" target="_blank" rel="noopener">📖 阅读全文 →</a>'
        : '';
      card.innerHTML =
        '<div class="top"><span class="ic">' + esc(g.icon || "🔹") + '</span>' +
        '<div><div class="t">' + esc(g.title) + '</div>' + (g.en ? '<div class="en">' + esc(g.en) + '</div>' : '') + '</div>' +
        '<span class="chev">▾</span></div>' +
        '<div class="desc">' + esc(g.desc) + '</div>' +
        '<div class="detail"><ol>' + (g.detail || []).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join("") +
        '</ol>' + linkHTML + '</div>';
      card.addEventListener("click", function (e) {
        if (e.target && e.target.closest(".lk")) return; // 点链接不触发展开
        card.classList.toggle("open");
      });
      grid.appendChild(card);
    });

    if (scenes) {
      var chips = root.querySelectorAll(".chip");
      chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          chips.forEach(function (c) { c.classList.remove("on"); });
          chip.classList.add("on");
          var scene = chip.getAttribute("data-scene");
          root.querySelectorAll(".card").forEach(function (card) {
            var s = card.getAttribute("data-scene");
            card.style.display = (scene === "全部" || !scene || s === scene) ? "" : "none";
          });
        });
      });
    }
  }

  customElements.define("mental-model-latticework", MentalModelLatticework);
})();
