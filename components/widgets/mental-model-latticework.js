/**
 * <mental-model-latticework> — Colin 智库 · 全模式思维模型网格 v4
 * ====================================================================
 * Web Component + Shadow DOM，零依赖、零编译、零样式污染。
 * 自动识别数据源并切换渲染模式：
 *   - data.models (新 schema: definition/pain_point/case_study/methodology/tier/is_pro)
 *        → MODELS·v4：4 大痛点下拉诊所 + L1/L2/L3 Tab + 搜索 + 5 要素卡片 + 毛玻璃付费墙
 *   - data.models (旧 schema: desc/principle/action/level/domain) → MODELS·legacy
 *   - data.principles           → PRINCIPLES：3 大 Tag 极速筛选 + 卡片折叠
 *   - data.books                → BOOKS：分类胶囊 + 双语图书网格
 *   - data.grids                → LEGACY：场景胶囊 + 卡片
 * 含异步 fetch 与 Fallback 容错，防白屏。
 *
 * 用法：
 *   <mental-model-latticework src="data/mental-models-200.json"></mental-model-latticework>
 */
(function () {
  "use strict";
  if (customElements.get("mental-model-latticework")) return;

  var STYLE = [
    ":host{display:block;max-width:1180px;margin:0 auto;",
    "  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;",
    "  --bg:#020617;--panel:#0b1120;--panel2:#111827;--border:#1e293b;--gold:#f59e0b;--gold-soft:#fbbf24;",
    "  --text:#e8e6e1;--muted:#94a3b8;--chip:#1e293b;}",
    "*{box-sizing:border-box;margin:0;padding:0;}",
    ".loading,.error{padding:40px;text-align:center;color:var(--muted);font-size:14px;}",
    ".error{color:#fba5a5;}",
    ".wrap{background:linear-gradient(160deg,#0b1120,#111827);border:1px solid rgba(245,158,11,.35);border-radius:20px;padding:26px;box-shadow:0 24px 60px rgba(0,0,0,.4);}",
    ".head{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;margin-bottom:6px;}",
    ".head h2{font-size:22px;font-weight:800;color:var(--text);}",
    ".head .en{font-size:12px;color:var(--gold-soft);letter-spacing:.06em;}",
    ".sub{font-size:13px;color:var(--muted);margin-bottom:16px;}",
    /* 三级 Tab */
    ".tabs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;}",
    ".tab{cursor:pointer;border:1px solid var(--border);background:var(--chip);color:var(--muted);",
    "  padding:9px 16px;border-radius:999px;font-size:13px;font-weight:700;transition:.15s;user-select:none;}",
    ".tab .ic{margin-right:6px;}",
    ".tab.on{color:#020617;background:var(--gold);border-color:var(--gold);}",
    ".tab:hover{color:var(--text);}",
    ".tab.on:hover{color:#020617;}",
    ".tab .rng{opacity:.7;font-weight:500;font-size:11px;margin-left:5px;}",
    /* 搜索与胶囊 */
    ".bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px;}",
    ".search{flex:1;min-width:200px;display:flex;align-items:center;gap:8px;background:var(--panel2);",
    "  border:1px solid var(--border);border-radius:10px;padding:9px 12px;}",
    ".search input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:13px;}",
    ".search input::placeholder{color:#64748b;}",
    ".pills{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;}",
    ".chip{cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--muted);",
    "  padding:6px 12px;border-radius:999px;font-size:12px;transition:.15s;user-select:none;}",
    ".chip.on{color:var(--gold-soft);border-color:var(--gold);background:rgba(245,158,11,.1);}",
    ".chip:hover{color:var(--text);}",
    /* 网格 */
    ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}",
    ".card{background:var(--panel2);border:1px solid var(--border);border-radius:14px;padding:16px;cursor:pointer;transition:.18s;}",
    ".card:hover{border-color:var(--gold);transform:translateY(-2px);}",
    ".card.open{border-color:var(--gold);}",
    ".top{display:flex;align-items:center;gap:10px;}",
    ".top>div:first-child{flex:1;min-width:0;}",
    ".top .tt{font-size:15.5px;font-weight:700;color:var(--text);line-height:1.4;}",
    ".top .en{font-size:11px;color:var(--muted);margin-top:2px;}",
    ".badge{margin-left:6px;font-size:10px;color:var(--gold-soft);border:1px solid rgba(245,158,11,.3);",
    "  padding:3px 8px;border-radius:999px;white-space:nowrap;}",
    ".badge.pro{color:#020617;background:var(--gold);border-color:var(--gold);font-weight:800;}",
    ".desc{font-size:13px;color:var(--muted);line-height:1.65;margin-top:10px;}",
    ".meta{font-size:11px;color:#64748b;margin-top:8px;}",
    /* 展开区（平滑） */
    ".detail{max-height:0;overflow:hidden;transition:max-height .4s ease;}",
    ".card.open .detail{max-height:2400px;}",
    ".block{margin-top:12px;border-top:1px dashed var(--border);padding-top:11px;}",
    ".bh{font-size:11px;font-weight:700;color:var(--gold-soft);letter-spacing:.08em;margin-bottom:5px;}",
    ".bt{font-size:13px;color:var(--text);line-height:1.7;}",
    ".ba{font-size:12.5px;color:var(--muted);line-height:1.7;background:rgba(245,158,11,.07);",
    "  border-left:3px solid var(--gold);border-radius:8px;padding:9px 11px;margin-top:10px;}",
    ".chev{transition:transform .25s;color:var(--muted);font-size:12px;}",
    ".card.open .chev{transform:rotate(180deg);}",
    /* 图书模式 */
    ".book .at{font-size:13px;color:var(--muted);line-height:1.7;margin-top:6px;}",
    ".book .au{font-size:12px;color:var(--gold-soft);margin-top:8px;}",
    ".count{font-size:12px;color:#64748b;margin-left:auto;}",
    ".ba b{color:var(--gold-soft);}",
    /* ===== v4 新 schema 专属 ===== */
    ".selwrap{position:relative;max-width:460px;margin-bottom:16px;}",
    ".selwrap::after{content:'▾';position:absolute;right:15px;top:50%;transform:translateY(-50%);",
    "  color:var(--gold-soft);pointer-events:none;font-size:13px;}",
    "select.theme{width:100%;appearance:none;-webkit-appearance:none;background:linear-gradient(135deg,#0b1120,#1a2438);",
    "  border:1px solid var(--gold);border-radius:12px;color:var(--text);font-size:14px;font-weight:600;",
    "  padding:13px 40px 13px 16px;cursor:pointer;box-shadow:0 6px 22px rgba(245,158,11,.14);}",
    "select.theme:focus{outline:none;border-color:var(--gold-soft);box-shadow:0 0 0 3px rgba(245,158,11,.22);}",
    "select.theme option{background:#0b1120;color:var(--text);}",
    ".no{color:var(--gold-soft);font-weight:800;margin-right:3px;}",
    ".pain{font-size:12.5px;color:var(--muted);line-height:1.6;margin-top:10px;}",
    ".pain b{color:var(--gold-soft);}",
    ".lockwrap{position:relative;margin-top:12px;border-radius:10px;overflow:hidden;}",
    ".lockwrap .lockbody{transition:filter .3s ease;}",
    ".lockwrap.is-pro .lockbody{filter:blur(6px);opacity:.45;user-select:none;pointer-events:none;}",
    ".lock-overlay{display:none;position:absolute;inset:0;align-items:flex-end;justify-content:center;padding:16px;",
    "  background:linear-gradient(180deg,rgba(2,6,23,0) 0%,rgba(2,6,23,.72) 48%,rgba(2,6,23,.97) 100%);}",
    ".lockwrap.is-pro .lock-overlay{display:flex;}",
    ".unlock-btn{cursor:pointer;border:none;border-radius:999px;background:linear-gradient(135deg,var(--gold),#fbbf24);",
    "  color:#020617;font-weight:800;font-size:12.5px;padding:11px 16px;box-shadow:0 6px 18px rgba(245,158,11,.45);",
    "  display:inline-flex;align-items:center;gap:5px;text-align:center;line-height:1.3;}",
    /* 解锁弹窗 */
    ".pw-modal{display:none;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center;",
    "  background:rgba(2,6,23,.8);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);}",
    ".pw-card{background:linear-gradient(160deg,#0b1120,#1a2438);border:1px solid var(--gold);border-radius:18px;",
    "  padding:28px 26px;max-width:360px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.6);}",
    ".pw-card .pl{font-size:42px;}",
    ".pw-card h3{color:var(--gold-soft);font-size:17px;margin:10px 0 8px;}",
    ".pw-card p{color:var(--muted);font-size:13px;line-height:1.7;margin-bottom:14px;}",
    ".pw-price{color:var(--gold);font-size:32px;font-weight:800;margin-bottom:16px;}",
    ".pw-cta{background:linear-gradient(135deg,var(--gold),#fbbf24);color:#020617;border:none;border-radius:999px;",
    "  font-weight:800;font-size:15px;padding:12px 26px;cursor:pointer;box-shadow:0 8px 22px rgba(245,158,11,.4);}",
    ".pw-close{margin-top:12px;background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:underline;}",
    "@media(max-width:600px){.grid{grid-template-columns:1fr;}}"
  ].join("");

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* 4 大痛点诊所主题 → 分类映射（覆盖全部 21 个 category） */
  var THEMES = [
    { key: "eff", icon: "⚡", label: "个人效率与执行力", cats: ["效率与杠杆", "学习与理解", "执行闭环", "目标管理", "沟通与领导", "思维极简"] },
    { key: "risk", icon: "🧠", label: "重大决策与风险防御", cats: ["决策风控", "风险防御", "信息迷雾决策"] },
    { key: "biz", icon: "🎯", label: "商业突破与定价博弈", cats: ["人性弱点利用", "定价的高级艺术", "护城河构建", "商业陷阱识别", "品牌传播与病毒", "博弈与利润收割"] },
    { key: "sys", icon: "🔮", label: "终极算法与系统演化", cats: ["现实非连续性", "系统崩溃临界点", "存在与宇宙秩序", "终极算法", "系统演化", "本质思考"] }
  ];
  var THEME_CATS = {};
  THEMES.forEach(function (t) { THEME_CATS[t.key] = t.cats; });

  // 极简回退数据（仅防止白屏，旧 schema）
  var FALLBACK = {
    title: "思维模型", en: "Mental Models", subtitle: "",
    levels: [{ key: "L1", label: "通用", icon: "🔹", range: "", desc: "" }],
    domains: ["通用"],
    models: [{ id: "x", no: "001", level: "L1", levelLabel: "通用", domain: "通用", icon: "🔹",
      title: "示例模型", en: "Example", desc: "网络异常，已载入内置示例。", principle: "——", action: "——", tags: ["通用"] }],
    decisionGrids: []
  };

  function Lattice() { return Reflect.construct(HTMLElement, [], Lattice); }
  Lattice.prototype = Object.create(HTMLElement.prototype);

  Lattice.prototype.connectedCallback = function () {
    var src = this.getAttribute("src") || "data/mental-models-200.json";
    var root = this.attachShadow({ mode: "open" });
    root.innerHTML = '<style>' + STYLE + '</style><div class="loading">载入思维模型网格中…</div>';
    var self = this;
    fetch(src).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) { self._render(root, data); })
      .catch(function (err) {
        self._render(root, FALLBACK);
        var l = root.querySelector(".loading"); if (l) { l.className = "error"; l.textContent = "载入失败，已用内置示例：" + err.message; }
      });
  };

  Lattice.prototype._render = function (root, data) {
    if (data.models) return renderModels(root, data);
    if (data.principles) return renderPrinciples(root, data);
    if (data.books) return renderBooks(root, data);
    if (data.grids) return renderLegacy(root, data);
    return renderModels(root, FALLBACK);
  };

  // ============ MODELS 模式（自动分发新/旧 schema） ============
  function renderModels(root, data) {
    var mods = data.models || [];
    var isNew = mods.length && ("definition" in mods[0]);
    if (isNew) return renderModelsNew(root, data, mods);
    return renderModelsOld(root, data, mods);
  }

  // ---- v4 新 schema：痛点诊所 + 毛玻璃付费墙 ----
  function renderModelsNew(root, data, mods) {
    var tiers = [];
    if (data.categories && data.categories.length && data.categories[0] && data.categories[0].tier) {
      tiers = data.categories.map(function (c) { return c.tier; });
    } else if (data.levels) {
      tiers = data.levels.map(function (l) { return l.label; });
    } else {
      var seen = {}; mods.forEach(function (m) { if (m.tier && !seen[m.tier]) { seen[m.tier] = 1; tiers.push(m.tier); } });
    }
    var tierEmoji = ["🟢", "🔵", "🟣"];
    var state = { tier: "", theme: "", q: "" };

    var tabsHtml = '<span class="tab on" data-tier="">🔓 全部模型</span>' + tiers.map(function (t, i) {
      return '<span class="tab" data-tier="' + esc(t) + '">' + (tierEmoji[i] || "") + ' ' + esc(t) + '</span>';
    }).join("");

    var selHtml = '<div class="selwrap"><select class="theme" id="theme">' +
      '<option value="">⚡🧠🎯🔮 全部分类痛点 · 先选一个你最痛的问题</option>' +
      THEMES.map(function (t) { return '<option value="' + t.key + '">' + t.icon + ' ' + t.label + '</option>'; }).join("") +
      '</select></div>';

    root.innerHTML = '<style>' + STYLE + '</style><div class="wrap">' +
      '<div class="head"><h2>' + esc(data.title || data.system_name || "200 大跨学科思维模型") + '</h2>' +
        (data.en ? '<span class="en">' + esc(data.en) + '</span>' : '') + '</div>' +
      '<div class="sub">' + esc(data.subtitle || "下拉选择你的痛点 → 直达匹配的跨学科思维模型 · 🟢 L1 免费公开，🔵🔴 L2/L3 含 Pro 专属案例与方法论") + '</div>' +
      selHtml +
      '<div class="tabs">' + tabsHtml + '</div>' +
      '<div class="bar"><div class="search">🔍<input type="text" placeholder="搜索模型 / 原理 / 痛点 / 案例…" /></div></div>' +
      '<div class="grid" id="grid"></div>' +
      '</div>';

    // 解锁弹窗（单例挂载到 shadow root）
    var modal = document.createElement("div");
    modal.className = "pw-modal";
    modal.innerHTML = '<div class="pw-card">' +
      '<div class="pl">🔒</div>' +
      '<h3>解锁 Colin 数字智库 · 全量案例与方法论</h3>' +
      '<p>本卡片的【真实商业操盘案例】与【3 步落地方法论】为 Pro 专属内容。一次解锁，全站 200 模型案例与方法论尽收囊中。</p>' +
      '<div class="pw-price">¥199</div>' +
      '<button class="pw-cta">立即解锁全量内容</button>' +
      '<div class="pw-close">暂不开通</div>' +
      '</div>';
    root.appendChild(modal);

    var gridEl = root.querySelector("#grid");

    function cardNew(m) {
      var no = String(m.id).padStart(3, "0");
      var pro = !!m.is_pro;
      return '<div class="card' + (pro ? " pro" : "") + '" data-id="' + esc(m.id) + '">' +
        '<div class="top"><div><div class="tt"><span class="no">' + no + '</span> ' + esc(m.name) + '</div></div>' +
          '<span class="badge">' + esc(m.category) + '</span>' +
          (pro ? '<span class="badge pro">🔒 PRO</span>' : '') +
          '<span class="chev">▾</span></div>' +
        '<div class="pain">🏷️ <b>' + esc(m.category) + '</b> · 痛点：' + esc(m.pain_point) + '</div>' +
        '<div class="detail">' +
          '<div class="block"><div class="bh">💡 底层原理解释</div><div class="bt">' + esc(m.definition) + '</div></div>' +
          '<div class="lockwrap' + (pro ? " is-pro" : "") + '">' +
            '<div class="lockbody">' +
              '<div class="block"><div class="bh">📖 真实商业操盘案例</div><div class="bt">' + esc(m.case_study) + '</div></div>' +
              '<div class="block"><div class="bh">🛠️ 3 步落地方法论</div><div class="bt">' + esc(m.methodology) + '</div></div>' +
            '</div>' +
            (pro ? '<div class="lock-overlay"><button class="unlock-btn">🔒 解锁 Colin 数字智库全量案例与方法论 ￥199</button></div>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }

    function drawGrid() {
      var q = state.q.trim().toLowerCase();
      var list = mods.filter(function (m) {
        if (state.tier && m.tier !== state.tier) return false;
        if (state.theme && THEME_CATS[state.theme].indexOf(m.category) === -1) return false;
        if (q) {
          var hay = (m.name + " " + (m.category || "") + " " + (m.pain_point || "") + " " + (m.definition || "") + " " + (m.case_study || "") + " " + (m.methodology || "")).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
      gridEl.innerHTML = list.map(cardNew).join("") ||
        '<div class="desc" style="padding:24px;grid-column:1/-1">没有匹配的模型，换个痛点或关键词试试。</div>';
      gridEl.querySelectorAll(".card").forEach(function (c) {
        c.addEventListener("click", function (e) {
          if (e.target.closest(".lock-overlay")) return;
          c.classList.toggle("open");
        });
      });
    }

    root.querySelector("#theme").addEventListener("change", function (e) { state.theme = e.target.value; drawGrid(); });
    root.querySelectorAll(".tab").forEach(function (t) {
      t.addEventListener("click", function () {
        root.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("on"); });
        t.classList.add("on"); state.tier = t.getAttribute("data-tier"); drawGrid();
      });
    });
    root.querySelector(".search input").addEventListener("input", function (e) { state.q = e.target.value; drawGrid(); });
    root.addEventListener("click", function (e) {
      if (e.target.closest(".unlock-btn")) { modal.style.display = "flex"; return; }
      if (e.target.classList.contains("pw-close") || e.target === modal) { modal.style.display = "none"; }
    });

    drawGrid();
  }

  // ---- 旧 schema（兼容 / Fallback） ----
  function renderModelsOld(root, data) {
    var levels = data.levels || [];
    var domains = data.domains || [];
    var state = { level: levels[0] ? levels[0].key : null, domain: "全部", q: "" };

    root.innerHTML = '<style>' + STYLE + '</style><div class="wrap">' +
      '<div class="head"><h2>' + esc(data.title || "思维模型") + '</h2><span class="en">' + esc(data.en || "") + '</span></div>' +
      (data.subtitle ? '<div class="sub">' + esc(data.subtitle) + '</div>' : '') +
      (levels.length > 1 ? '<div class="tabs">' + levels.map(function (l, i) {
        return '<span class="tab' + (i === 0 ? " on" : "") + '" data-level="' + esc(l.key) + '"><span class="ic">' + esc(l.icon || "🔹") + '</span>' + esc(l.label) + '<span class="rng">' + esc(l.range || "") + '</span></span>';
      }).join("") + '</div>' : '') +
      '<div class="bar"><div class="search">🔍<input type="text" placeholder="搜索模型 / 英文 / 原理 / 行动…" /></div></div>' +
      '<div class="pills" id="pills"></div>' +
      '<div class="grid" id="grid"></div>' +
      '</div>';

    var pillsEl = root.querySelector("#pills");
    var gridEl = root.querySelector("#grid");

    function drawPills() {
      var p = ['<span class="chip' + (state.domain === "全部" ? " on" : "") + '" data-d="全部">全部</span>'];
      domains.forEach(function (d) {
        p.push('<span class="chip' + (state.domain === d ? " on" : "") + '" data-d="' + esc(d) + '">' + esc(d) + '</span>');
      });
      pillsEl.innerHTML = p.join("");
      pillsEl.querySelectorAll(".chip").forEach(function (c) {
        c.addEventListener("click", function () { state.domain = c.getAttribute("data-d"); drawPills(); drawGrid(); });
      });
    }

    function drawGrid() {
      var q = state.q.trim().toLowerCase();
      var list = (data.models || []).filter(function (m) {
        if (state.level && m.level !== state.level) return false;
        if (state.domain !== "全部" && m.domain !== state.domain) return false;
        if (q) {
          var hay = (m.title + " " + (m.en || "") + " " + (m.desc || "") + " " + (m.principle || "") + " " + (m.action || "") + " " + m.tags.join(" ")).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
      gridEl.innerHTML = list.map(function (m) {
        return '<div class="card" data-id="' + esc(m.id) + '">' +
          '<div class="top"><span class="ic">' + esc(m.icon || "🔹") + '</span><div><div class="tt">' + esc(m.title) + '</div><div class="en">' + esc(m.en || "") + '</div></div>' +
          '<span class="badge">' + esc(m.domain) + '</span><span class="chev" style="margin-left:6px">▾</span></div>' +
          '<div class="desc">' + esc(m.desc) + '</div>' +
          '<div class="detail"><div class="block"><div class="bh">核心原理拆解</div><div class="bt">' + esc(m.principle) + '</div></div>' +
          '<div class="ba"><b>微行动沙箱：</b>' + esc(m.action) + '</div></div></div>';
      }).join("") || '<div class="desc" style="padding:20px">没有匹配的模型，换个关键词试试。</div>';
      gridEl.querySelectorAll(".card").forEach(function (c) {
        c.addEventListener("click", function () { c.classList.toggle("open"); });
      });
    }

    root.querySelectorAll(".tab").forEach(function (t) {
      t.addEventListener("click", function () {
        root.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("on"); });
        t.classList.add("on"); state.level = t.getAttribute("data-level"); drawGrid();
      });
    });
    root.querySelector(".search input").addEventListener("input", function (e) { state.q = e.target.value; drawGrid(); });
    drawPills(); drawGrid();
  }

  // ============ PRINCIPLES 模式（thecolin） ============
  function renderPrinciples(root, data) {
    var cats = data.categories || [];
    var state = { cat: "all", q: "" };
    root.innerHTML = '<style>' + STYLE + '</style><div class="wrap">' +
      '<div class="head"><h2>' + esc(data.title || "原则系统") + '</h2><span class="en">' + esc(data.en || "") + '</span></div>' +
      (data.subtitle ? '<div class="sub">' + esc(data.subtitle) + '</div>' : '') +
      '<div class="bar"><div class="search">🔍<input type="text" placeholder="搜索原则 / 人物 / 行动…" /></div></div>' +
      '<div class="pills" id="pills"></div>' +
      '<div class="grid" id="grid"></div></div>';

    var pillsEl = root.querySelector("#pills"), gridEl = root.querySelector("#grid");
    function drawPills() {
      var p = ['<span class="chip' + (state.cat === "all" ? " on" : "") + '" data-c="all">全部</span>'];
      cats.forEach(function (c) { p.push('<span class="chip' + (state.cat === c.id ? " on" : "") + '" data-c="' + esc(c.id) + '">' + esc(c.name) + '</span>'); });
      pillsEl.innerHTML = p.join("");
      pillsEl.querySelectorAll(".chip").forEach(function (x) { x.addEventListener("click", function () { state.cat = x.getAttribute("data-c"); drawPills(); drawGrid(); }); });
    }
    function drawGrid() {
      var q = state.q.trim().toLowerCase();
      var list = (data.principles || []).filter(function (p) {
        if (state.cat !== "all" && p.category !== state.cat) return false;
        if (q) { var hay = (p.name + " " + (p.en || "") + " " + (p.author || "") + " " + (p.quote || "") + " " + (p.action || "")).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
        return true;
      });
      gridEl.innerHTML = list.map(function (p) {
        return '<div class="card" data-id="' + esc(p.id) + '">' +
          '<div class="top"><span class="ic">📜</span><div><div class="tt">' + esc(p.name) + '</div><div class="en">' + esc(p.en || "") + '</div></div>' +
          '<span class="badge">' + esc(p.tag || p.category) + '</span><span class="chev" style="margin-left:6px">▾</span></div>' +
          '<div class="desc"><b>' + esc(p.author || "") + '</b>：' + esc(p.quote) + '</div>' +
          '<div class="detail"><div class="ba"><b>微行动：</b>' + esc(p.action) + '</div></div></div>';
      }).join("") || '<div class="desc" style="padding:20px">没有匹配的原则。</div>';
      gridEl.querySelectorAll(".card").forEach(function (c) { c.addEventListener("click", function () { c.classList.toggle("open"); }); });
    }
    root.querySelector(".search input").addEventListener("input", function (e) { state.q = e.target.value; drawGrid(); });
    drawPills(); drawGrid();
  }

  // ============ BOOKS 模式（readswithcolin 图书网格） ============
  function renderBooks(root, data) {
    var cats = data.categories || [];
    var state = { cat: "全部", q: "" };
    root.innerHTML = '<style>' + STYLE + '</style><div class="wrap">' +
      '<div class="head"><h2>' + esc(data.title || "图书网格") + '</h2><span class="en">' + esc(data.en || "") + '</span>' +
      '<span class="count">' + (data.total_books || (data.books ? data.books.length : 0)) + ' 本</span></div>' +
      (data.subtitle ? '<div class="sub">' + esc(data.subtitle) + '</div>' : '') +
      '<div class="bar"><div class="search">🔍<input type="text" placeholder="搜索书名 / 作者 / 摘要…" /></div></div>' +
      '<div class="pills" id="pills"></div><div class="grid" id="grid"></div></div>';
    var pillsEl = root.querySelector("#pills"), gridEl = root.querySelector("#grid");
    function drawPills() {
      var p = ['<span class="chip' + (state.cat === "全部" ? " on" : "") + '" data-c="全部">全部</span>'];
      cats.forEach(function (c) { p.push('<span class="chip' + (state.cat === c ? " on" : "") + '" data-c="' + esc(c) + '">' + esc(c) + '</span>'); });
      pillsEl.innerHTML = p.join("");
      pillsEl.querySelectorAll(".chip").forEach(function (x) { x.addEventListener("click", function () { state.cat = x.getAttribute("data-c"); drawPills(); drawGrid(); }); });
    }
    function drawGrid() {
      var q = state.q.trim().toLowerCase();
      var list = (data.books || []).filter(function (b) {
        if (state.cat !== "全部" && b.category !== state.cat) return false;
        if (q) { var hay = (b.title + " " + (b.en || "") + " " + (b.author || "") + " " + (b.summary || "")).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
        return true;
      });
      gridEl.innerHTML = list.map(function (b) {
        return '<div class="card book"><div class="top"><span class="ic">📖</span><div><div class="tt">' + esc(b.title) + '</div><div class="en">' + esc(b.en || "") + '</div></div>' +
          '<span class="badge">' + esc(b.category) + '</span></div>' +
          '<div class="at">' + esc(b.summary || "") + '</div><div class="au">✍️ ' + esc(b.author || "") + '</div></div>';
      }).join("") || '<div class="desc" style="padding:20px">没有匹配的图书。</div>';
    }
    root.querySelector(".search input").addEventListener("input", function (e) { state.q = e.target.value; drawGrid(); });
    drawPills(); drawGrid();
  }

  // ============ LEGACY 模式 ============
  function renderLegacy(root, data) {
    var scenes = data.scenes || [];
    var state = { scene: scenes[0] || "全部", q: "" };
    root.innerHTML = '<style>' + STYLE + '</style><div class="wrap">' +
      '<div class="head"><h2>' + esc(data.title || "网格") + '</h2><span class="en">' + esc(data.en || "") + '</span></div>' +
      '<div class="pills" id="pills"></div><div class="grid" id="grid"></div></div>';
    var pillsEl = root.querySelector("#pills"), gridEl = root.querySelector("#grid");
    function drawPills() {
      var all = ["全部"].concat(scenes);
      pillsEl.innerHTML = all.map(function (s) { return '<span class="chip' + (state.scene === s ? " on" : "") + '" data-s="' + esc(s) + '">' + esc(s) + '</span>'; }).join("");
      pillsEl.querySelectorAll(".chip").forEach(function (x) { x.addEventListener("click", function () { state.scene = x.getAttribute("data-s"); drawPills(); drawGrid(); }); });
    }
    function drawGrid() {
      var list = (data.grids || []).filter(function (g) { return state.scene === "全部" || g.scene === state.scene; });
      gridEl.innerHTML = list.map(function (g) {
        var detail = (g.detail || []).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join("");
        return '<div class="card"><div class="top"><span class="ic">' + esc(g.icon || "🔹") + '</span><div><div class="tt">' + esc(g.title) + '</div><div class="en">' + esc(g.en || "") + '</div></div></div>' +
          '<div class="desc">' + esc(g.desc) + '</div>' + (detail ? '<div class="detail" style="max-height:520px"><div class="block"><ol class="bt" style="padding-left:18px">' + detail + '</ol></div></div>' : '') + '</div>';
      }).join("") || '<div class="desc" style="padding:20px">暂无内容。</div>';
    }
    drawPills(); drawGrid();
  }

  customElements.define("mental-model-latticework", Lattice);
})();
