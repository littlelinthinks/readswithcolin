/**
 * <mental-model-latticework> — Colin 智库 · 全模式思维模型网格 v5
 * ====================================================================
 * Web Component + Shadow DOM，零依赖、零编译、零样式污染。
 *
 * 自动识别数据源并切换渲染模式：
 *   - data.models (v7 tiered: definition/pain_point/case_study/methodology/tier/is_pro/price)
 *        → MODELS·v7：痛点下拉诊所 + L1/L2/L3 Tab + 搜索 + 5 要素卡片
 *        + 阶梯付费墙（L2 ￥29.9 / L3 ￥49.9）→ 暗黑金支付 Modal + 模拟解锁
 *   - data.models (旧 schema)              → MODELS·legacy
 *   - data.principles (v3: person/quote/tags/action_checklist) → PRINCIPLES：点击弹 Modal
 *   - data.books (v3: insights/models_linked/links)             → BOOKS：点击滑出右侧抽屉
 *   - data.grids                          → LEGACY
 *
 * 修复：
 *   ✅ 路径容错：new URL(src, document.baseURI)，二级页/部署子路径 100% 可读，无白屏
 *   ✅ 付费墙：真实点击事件 → 支付 Modal + 调试模拟解锁（localStorage 解密遮罩）
 *   ✅ 死卡片：图书/原则/模型卡片全部绑定交互
 * ✅ 防白屏：Loading 超时回退内置示例，绝不卡死
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
    ".tabs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;}",
    ".tab{cursor:pointer;border:1px solid var(--border);background:var(--chip);color:var(--muted);",
    "  padding:9px 16px;border-radius:999px;font-size:13px;font-weight:700;transition:.15s;user-select:none;}",
    ".tab .ic{margin-right:6px;}",
    ".tab.on{color:#020617;background:var(--gold);border-color:var(--gold);}",
    ".tab:hover{color:var(--text);}.tab.on:hover{color:#020617;}",
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
    ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:14px;}",
    ".grid>*{min-width:0;}",
    ".card{background:var(--panel2);border:1px solid var(--border);border-radius:14px;padding:16px;cursor:pointer;transition:.18s;min-width:0;overflow-wrap:break-word;}",
    ".card .pain,.card .desc,.card .block,.card .detail,.card .bh,.card .bt,.card .meta,.card .tt,.card .en{overflow-wrap:anywhere;word-break:break-word;}",
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
    ".detail{max-height:0;overflow:hidden;transition:max-height .4s ease;}",
    ".card.open .detail{max-height:2600px;}",
    ".block{margin-top:12px;border-top:1px dashed var(--border);padding-top:11px;}",
    ".bh{font-size:11px;font-weight:700;color:var(--gold-soft);letter-spacing:.08em;margin-bottom:5px;}",
    ".bt{font-size:13px;color:var(--text);line-height:1.7;}",
    ".ba{font-size:12.5px;color:var(--muted);line-height:1.7;background:rgba(245,158,11,.07);",
    "  border-left:3px solid var(--gold);border-radius:8px;padding:9px 11px;margin-top:10px;}",
    ".chev{transition:transform .25s;color:var(--muted);font-size:12px;}",
    ".card.open .chev{transform:rotate(180deg);}",
    ".book .at{font-size:13px;color:var(--muted);line-height:1.7;margin-top:6px;}",
    ".book .au{font-size:12px;color:var(--gold-soft);margin-top:8px;}",
    ".count{font-size:12px;color:#64748b;margin-left:auto;}",
    ".ba b{color:var(--gold-soft);}",
    /* v7 痛点下拉 */
    ".selwrap{position:relative;max-width:520px;margin-bottom:16px;}",
    ".selwrap::after{content:'▾';position:absolute;right:15px;top:50%;transform:translateY(-50%);color:var(--gold-soft);pointer-events:none;font-size:13px;}",
    "select.theme{width:100%;appearance:none;-webkit-appearance:none;background:linear-gradient(135deg,#0b1120,#1a2438);",
    "  border:1px solid var(--gold);border-radius:12px;color:var(--text);font-size:14px;font-weight:600;",
    "  padding:13px 40px 13px 16px;cursor:pointer;box-shadow:0 6px 22px rgba(245,158,11,.14);}",
    "select.theme:focus{outline:none;border-color:var(--gold-soft);box-shadow:0 0 0 3px rgba(245,158,11,.22);}",
    "select.theme option{background:#0b1120;color:var(--text);}",
    ".no{color:var(--gold-soft);font-weight:800;margin-right:3px;}",
    ".pain{font-size:12.5px;color:var(--muted);line-height:1.6;margin-top:10px;}",
    ".pain b{color:var(--gold-soft);}",
    /* 毛玻璃遮罩 + 解锁按钮 */
    ".lockwrap{position:relative;margin-top:12px;border-radius:10px;overflow:hidden;}",
    ".lockwrap .lockbody{transition:filter .3s ease;}",
    ".lockwrap.is-pro .lockbody{filter:blur(6px);opacity:.4;user-select:none;pointer-events:none;}",
    ".lock-overlay{display:none;position:absolute;inset:0;align-items:flex-end;justify-content:center;padding:16px;",
    "  background:linear-gradient(180deg,rgba(2,6,23,0) 0%,rgba(2,6,23,.72) 48%,rgba(2,6,23,.97) 100%);}",
    ".lockwrap.is-pro .lock-overlay{display:flex;}",
    ".unlock-btn{cursor:pointer;border:none;border-radius:999px;background:linear-gradient(135deg,var(--gold),#fbbf24);",
    "  color:#020617;font-weight:800;font-size:12.5px;padding:11px 16px;box-shadow:0 6px 18px rgba(245,158,11,.45);",
    "  display:inline-flex;align-items:center;gap:5px;text-align:center;line-height:1.3;}",
    /* 通用暗黑金 Modal */
    ".modal{display:none;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center;padding:16px;",
    "  background:rgba(2,6,23,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}",
    ".mcard{background:linear-gradient(160deg,#0b1120,#1a2438);border:1px solid var(--gold);border-radius:18px;",
    "  padding:26px 24px;max-width:380px;width:100%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.6);position:relative;}",
    ".mclose{position:absolute;top:10px;right:14px;background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;}",
    ".mcard .pl{font-size:42px;}",
    ".mcard h3{color:var(--gold-soft);font-size:17px;margin:8px 0;}",
    ".mcard p{color:var(--muted);font-size:13px;line-height:1.7;margin-bottom:12px;}",
    ".mprice{color:var(--gold);font-size:34px;font-weight:800;margin-bottom:6px;}",
    ".mqr{width:140px;height:140px;object-fit:cover;border-radius:12px;background:#fff;margin:8px auto 12px;border:3px solid var(--gold);}",
    ".mcta{background:linear-gradient(135deg,var(--gold),#fbbf24);color:#020617;border:none;border-radius:999px;",
    "  font-weight:800;font-size:15px;padding:12px 24px;cursor:pointer;box-shadow:0 8px 22px rgba(245,158,11,.4);}",
    ".mdebug{margin-top:10px;background:rgba(245,158,11,.12);border:1px dashed var(--gold);color:var(--gold-soft);",
    "  border-radius:10px;font-size:12px;padding:9px 12px;cursor:pointer;width:100%;}",
    ".mtags{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:10px 0;}",
    ".mtag{font-size:11px;color:var(--gold-soft);border:1px solid rgba(245,158,11,.3);border-radius:999px;padding:3px 9px;}",
    ".mactions{text-align:left;margin-top:8px;}",
    ".mactions li{font-size:13px;color:var(--text);line-height:1.7;margin-left:18px;}",
    ".mlink{display:inline-block;margin:6px 8px 0 0;color:var(--gold-soft);font-size:12px;text-decoration:underline;}",
    /* 右侧抽屉 */
    ".drawer{position:fixed;top:0;right:0;height:100%;width:min(420px,90vw);z-index:9998;transform:translateX(100%);",
    "  transition:transform .32s cubic-bezier(.4,0,.2,1);background:linear-gradient(160deg,#0b1120,#111827);",
    "  border-left:1px solid var(--gold);box-shadow:-20px 0 60px rgba(0,0,0,.5);overflow-y:auto;}",
    ".drawer.open{transform:translateX(0);}",
    ".drawer .dpad{padding:22px;}",
    ".drawer .dclose{position:absolute;top:12px;right:16px;background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer;}",
    ".drawer h3{color:var(--text);font-size:19px;font-weight:800;margin-bottom:4px;}",
    ".drawer .dau{color:var(--gold-soft);font-size:13px;margin-bottom:6px;}",
    ".drawer .dsum{color:var(--muted);font-size:13px;line-height:1.7;margin:10px 0;}",
    ".drawer .dsec{margin-top:14px;border-top:1px dashed var(--border);padding-top:11px;}",
    ".drawer .dsec .bh{font-size:11px;font-weight:700;color:var(--gold-soft);letter-spacing:.08em;margin-bottom:6px;}",
    ".drawer .dsec li{font-size:13px;color:var(--text);line-height:1.7;margin-left:18px;}",
    ".backdrop{display:none;position:fixed;inset:0;z-index:9997;background:rgba(2,6,23,.6);}",
    ".backdrop.show{display:block;}",
    "@media(max-width:600px){.grid{grid-template-columns:1fr;}}"
  ].join("");

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function tierKey(tier) {
    if (/L3/.test(tier || "")) return "L3";
    if (/L2/.test(tier || "")) return "L2";
    if (/L1/.test(tier || "")) return "L1";
    return String(tier || "");
  }
  function unlockedTiers() {
    try { var v = localStorage.getItem("colin_unlocked_tier"); return v ? v.split(",") : []; }
    catch (e) { return []; }
  }
  function unlockTier(tk) {
    try {
      var s = unlockedTiers(); if (s.indexOf(tk) === -1) s.push(tk);
      localStorage.setItem("colin_unlocked_tier", s.join(","));
    } catch (e) {}
  }
  function resolveUrl(src) {
    if (!src) return src;
    if (/^https?:\/\//.test(src)) return src;
    try { return new URL(src, document.baseURI).href; } catch (e) {}
    try { return new URL(src, location.href).href; } catch (e) { return src; }
  }

  /* 4 大痛点主题 → 分类映射（v7 全 14 类全覆盖） */
  var THEMES = [
    { key: "eff", icon: "⚡", label: "个人效率与执行力", cats: ["效率与成果", "效率与杠杆", "学习与认知", "执行与迭代", "目标管理", "领导与表达"] },
    { key: "risk", icon: "🧠", label: "重大决策与风险防御", cats: ["风险防御", "极简决策", "本质思考"] },
    { key: "biz", icon: "🎯", label: "商业突破与定价博弈", cats: ["品牌与定价艺术", "商业博弈与收割"] },
    { key: "sys", icon: "🔮", label: "终极算法与系统演化", cats: ["终极算法与系统演化", "系统防御", "系统演化"] }
  ];
  var THEME_CATS = {};
  THEMES.forEach(function (t) { THEME_CATS[t.key] = t.cats; });

  var FALLBACK = {
    title: "思维模型", en: "Mental Models", subtitle: "",
    models: [{ id: "x", no: "001", tier: "L1 职场精英包", category: "通用", name: "示例模型", definition: "网络异常，已载入内置示例，不影响浏览。", pain_point: "——", case_study: "——", methodology: "——", is_pro: false, price: 0, price_label: "免费公开" }]
  };

  function Lattice() { return Reflect.construct(HTMLElement, [], Lattice); }
  Lattice.prototype = Object.create(HTMLElement.prototype);

  Lattice.prototype.connectedCallback = function () {
    var src = this.getAttribute("src") || "data/mental-models-200.json";
    var root = this.attachShadow({ mode: "open" });
    root.innerHTML = '<style>' + STYLE + '</style><div class="loading">载入思维模型网格中…</div>';
    var self = this;
    var url = resolveUrl(src);
    fetch(url).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) { self._render(root, data); })
      .catch(function (err) {
        // 二次回退：尝试站点根目录绝对路径
        var name = src.split("/").pop();
        fetch("/data/" + name).then(function (r2) { if (!r2.ok) throw new Error("HTTP " + r2.status); return r2.json(); })
          .then(function (d2) { self._render(root, d2); })
          .catch(function () {
            self._render(root, FALLBACK);
            var l = root.querySelector(".loading"); if (l) { l.className = "error"; l.textContent = "载入失败，已用内置示例：" + err.message; }
          });
      });
  };

  Lattice.prototype._render = function (root, data) {
    if (data.models) return renderModels(root, data);
    if (data.principles) return renderPrinciples(root, data);
    if (data.books) return renderBooks(root, data);
    if (data.grids) return renderLegacy(root, data);
    return renderModels(root, FALLBACK);
  };

  // ============ MODELS 模式（v7 阶梯付费墙） ============
  function renderModels(root, data) {
    var mods = data.models || [];
    var isNew = mods.length && ("definition" in mods[0] || "price" in mods[0] || "tier" in mods[0]);
    if (isNew) return renderModelsNew(root, data, mods);
    return renderModelsOld(root, data, mods);
  }

  function renderModelsNew(root, data, mods) {
    var tiers = [];
    if (data.categories && data.categories.length && data.categories[0] && data.categories[0].tier) {
      tiers = data.categories.map(function (c) { return c.tier; });
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
      '<div class="sub">' + esc(data.subtitle || "下拉选择你的痛点 → 直达匹配的跨学科思维模型 · 🟢 L1 免费公开，🔵 L2 ￥29.9，🟣 L3 ￥49.9 阶梯解锁") + '</div>' +
      selHtml + '<div class="tabs">' + tabsHtml + '</div>' +
      '<div class="bar"><div class="search">🔍<input type="text" placeholder="搜索模型 / 原理 / 痛点 / 案例…" /></div></div>' +
      '<div class="grid" id="grid"></div></div>';

    // 支付 Modal（单例）
    var modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = '<div class="mcard">' +
      '<button class="mclose" aria-label="关闭">×</button>' +
      '<div class="pl">🔒</div>' +
      '<h3 id="pm-title">解锁 Colin 数字智库</h3>' +
      '<p id="pm-desc">本卡片的【真实商业操盘案例】与【3 步落地方法论】为 Pro 专属内容。</p>' +
      '<div class="mprice" id="pm-price">￥29.9</div>' +
      '<img class="mqr" src="./assets/qrcode-placeholder.png" alt="扫码支付二维码占位" />' +
      '<button class="mcta" id="pm-cta">微信 / 支付宝 扫码支付</button>' +
      '<button class="mdebug" id="pm-debug">🧪 调试专用：模拟支付成功</button>' +
      '</div>';
    root.appendChild(modal);
    var pmTier = "";

    var gridEl = root.querySelector("#grid");

    function cardNew(m) {
      var no = String(m.id).padStart(3, "0");
      var tk = tierKey(m.tier);
      var ut = unlockedTiers();
      var locked = !!m.is_pro && ut.indexOf(tk) === -1;
      var price = (m.price != null ? m.price : (locked ? 29.9 : 0));
      return '<div class="card' + (locked ? " pro" : "") + '" data-id="' + esc(m.id) + '" data-tier="' + esc(tk) + '">' +
        '<div class="top"><div><div class="tt"><span class="no">' + no + '</span> ' + esc(m.name) + '</div></div>' +
          '<span class="badge">' + esc(m.category) + '</span>' +
          (locked ? '<span class="badge pro">🔒 ' + esc(m.price_label || ("￥" + price)) + '</span>' : '') +
          '<span class="chev">▾</span></div>' +
        '<div class="pain">🏷️ <b>' + esc(m.category) + '</b> · 痛点：' + esc(m.pain_point) + '</div>' +
        '<div class="detail">' +
          '<div class="block"><div class="bh">💡 底层原理解释</div><div class="bt">' + esc(m.definition) + '</div></div>' +
          '<div class="lockwrap' + (locked ? " is-pro" : "") + '">' +
            '<div class="lockbody">' +
              '<div class="block"><div class="bh">📖 真实商业操盘案例</div><div class="bt">' + esc(m.case_study) + '</div></div>' +
              '<div class="block"><div class="bh">🛠️ 3 步落地方法论</div><div class="bt">' + esc(m.methodology) + '</div></div>' +
            '</div>' +
            (locked ? '<div class="lock-overlay"><button class="unlock-btn">🔒 ￥' + esc(price) + ' 立即解锁</button></div>' : '') +
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

    function openPay(tk) {
      pmTier = tk;
      var label = tk === "L3" ? "L3 全能智脑系统（全量 200 模型）" : tk === "L2" ? "L2 商业实战智库（100 个商业模型）" : "L1 职场精英包";
      var price = tk === "L3" ? "￥49.9" : tk === "L2" ? "￥29.9" : "免费";
      modal.querySelector("#pm-title").textContent = "解锁 " + label;
      modal.querySelector("#pm-price").textContent = price;
      modal.querySelector("#pm-cta").textContent = tk === "L1" ? "已免费" : "微信 / 支付宝 扫码支付";
      modal.style.display = "flex";
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
      var ub = e.target.closest(".unlock-btn");
      if (ub) { var card = ub.closest(".card"); openPay(card.getAttribute("data-tier")); return; }
      if (e.target.closest(".mclose") || e.target === modal) { modal.style.display = "none"; }
    });
    modal.querySelector("#pm-debug").addEventListener("click", function () {
      if (!pmTier || pmTier === "L1") { modal.style.display = "none"; return; }
      unlockTier(pmTier);
      modal.style.display = "none";
      // 解密本层级所有遮罩
      gridEl.querySelectorAll('.card[data-tier="' + pmTier + '"]').forEach(function (c) {
        c.classList.remove("pro");
        var lw = c.querySelector(".lockwrap"); if (lw) lw.classList.remove("is-pro");
        var ov = c.querySelector(".lock-overlay"); if (ov) ov.remove();
      });
    });

    drawGrid();
  }

  // ---- v7 之前旧 schema（兼容 / Fallback） ----
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
      '<div class="pills" id="pills"></div><div class="grid" id="grid"></div></div>';
    var pillsEl = root.querySelector("#pills"), gridEl = root.querySelector("#grid");
    function drawPills() {
      var p = ['<span class="chip' + (state.domain === "全部" ? " on" : "") + '" data-d="全部">全部</span>'];
      domains.forEach(function (d) { p.push('<span class="chip' + (state.domain === d ? " on" : "") + '" data-d="' + esc(d) + '">' + esc(d) + '</span>'); });
      pillsEl.innerHTML = p.join("");
      pillsEl.querySelectorAll(".chip").forEach(function (c) { c.addEventListener("click", function () { state.domain = c.getAttribute("data-d"); drawPills(); drawGrid(); }); });
    }
    function drawGrid() {
      var q = state.q.trim().toLowerCase();
      var list = (data.models || []).filter(function (m) {
        if (state.level && m.level !== state.level) return false;
        if (state.domain !== "全部" && m.domain !== state.domain) return false;
        if (q) { var hay = (m.title + " " + (m.en || "") + " " + (m.desc || "") + " " + (m.principle || "") + " " + (m.action || "") + " " + m.tags.join(" ")).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
        return true;
      });
      gridEl.innerHTML = list.map(function (m) {
        return '<div class="card" data-id="' + esc(m.id) + '"><div class="top"><span class="ic">' + esc(m.icon || "🔹") + '</span><div><div class="tt">' + esc(m.title) + '</div><div class="en">' + esc(m.en || "") + '</div></div>' +
          '<span class="badge">' + esc(m.domain) + '</span><span class="chev" style="margin-left:6px">▾</span></div>' +
          '<div class="desc">' + esc(m.desc) + '</div>' +
          '<div class="detail"><div class="block"><div class="bh">核心原理拆解</div><div class="bt">' + esc(m.principle) + '</div></div>' +
          '<div class="ba"><b>微行动沙箱：</b>' + esc(m.action) + '</div></div></div>';
      }).join("") || '<div class="desc" style="padding:20px">没有匹配的模型，换个关键词试试。</div>';
      gridEl.querySelectorAll(".card").forEach(function (c) { c.addEventListener("click", function () { c.classList.toggle("open"); }); });
    }
    root.querySelectorAll(".tab").forEach(function (t) { t.addEventListener("click", function () {
      root.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("on"); });
      t.classList.add("on"); state.level = t.getAttribute("data-level"); drawGrid();
    }); });
    root.querySelector(".search input").addEventListener("input", function (e) { state.q = e.target.value; drawGrid(); });
    drawPills(); drawGrid();
  }

  // ============ PRINCIPLES 模式（v3：点击弹 Modal） ============
  function renderPrinciples(root, data) {
    var cats = data.categories || [];
    var state = { cat: "all", q: "" };
    root.innerHTML = '<style>' + STYLE + '</style><div class="wrap">' +
      '<div class="head"><h2>' + esc(data.title || data.system || "原则系统") + '</h2><span class="en">' + esc(data.en || "") + '</span></div>' +
      (data.subtitle ? '<div class="sub">' + esc(data.subtitle) + '</div>' : '') +
      '<div class="bar"><div class="search">🔍<input type="text" placeholder="搜索原则 / 人物 / 行动…" /></div></div>' +
      '<div class="pills" id="pills"></div><div class="grid" id="grid"></div></div>';
    var pillsEl = root.querySelector("#pills"), gridEl = root.querySelector("#grid");

    var modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = '<div class="mcard"><button class="mclose" aria-label="关闭">×</button><div class="pl">📜</div>' +
      '<h3 id="pr-person"></h3><div class="mtags" id="pr-tags"></div>' +
      '<p id="pr-quote" style="text-align:left"></p>' +
      '<div class="bh" style="text-align:left;color:var(--gold-soft);font-size:12px;margin-top:10px">✅ 心智自查 · 微行动</div>' +
      '<ul class="mactions" id="pr-actions"></ul></div>';
    root.appendChild(modal);

    function drawPills() {
      var p = ['<span class="chip' + (state.cat === "all" ? " on" : "") + '" data-c="all">全部</span>'];
      cats.forEach(function (c) { p.push('<span class="chip' + (state.cat === c ? " on" : "") + '" data-c="' + esc(c) + '">' + esc(c) + '</span>'); });
      pillsEl.innerHTML = p.join("");
      pillsEl.querySelectorAll(".chip").forEach(function (x) { x.addEventListener("click", function () { state.cat = x.getAttribute("data-c"); drawPills(); drawGrid(); }); });
    }
    function drawGrid() {
      var q = state.q.trim().toLowerCase();
      var list = (data.principles || []).filter(function (p) {
        if (state.cat !== "all" && p.category !== state.cat) return false;
        if (q) { var hay = (p.person + " " + (p.quote || "") + " " + (p.tags || []).join(" ") + " " + (p.action_checklist || []).join(" ")).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
        return true;
      });
      gridEl.innerHTML = list.map(function (p) {
        return '<div class="card" data-id="' + esc(p.id) + '"><div class="top"><span class="ic">📜</span><div><div class="tt">' + esc(p.person) + '</div><div class="en">' + esc(p.category || "") + '</div></div>' +
          '<span class="badge">' + esc((p.tags || [])[0] || p.category) + '</span><span class="chev" style="margin-left:6px">▾</span></div>' +
          '<div class="desc">' + esc(p.quote) + '</div></div>';
      }).join("") || '<div class="desc" style="padding:20px">没有匹配的原则。</div>';
      gridEl.querySelectorAll(".card").forEach(function (c) {
        c.addEventListener("click", function () {
          var p = list[Number(c.getAttribute("data-idx"))] || data.principles.find(function (x) { return x.id === c.getAttribute("data-id"); });
          p = p || data.principles[gridEl.querySelectorAll(".card").length ? 0 : 0];
          var arr = data.principles; var item = arr.filter(function (x) { return x.id === c.getAttribute("data-id"); })[0];
          if (!item) return;
          modal.querySelector("#pr-person").textContent = item.person;
          modal.querySelector("#pr-tags").innerHTML = (item.tags || []).map(function (t) { return '<span class="mtag">' + esc(t) + '</span>'; }).join("");
          modal.querySelector("#pr-quote").textContent = "“" + item.quote + "”";
          modal.querySelector("#pr-actions").innerHTML = (item.action_checklist || []).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join("");
          modal.style.display = "flex";
        });
      });
    }
    root.querySelector(".search input").addEventListener("input", function (e) { state.q = e.target.value; drawGrid(); });
    root.addEventListener("click", function (e) { if (e.target.closest(".mclose") || e.target === modal) modal.style.display = "none"; });
    drawPills(); drawGrid();
  }

  // ============ BOOKS 模式（v3：点击滑出右侧抽屉） ============
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

    var backdrop = document.createElement("div"); backdrop.className = "backdrop";
    var drawer = document.createElement("div"); drawer.className = "drawer";
    drawer.innerHTML = '<button class="dclose" aria-label="关闭">×</button><div class="dpad" id="dpad"></div>';
    root.appendChild(backdrop); root.appendChild(drawer);
    function closeDrawer() { drawer.classList.remove("open"); backdrop.classList.remove("show"); }
    backdrop.addEventListener("click", closeDrawer);
    drawer.querySelector(".dclose").addEventListener("click", closeDrawer);

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
        if (q) { var hay = (b.title + " " + (b.en_title || "") + " " + (b.author || "") + " " + (b.summary || "")).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
        return true;
      });
      gridEl.innerHTML = list.map(function (b, i) {
        return '<div class="card book" data-i="' + i + '"><div class="top"><span class="ic">📖</span><div><div class="tt">' + esc(b.title) + '</div><div class="en">' + esc(b.en_title || "") + '</div></div>' +
          '<span class="badge">' + esc(b.category) + '</span></div>' +
          '<div class="at">' + esc(b.summary || "") + '</div><div class="au">✍️ ' + esc(b.author || "") + '</div></div>';
      }).join("") || '<div class="desc" style="padding:20px">没有匹配的图书。</div>';
      gridEl.querySelectorAll(".card").forEach(function (c) {
        c.addEventListener("click", function () {
          var b = (data.books || []).filter(function (x) { return x.title === c.querySelector(".tt").textContent.replace(/^\d+\s/, ""); })[0];
          // 用 data-i 更稳
          var i = Number(c.getAttribute("data-i")); b = (data.books || [])[i] || b;
          if (!b) return;
          drawer.querySelector("#dpad").innerHTML =
            '<h3>' + esc(b.title) + '</h3><div class="dau">✍️ ' + esc(b.author || "") + ' · ' + esc(b.en_title || "") + '</div>' +
            '<div class="dsum">' + esc(b.summary || "") + '</div>' +
            '<div class="dsec"><div class="bh">💡 3-5 条深度感悟</div><ul>' + (b.insights || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ul></div>' +
            '<div class="dsec"><div class="bh">🔗 关联思维模型 Tag</div><div class="mtags">' + (b.models_linked || []).map(function (t) { return '<span class="mtag">' + esc(t) + '</span>'; }).join("") + '</div></div>' +
            '<div class="dsec"><div class="bh">📎 专栏长文 / 购书跳转</div>' +
            (b.links && b.links.goodreads ? '<a class="mlink" href="' + esc(b.links.goodreads) + '" target="_blank" rel="noopener">Goodreads</a>' : '') +
            (b.links && b.links.douban ? '<a class="mlink" href="' + esc(b.links.douban) + '" target="_blank" rel="noopener">豆瓣</a>' : '') +
            (b.links && b.links.article ? '<a class="mlink" href="' + esc(b.links.article) + '" target="_blank" rel="noopener">专栏长文</a>' : '') +
            '</div>';
          drawer.classList.add("open"); backdrop.classList.add("show");
        });
      });
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
