/**
 * <mental-model-latticework> — Colin 智库 · 全模式思维模型网格 v6
 * ====================================================================
 * Web Component + Shadow DOM，零依赖、零编译、零样式污染。
 *
 * v6 重构（界面视觉全面重构）：
 *   1. 默认全量折叠（Accordion）：所有模式按分类分组，默认全收起；
 *      点击分类面板展开该组卡片；任何筛选（痛点/层级/搜索）激活时
 *      自动切换为「筛选结果平铺」视图，清除筛选回到折叠视图。
 *   2. 点击必响应：模型卡 → 模型诊所 Modal；图书卡 → 右侧抽屉；
 *      原则卡 → 原则 Modal。弹窗/抽屉内容分块折叠（details）。
 *   3. 移动端强化：375/390/414 全自适应；Modal 最大高 86vh 内滚；
 *      抽屉 min(420px,92vw)；box-sizing 全局；文字不溢出。
 *   4. 去 emoji 依赖：全部改用文字与 CSS 色点，杜绝真机豆腐块。
 *   5. 阶梯付费墙保留：L1 免费 / L2 ￥29.9 / L3 ￥49.9 → 暗黑金
 *      支付 Modal + 调试模拟解锁（localStorage colin_unlocked_tier）。
 *   6. 路径容错保留：new URL(src, document.baseURI) + /data 回退 + FALLBACK。
 */
(function () {
  "use strict";
  if (customElements.get("mental-model-latticework")) return;

  var STYLE = [
    ":host{display:block;max-width:1180px;margin:0 auto;",
    "  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;",
    "  --bg:#020617;--panel:#0b1120;--panel2:#111827;--border:#1e293b;--gold:#f59e0b;--gold-soft:#fbbf24;",
    "  --text:#e8e6e1;--muted:#94a3b8;--chip:#1e293b;}",
    "*{box-sizing:border-box;margin:0;padding:0;min-width:0;}",
    ".loading,.error{padding:40px;text-align:center;color:var(--muted);font-size:14px;}",
    ".error{color:#fba5a5;}",
    ".wrap{background:linear-gradient(160deg,#0b1120,#111827);border:1px solid rgba(245,158,11,.35);border-radius:20px;padding:20px;box-shadow:0 24px 60px rgba(0,0,0,.4);max-width:100%;}",
    ".head{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;margin-bottom:6px;}",
    ".head h2{font-size:20px;font-weight:800;color:var(--text);overflow-wrap:anywhere;}",
    ".head .en{font-size:12px;color:var(--gold-soft);letter-spacing:.06em;}",
    ".sub{font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.6;overflow-wrap:anywhere;}",
    /* 层级 Tab（色点） */
    ".tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}",
    ".tab{cursor:pointer;border:1px solid var(--border);background:var(--chip);color:var(--muted);",
    "  padding:8px 14px;border-radius:999px;font-size:13px;font-weight:700;transition:.15s;user-select:none;display:inline-flex;align-items:center;gap:7px;}",
    ".tab.on{color:#020617;background:var(--gold);border-color:var(--gold);}",
    ".tab:hover{color:var(--text);}.tab.on:hover{color:#020617;}",
    ".dot{display:inline-block;width:8px;height:8px;border-radius:50%;flex:none;}",
    ".dot.l1{background:#22c55e;}.dot.l2{background:#f59e0b;}.dot.l3{background:#a78bfa;}",
    ".tab.on .dot{outline:2px solid rgba(2,6,23,.35);outline-offset:-2px;}",
    /* 痛点下拉 */
    ".selwrap{position:relative;max-width:560px;margin-bottom:12px;}",
    ".selwrap::after{content:'▾';position:absolute;right:15px;top:50%;transform:translateY(-50%);color:var(--gold-soft);pointer-events:none;font-size:13px;}",
    "select.theme{width:100%;appearance:none;-webkit-appearance:none;background:linear-gradient(135deg,#0b1120,#1a2438);",
    "  border:1px solid var(--gold);border-radius:12px;color:var(--text);font-size:14px;font-weight:600;",
    "  padding:12px 40px 12px 16px;cursor:pointer;box-shadow:0 6px 22px rgba(245,158,11,.14);}",
    "select.theme:focus{outline:none;border-color:var(--gold-soft);box-shadow:0 0 0 3px rgba(245,158,11,.22);}",
    "select.theme option{background:#0b1120;color:var(--text);}",
    /* 搜索 */
    ".bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px;}",
    ".search{flex:1;min-width:180px;display:flex;align-items:center;gap:8px;background:var(--panel2);",
    "  border:1px solid var(--border);border-radius:10px;padding:9px 12px;}",
    ".search input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:13px;min-width:0;}",
    ".search input::placeholder{color:#64748b;}",
    /* 筛选状态行 */
    ".fstat{display:none;align-items:center;gap:10px;margin-bottom:12px;font-size:13px;color:var(--gold-soft);font-weight:700;}",
    ".fstat.show{display:flex;}",
    ".fclear{cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:999px;padding:4px 12px;font-size:12px;}",
    ".fclear:hover{color:var(--text);border-color:var(--gold);}",
    /* ===== 折叠面板 Accordion ===== */
    ".acc{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--panel);margin-bottom:10px;}",
    ".acc-h{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;user-select:none;transition:.15s;}",
    ".acc-h:hover{background:rgba(245,158,11,.06);}",
    ".acc-h:active{background:rgba(245,158,11,.12);}",
    ".acc-h .at{flex:1;font-size:15px;font-weight:700;color:var(--text);overflow-wrap:anywhere;line-height:1.4;}",
    ".acc-h .ac{font-size:12px;color:var(--muted);white-space:nowrap;}",
    ".acc-h .pm{width:24px;height:24px;border-radius:50%;border:1px solid var(--gold);color:var(--gold-soft);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex:none;line-height:1;}",
    ".acc-b{display:none;border-top:1px dashed var(--border);padding:14px;background:rgba(2,6,23,.35);}",
    ".acc.open .acc-b{display:block;}",
    ".acc-hint{font-size:12.5px;color:#64748b;text-align:center;padding:6px 0 2px;}",
    /* 网格 + 卡片 */
    ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr));gap:12px;}",
    ".card{background:var(--panel2);border:1px solid var(--border);border-radius:14px;padding:15px;cursor:pointer;transition:.18s;overflow-wrap:anywhere;word-break:break-word;max-width:100%;}",
    ".card:hover{border-color:var(--gold);transform:translateY(-2px);}",
    ".card:active{transform:translateY(0);}",
    ".top{display:flex;align-items:flex-start;gap:10px;}",
    ".top>div:first-child{flex:1;min-width:0;}",
    ".top .tt{font-size:15px;font-weight:700;color:var(--text);line-height:1.4;overflow-wrap:anywhere;}",
    ".top .en{font-size:11px;color:var(--muted);margin-top:2px;overflow-wrap:anywhere;}",
    ".badge{margin-left:6px;font-size:10px;color:var(--gold-soft);border:1px solid rgba(245,158,11,.3);",
    "  padding:3px 8px;border-radius:999px;white-space:nowrap;flex:none;max-width:44%;overflow:hidden;text-overflow:ellipsis;}",
    ".badge.pro{color:#020617;background:var(--gold);border-color:var(--gold);font-weight:800;}",
    ".desc{font-size:13px;color:var(--muted);line-height:1.65;margin-top:9px;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}",
    ".pain{font-size:12.5px;color:var(--muted);line-height:1.6;margin-top:8px;overflow-wrap:anywhere;}",
    ".pain b{color:var(--gold-soft);}",
    ".au{font-size:12px;color:var(--gold-soft);margin-top:8px;overflow-wrap:anywhere;}",
    /* ===== 弹窗通用 ===== */
    ".modal{display:none;position:fixed;inset:0;z-index:9990;align-items:center;justify-content:center;padding:14px;",
    "  background:rgba(2,6,23,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}",
    ".modal.pay{z-index:9999;}",
    ".mcard{background:linear-gradient(160deg,#0b1120,#1a2438);border:1px solid var(--gold);border-radius:18px;",
    "  padding:26px 24px;max-width:380px;width:100%;max-height:88vh;overflow-y:auto;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.6);position:relative;}",
    ".mcard.big{max-width:660px;text-align:left;}",
    ".mclose{position:absolute;top:10px;right:14px;background:rgba(2,6,23,.6);border:1px solid var(--border);color:var(--text);font-size:16px;cursor:pointer;width:32px;height:32px;border-radius:50%;z-index:5;}",
    ".mcard .pl{font-size:38px;}",
    ".mcard h3{color:var(--gold-soft);font-size:17px;margin:8px 0;overflow-wrap:anywhere;}",
    ".mcard.big h3{font-size:19px;text-align:left;}",
    ".mcard p{color:var(--muted);font-size:13px;line-height:1.7;margin-bottom:12px;overflow-wrap:anywhere;}",
    ".mprice{color:var(--gold);font-size:34px;font-weight:800;margin-bottom:6px;}",
    ".mqr{width:140px;height:140px;object-fit:cover;border-radius:12px;background:#fff;margin:8px auto 12px;border:3px solid var(--gold);display:block;}",
    ".mcta{background:linear-gradient(135deg,var(--gold),#fbbf24);color:#020617;border:none;border-radius:999px;",
    "  font-weight:800;font-size:15px;padding:12px 24px;cursor:pointer;box-shadow:0 8px 22px rgba(245,158,11,.4);}",
    ".mdebug{margin-top:10px;background:rgba(245,158,11,.12);border:1px dashed var(--gold);color:var(--gold-soft);",
    "  border-radius:10px;font-size:12px;padding:9px 12px;cursor:pointer;width:100%;}",
    ".mtags{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0;}",
    ".mcard:not(.big) .mtags{justify-content:center;}",
    ".mtag{font-size:11px;color:var(--gold-soft);border:1px solid rgba(245,158,11,.3);border-radius:999px;padding:3px 9px;overflow-wrap:anywhere;}",
    ".mactions li{font-size:13px;color:var(--text);line-height:1.7;margin-left:18px;overflow-wrap:anywhere;}",
    ".mlink{display:inline-block;margin:6px 8px 0 0;color:var(--gold-soft);font-size:12px;text-decoration:underline;overflow-wrap:anywhere;}",
    /* 模型诊所 Modal 内容 */
    ".mtt-row{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:6px;padding-right:36px;}",
    ".msec{margin-top:12px;border-top:1px dashed var(--border);padding-top:11px;}",
    ".mbh{font-size:11px;font-weight:700;color:var(--gold-soft);letter-spacing:.08em;margin-bottom:5px;}",
    ".mbt{font-size:13.5px;color:var(--text);line-height:1.75;overflow-wrap:anywhere;}",
    /* 付费遮罩 */
    ".lockwrap{position:relative;margin-top:12px;border-radius:10px;overflow:hidden;}",
    ".lockwrap .lockbody{transition:filter .3s ease;}",
    ".lockwrap.is-pro .lockbody{filter:blur(6px);opacity:.4;user-select:none;pointer-events:none;}",
    ".lock-overlay{display:none;position:absolute;inset:0;align-items:flex-end;justify-content:center;padding:16px;",
    "  background:linear-gradient(180deg,rgba(2,6,23,0) 0%,rgba(2,6,23,.72) 48%,rgba(2,6,23,.97) 100%);}",
    ".lockwrap.is-pro .lock-overlay{display:flex;}",
    ".unlock-btn{cursor:pointer;border:none;border-radius:999px;background:linear-gradient(135deg,var(--gold),#fbbf24);",
    "  color:#020617;font-weight:800;font-size:12.5px;padding:11px 16px;box-shadow:0 6px 18px rgba(245,158,11,.45);",
    "  display:inline-flex;align-items:center;gap:5px;text-align:center;line-height:1.3;}",
    /* ===== 右侧抽屉 ===== */
    ".drawer{position:fixed;top:0;right:0;height:100%;width:min(420px,92vw);z-index:9998;transform:translateX(100%);",
    "  transition:transform .32s cubic-bezier(.4,0,.2,1);background:linear-gradient(160deg,#0b1120,#111827);",
    "  border-left:1px solid var(--gold);box-shadow:-20px 0 60px rgba(0,0,0,.5);overflow-y:auto;-webkit-overflow-scrolling:touch;max-width:100%;}",
    ".drawer.open{transform:translateX(0);}",
    ".drawer .dpad{padding:22px 20px;}",
    ".drawer .dclose{position:absolute;top:12px;right:14px;background:rgba(2,6,23,.6);border:1px solid var(--border);color:var(--text);font-size:16px;width:32px;height:32px;border-radius:50%;cursor:pointer;z-index:5;}",
    ".drawer h3{color:var(--text);font-size:19px;font-weight:800;margin-bottom:4px;overflow-wrap:anywhere;padding-right:40px;}",
    ".drawer .dau{color:var(--gold-soft);font-size:13px;margin-bottom:6px;overflow-wrap:anywhere;}",
    ".drawer .dsum{color:var(--muted);font-size:13px;line-height:1.7;margin:10px 0;overflow-wrap:anywhere;}",
    ".backdrop{display:none;position:fixed;inset:0;z-index:9997;background:rgba(2,6,23,.6);}",
    ".backdrop.show{display:block;}",
    /* ===== 详情内分块折叠（details） ===== */
    "details.fk{border:1px solid var(--border);border-radius:10px;margin-top:10px;background:rgba(2,6,23,.4);overflow:hidden;}",
    "details.fk summary{cursor:pointer;list-style:none;padding:11px 13px;font-size:12px;font-weight:700;color:var(--gold-soft);letter-spacing:.06em;display:flex;align-items:center;gap:8px;user-select:none;}",
    "details.fk summary::-webkit-details-marker{display:none;}",
    "details.fk summary::after{content:'+';margin-left:auto;width:20px;height:20px;border:1px solid rgba(245,158,11,.4);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;flex:none;}",
    "details.fk[open] summary::after{content:'−';}",
    "details.fk .fk-b{padding:2px 13px 12px;}",
    "details.fk li{font-size:13px;color:var(--text);line-height:1.7;margin-left:18px;overflow-wrap:anywhere;}",
    "details.fk .fk-b .bt{font-size:13px;color:var(--text);line-height:1.7;overflow-wrap:anywhere;}",
    "@media(max-width:600px){",
    "  .wrap{padding:14px;border-radius:14px;}",
    "  .mcard{padding:22px 16px;}",
    "  .mcard.big{max-width:100%;}",
    "  .modal{padding:10px;align-items:flex-end;}",
    "  .modal .mcard{border-radius:18px 18px 0 0;max-height:92vh;}",
    "  .modal.pay{align-items:center;}",
    "  .modal.pay .mcard{border-radius:18px;}",
    "}"
  ].join("");

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  /* 去 emoji：防止真机字体缺字出现豆腐块（数据分类名可能带 emoji） */
  function noEmoji(s) {
    return String(s == null ? "" : s)
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/[\u2190-\u21FF\u2600-\u27BF\uFE0F\u200D]/g, "")
      .replace(/\s{2,}/g, " ").trim();
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
  /* 分组 */
  function groupBy(list, keyFn) {
    var order = [], map = {};
    list.forEach(function (it) {
      var k = keyFn(it) || "其他";
      if (!map[k]) { map[k] = []; order.push(k); }
      map[k].push(it);
    });
    return { order: order, map: map };
  }

  /* 4 大痛点主题 → 分类映射（v7 全 14 类全覆盖） */
  var THEMES = [
    { key: "eff", label: "个人效率与执行力", cats: ["效率与成果", "效率与杠杆", "学习与认知", "执行与迭代", "目标管理", "领导与表达"] },
    { key: "risk", label: "重大决策与风险防御", cats: ["风险防御", "极简决策", "本质思考"] },
    { key: "biz", label: "商业突破与定价博弈", cats: ["品牌与定价艺术", "商业博弈与收割"] },
    { key: "sys", label: "终极算法与系统演化", cats: ["终极算法与系统演化", "系统防御", "系统演化"] }
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

  /* ================= 折叠面板通用渲染 ================= */
  function accBlock(cat, list, cardFn, openMap) {
    var isOpen = !!openMap[cat];
    return '<div class="acc' + (isOpen ? " open" : "") + '" data-cat="' + esc(cat) + '">' +
      '<div class="acc-h" role="button" aria-expanded="' + (isOpen ? "true" : "false") + '">' +
        '<span class="pm">' + (isOpen ? "−" : "+") + '</span>' +
        '<span class="at">' + esc(noEmoji(cat)) + '</span>' +
        '<span class="ac">' + list.length + ' 条</span>' +
      '</div>' +
      '<div class="acc-b"><div class="grid">' + list.map(cardFn).join("") + '</div></div>' +
    '</div>';
  }
  function bindAccordion(host, openMap, redraw) {
    host.querySelectorAll(".acc-h").forEach(function (h) {
      h.addEventListener("click", function () {
        var acc = h.parentElement;
        var cat = acc.getAttribute("data-cat");
        openMap[cat] = !openMap[cat];
        redraw();
        if (openMap[cat]) {
          var b = acc.querySelector(".acc-b");
          if (b) requestAnimationFrame(function () { b.scrollIntoView({ behavior: "smooth", block: "nearest" }); });
        }
      });
    });
  }

  function payModal(root) {
    var modal = document.createElement("div");
    modal.className = "modal pay";
    modal.innerHTML = '<div class="mcard">' +
      '<button class="mclose" aria-label="关闭">×</button>' +
      '<h3 id="pm-title">解锁 Colin 数字智库</h3>' +
      '<p id="pm-desc">本卡片的【真实商业操盘案例】与【3 步落地方法论】为 Pro 专属内容。</p>' +
      '<div class="mprice" id="pm-price">￥29.9</div>' +
      '<img class="mqr" src="./assets/qrcode-placeholder.png" alt="扫码支付二维码占位" />' +
      '<button class="mcta" id="pm-cta">微信 / 支付宝 扫码支付</button>' +
      '<button class="mdebug" id="pm-debug">调试专用：模拟支付成功</button>' +
      '</div>';
    root.appendChild(modal);
    return modal;
  }
  function openPay(modal, tk) {
    var label = tk === "L3" ? "L3 全能智脑系统（全量 200 模型）" : tk === "L2" ? "L2 商业实战智库（100 个商业模型）" : "L1 职场精英包";
    var price = tk === "L3" ? "￥49.9" : tk === "L2" ? "￥29.9" : "免费";
    modal.querySelector("#pm-title").textContent = "解锁 " + label;
    modal.querySelector("#pm-price").textContent = price;
    modal.querySelector("#pm-cta").textContent = tk === "L1" ? "已免费" : "微信 / 支付宝 扫码支付";
    modal.style.display = "flex";
  }

  /* ============ MODELS 模式（v7 阶梯付费墙 + 折叠 + 诊所 Modal） ============ */
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
    var dotCls = { "L1": "l1", "L2": "l2", "L3": "l3" };
    var state = { tier: "", theme: "", q: "" };
    var openMap = {};
    var curModel = null;

    var tabsHtml = '<span class="tab on" data-tier="">全部模型</span>' + tiers.map(function (t) {
      var tk = tierKey(t);
      return '<span class="tab" data-tier="' + esc(t) + '"><span class="dot ' + (dotCls[tk] || "l1") + '"></span>' + esc(noEmoji(t)) + '</span>';
    }).join("");

    var selHtml = '<div class="selwrap"><select class="theme" id="theme">' +
      '<option value="">全部分类痛点 · 先选一个你最痛的问题</option>' +
      THEMES.map(function (t) { return '<option value="' + t.key + '">' + esc(t.label) + '</option>'; }).join("") +
      '</select></div>';

    root.innerHTML = '<style>' + STYLE + '</style><div class="wrap">' +
      '<div class="head"><h2>' + esc(noEmoji(data.title || data.system_name || "200 大跨学科思维模型")) + '</h2>' +
      (data.en ? '<span class="en">' + esc(data.en) + '</span>' : '') + '</div>' +
      '<div class="sub">点击分类展开卡片 · 或下拉选择痛点直达匹配模型（L1 免费公开 / L2 ￥29.9 / L3 ￥49.9 阶梯解锁）</div>' +
      selHtml + '<div class="tabs">' + tabsHtml + '</div>' +
      '<div class="bar"><div class="search"><input type="text" placeholder="搜索模型 / 原理 / 痛点 / 案例…" /></div></div>' +
      '<div class="fstat" id="fstat"><span id="fn"></span><button class="fclear" id="fclear">清除筛选</button></div>' +
      '<div id="accs"></div></div>';

    var modal = payModal(root);
    var mModal = document.createElement("div");
    mModal.className = "modal";
    mModal.innerHTML = '<div class="mcard big">' +
      '<button class="mclose" aria-label="关闭">×</button>' +
      '<div id="mclinic"></div></div>';
    root.appendChild(mModal);

    function cardNew(m) {
      var no = String(m.id).padStart(3, "0");
      var tk = tierKey(m.tier);
      var ut = unlockedTiers();
      var locked = !!m.is_pro && ut.indexOf(tk) === -1;
      var price = (m.price != null ? m.price : (locked ? 29.9 : 0));
      return '<div class="card' + (locked ? " pro" : "") + '" data-id="' + esc(m.id) + '" data-tier="' + esc(tk) + '">' +
        '<div class="top"><div><div class="tt"><b>' + no + '</b> ' + esc(noEmoji(m.name)) + '</div></div>' +
          '<span class="badge">' + esc(noEmoji(m.category)) + '</span>' +
          (locked ? '<span class="badge pro">PRO ' + esc(m.price_label || ("￥" + price)) + '</span>' : '') +
        '</div>' +
        '<div class="pain"><b>' + esc(noEmoji(m.category)) + '</b> · ' + esc(m.pain_point || "") + '</div>' +
      '</div>';
    }

    function filtered() {
      var q = state.q.trim().toLowerCase();
      return mods.filter(function (m) {
        if (state.tier && m.tier !== state.tier) return false;
        if (state.theme && THEME_CATS[state.theme].indexOf(m.category) === -1) return false;
        if (q) {
          var hay = (m.name + " " + (m.category || "") + " " + (m.pain_point || "") + " " + (m.definition || "") + " " + (m.case_study || "") + " " + (m.methodology || "")).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
    }

    function draw() {
      var accsEl = root.querySelector("#accs");
      var fstat = root.querySelector("#fstat");
      var list = filtered();
      var filtering = !!(state.tier || state.theme || state.q.trim());
      if (filtering) {
        fstat.className = "fstat show";
        root.querySelector("#fn").textContent = "已筛选 " + list.length + " 条匹配模型";
        accsEl.innerHTML = '<div class="grid">' + (list.map(cardNew).join("") ||
          '<div class="desc" style="padding:24px;grid-column:1/-1">没有匹配的模型，换个痛点或关键词试试。</div>') + '</div>';
      } else {
        fstat.className = "fstat";
        var g = groupBy(mods, function (m) { return noEmoji(m.category); });
        accsEl.innerHTML = g.order.map(function (cat) { return accBlock(cat, g.map[cat], cardNew, openMap); }).join("") +
          '<div class="acc-hint">共 ' + mods.length + ' 个模型 · 点击分类展开</div>';
      }
      bindAccordion(accsEl, openMap, draw);
      accsEl.querySelectorAll(".card").forEach(function (c) {
        c.addEventListener("click", function () {
          var item = mods.filter(function (x) { return String(x.id) === c.getAttribute("data-id"); })[0];
          if (item) openClinic(item);
        });
      });
    }

    function lockwrapHtml(m) {
      var tk = tierKey(m.tier);
      var ut = unlockedTiers();
      var locked = !!m.is_pro && ut.indexOf(tk) === -1;
      var price = (m.price != null ? m.price : (locked ? 29.9 : 0));
      return '<div class="lockwrap' + (locked ? " is-pro" : "") + '">' +
        '<div class="lockbody">' +
          '<div class="msec"><div class="mbh">真实商业操盘案例</div><div class="mbt">' + esc(m.case_study || "——") + '</div></div>' +
          '<div class="msec"><div class="mbh">3 步落地方法论</div><div class="mbt">' + esc(m.methodology || "——") + '</div></div>' +
        '</div>' +
        (locked ? '<div class="lock-overlay"><button class="unlock-btn">解锁 ￥' + esc(price) + ' · 查看案例与方法论</button></div>' : '') +
      '</div>';
    }

    function openClinic(m) {
      curModel = m;
      var no = String(m.id).padStart(3, "0");
      var tk = tierKey(m.tier);
      var ut = unlockedTiers();
      var locked = !!m.is_pro && ut.indexOf(tk) === -1;
      root.querySelector("#mclinic").innerHTML =
        '<div class="mtt-row"><h3>' + no + ' ' + esc(noEmoji(m.name)) + '</h3>' +
        '<span class="mtag">' + esc(noEmoji(m.category)) + '</span>' +
        (locked ? '<span class="mtag" style="color:#020617;background:var(--gold);border-color:var(--gold);font-weight:800">PRO ' + esc(m.price_label || "") + '</span>' : '') +
        '</div>' +
        '<div class="msec"><div class="mbh">你的痛点</div><div class="mbt">' + esc(m.pain_point || "——") + '</div></div>' +
        '<div class="msec"><div class="mbh">底层原理解释</div><div class="mbt">' + esc(m.definition || "——") + '</div></div>' +
        lockwrapHtml(m);
      mModal.style.display = "flex";
    }
    function reopenClinic() { if (curModel) openClinic(curModel); }

    root.querySelector("#theme").addEventListener("change", function (e) { state.theme = e.target.value; draw(); });
    root.querySelectorAll(".tab").forEach(function (t) {
      t.addEventListener("click", function () {
        root.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("on"); });
        t.classList.add("on"); state.tier = t.getAttribute("data-tier"); draw();
      });
    });
    root.querySelector(".search input").addEventListener("input", function (e) { state.q = e.target.value; draw(); });
    root.querySelector("#fclear").addEventListener("click", function () {
      state.tier = ""; state.theme = ""; state.q = "";
      root.querySelector("#theme").value = "";
      root.querySelector(".search input").value = "";
      root.querySelectorAll(".tab").forEach(function (x, i) { x.classList.toggle("on", i === 0); });
      draw();
    });

    /* 各 Modal 独立关闭：支付 Modal 的 × 只关支付；诊所 Modal 的 × 只关诊所 */
    modal.addEventListener("click", function (e) {
      if (e.target.closest(".mclose") || e.target === modal) modal.style.display = "none";
    });
    mModal.addEventListener("click", function (e) {
      if (e.target.closest(".mclose") || e.target === mModal) mModal.style.display = "none";
    });
    /* 解锁按钮：诊所 Modal 内取当前模型层级 */
    root.addEventListener("click", function (e) {
      var ub = e.target.closest(".unlock-btn");
      if (!ub) return;
      var host = ub.closest("[data-tier]");
      var tk = host ? host.getAttribute("data-tier") : tierKey(curModel && curModel.tier) || "L2";
      modal.setAttribute("data-pay-tier", tk);
      openPay(modal, tk);
    });
    modal.querySelector("#pm-debug").addEventListener("click", function () {
      var tk = modal.getAttribute("data-pay-tier") || "L2";
      if (tk === "L1") { modal.style.display = "none"; return; }
      unlockTier(tk);
      modal.style.display = "none";
      draw();
      reopenClinic();
    });

    draw();
  }

  // ---- v7 之前旧 schema（兼容 / Fallback） ----
  function renderModelsOld(root, data) {
    var levels = data.levels || [];
    var domains = data.domains || [];
    var state = { level: levels[0] ? levels[0].key : null, domain: "全部", q: "" };
    var openMap = {};
    root.innerHTML = '<style>' + STYLE + '</style><div class="wrap">' +
      '<div class="head"><h2>' + esc(noEmoji(data.title || "思维模型")) + '</h2><span class="en">' + esc(data.en || "") + '</span></div>' +
      (data.subtitle ? '<div class="sub">' + esc(data.subtitle) + '</div>' : '') +
      (levels.length > 1 ? '<div class="tabs">' + levels.map(function (l, i) {
        return '<span class="tab' + (i === 0 ? " on" : "") + '" data-level="' + esc(l.key) + '">' + esc(noEmoji(l.label)) + '<span class="rng">' + esc(l.range || "") + '</span></span>';
      }).join("") + '</div>' : '') +
      '<div class="bar"><div class="search"><input type="text" placeholder="搜索模型 / 英文 / 原理 / 行动…" /></div></div>' +
      '<div class="fstat" id="fstat"><span id="fn"></span><button class="fclear" id="fclear">清除筛选</button></div>' +
      '<div id="accs"></div></div>';
    function draw() {
      var accsEl = root.querySelector("#accs");
      var q = state.q.trim().toLowerCase();
      var list = (data.models || []).filter(function (m) {
        if (state.level && m.level !== state.level) return false;
        if (state.domain !== "全部" && m.domain !== state.domain) return false;
        if (q) { var hay = (m.title + " " + (m.en || "") + " " + (m.desc || "") + " " + (m.principle || "") + " " + (m.action || "") + " " + m.tags.join(" ")).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
        return true;
      });
      var filtering = !!(q || (state.domain !== "全部"));
      var cardFn = function (m) {
        return '<div class="card" data-id="' + esc(m.id) + '"><div class="top"><div><div class="tt">' + esc(noEmoji(m.title)) + '</div><div class="en">' + esc(m.en || "") + '</div></div>' +
          '<span class="badge">' + esc(noEmoji(m.domain)) + '</span></div>' +
          '<div class="desc">' + esc(m.desc) + '</div></div>';
      };
      if (filtering) {
        root.querySelector("#fstat").className = "fstat show";
        root.querySelector("#fn").textContent = "已筛选 " + list.length + " 条";
        accsEl.innerHTML = '<div class="grid">' + list.map(cardFn).join("") + '</div>';
      } else {
        root.querySelector("#fstat").className = "fstat";
        var g = groupBy(list, function (m) { return noEmoji(m.domain); });
        accsEl.innerHTML = g.order.map(function (cat) { return accBlock(cat, g.map[cat], cardFn, openMap); }).join("");
      }
      bindAccordion(accsEl, openMap, draw);
      accsEl.querySelectorAll(".card").forEach(function (c) { c.addEventListener("click", function () { c.classList.toggle("open"); }); });
    }
    root.querySelectorAll(".tab").forEach(function (t) { t.addEventListener("click", function () {
      root.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("on"); });
      t.classList.add("on"); state.level = t.getAttribute("data-level"); draw();
    }); });
    root.querySelector(".search input").addEventListener("input", function (e) { state.q = e.target.value; draw(); });
    root.querySelector("#fclear") && root.querySelector("#fclear").addEventListener("click", function () {
      state.q = ""; state.domain = "全部"; root.querySelector(".search input").value = ""; draw();
    });
    draw();
  }

  /* ============ PRINCIPLES 模式（折叠 + Modal） ============ */
  function renderPrinciples(root, data) {
    var state = { q: "" };
    var openMap = {};
    root.innerHTML = '<style>' + STYLE + '</style><div class="wrap">' +
      '<div class="head"><h2>' + esc(noEmoji(data.title || data.system || "原则系统")) + '</h2><span class="en">' + esc(data.en || "") + '</span></div>' +
      '<div class="sub">点击分类展开原则卡片 · 点击卡片查看原则详情与行动清单</div>' +
      '<div class="bar"><div class="search"><input type="text" placeholder="搜索原则 / 人物 / 行动…" /></div></div>' +
      '<div class="fstat" id="fstat"><span id="fn"></span><button class="fclear" id="fclear">清除搜索</button></div>' +
      '<div id="accs"></div></div>';

    var modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = '<div class="mcard"><button class="mclose" aria-label="关闭">×</button>' +
      '<h3 id="pr-person"></h3><div class="mtags" id="pr-tags"></div>' +
      '<p id="pr-quote" style="text-align:left"></p>' +
      '<details class="fk" open><summary>心智自查 · 微行动清单</summary><div class="fk-b"><ul class="mactions" id="pr-actions"></ul></div></details>' +
      '</div>';
    root.appendChild(modal);

    function draw() {
      var accsEl = root.querySelector("#accs");
      var q = state.q.trim().toLowerCase();
      var list = (data.principles || []).filter(function (p) {
        if (q) { var hay = (p.person + " " + (p.quote || "") + " " + (p.tags || []).join(" ") + " " + (p.action_checklist || []).join(" ")).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
        return true;
      });
      var cardFn = function (p) {
        return '<div class="card" data-id="' + esc(p.id) + '"><div class="top"><div><div class="tt">' + esc(noEmoji(p.person)) + '</div><div class="en">' + esc(noEmoji(p.category || "")) + '</div></div>' +
          '<span class="badge">' + esc(noEmoji((p.tags || [])[0] || p.category)) + '</span></div>' +
          '<div class="desc">' + esc(p.quote) + '</div></div>';
      };
      if (q) {
        root.querySelector("#fstat").className = "fstat show";
        root.querySelector("#fn").textContent = "已搜索 " + list.length + " 条原则";
        accsEl.innerHTML = '<div class="grid">' + (list.map(cardFn).join("") || '<div class="desc" style="padding:20px">没有匹配的原则。</div>') + '</div>';
      } else {
        root.querySelector("#fstat").className = "fstat";
        var g = groupBy(list, function (p) { return noEmoji(p.category); });
        accsEl.innerHTML = g.order.map(function (cat) { return accBlock(cat, g.map[cat], cardFn, openMap); }).join("") +
          '<div class="acc-hint">共 ' + (data.principles || []).length + ' 条原则 · 点击分类展开</div>';
      }
      bindAccordion(accsEl, openMap, draw);
      accsEl.querySelectorAll(".card").forEach(function (c) {
        c.addEventListener("click", function () {
          var item = (data.principles || []).filter(function (x) { return String(x.id) === c.getAttribute("data-id"); })[0];
          if (!item) return;
          modal.querySelector("#pr-person").textContent = noEmoji(item.person);
          modal.querySelector("#pr-tags").innerHTML = (item.tags || []).map(function (t) { return '<span class="mtag">' + esc(noEmoji(t)) + '</span>'; }).join("");
          modal.querySelector("#pr-quote").textContent = "“" + item.quote + "”";
          modal.querySelector("#pr-actions").innerHTML = (item.action_checklist || []).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join("");
          modal.style.display = "flex";
        });
      });
    }
    root.querySelector(".search input").addEventListener("input", function (e) { state.q = e.target.value; draw(); });
    root.querySelector("#fclear").addEventListener("click", function () { state.q = ""; root.querySelector(".search input").value = ""; draw(); });
    root.addEventListener("click", function (e) { if (e.target.closest(".mclose") || e.target === modal) modal.style.display = "none"; });
    draw();
  }

  /* ============ BOOKS 模式（折叠 + 抽屉） ============ */
  function renderBooks(root, data) {
    var state = { q: "" };
    var openMap = {};
    root.innerHTML = '<style>' + STYLE + '</style><div class="wrap">' +
      '<div class="head"><h2>' + esc(noEmoji(data.title || "精选图书")) + '</h2><span class="en">' + esc(data.en || "") + '</span>' +
      '<span class="count" style="font-size:12px;color:#64748b;margin-left:auto;">' + (data.total_books || (data.books ? data.books.length : 0)) + ' 本</span></div>' +
      '<div class="sub">点击分类展开书单 · 点击图书查看深度感悟与关联模型</div>' +
      '<div class="bar"><div class="search"><input type="text" placeholder="搜索书名 / 作者 / 摘要…" /></div></div>' +
      '<div class="fstat" id="fstat"><span id="fn"></span><button class="fclear" id="fclear">清除搜索</button></div>' +
      '<div id="accs"></div></div>';

    var backdrop = document.createElement("div"); backdrop.className = "backdrop";
    var drawer = document.createElement("div"); drawer.className = "drawer";
    drawer.innerHTML = '<button class="dclose" aria-label="关闭">×</button><div class="dpad" id="dpad"></div>';
    root.appendChild(backdrop); root.appendChild(drawer);
    function closeDrawer() { drawer.classList.remove("open"); backdrop.classList.remove("show"); }
    backdrop.addEventListener("click", closeDrawer);
    drawer.querySelector(".dclose").addEventListener("click", closeDrawer);

    function draw() {
      var accsEl = root.querySelector("#accs");
      var q = state.q.trim().toLowerCase();
      var list = (data.books || []).filter(function (b) {
        if (q) { var hay = (b.title + " " + (b.en_title || "") + " " + (b.author || "") + " " + (b.summary || "")).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
        return true;
      });
      var cardFn = function (b) {
        return '<div class="card book" data-i="' + esc(b._i) + '"><div class="top"><div><div class="tt">' + esc(noEmoji(b.title)) + '</div><div class="en">' + esc(b.en_title || "") + '</div></div>' +
          '<span class="badge">' + esc(noEmoji(b.category)) + '</span></div>' +
          '<div class="desc">' + esc(b.summary || "") + '</div><div class="au">文 / ' + esc(b.author || "") + '</div></div>';
      };
      if (q) {
        root.querySelector("#fstat").className = "fstat show";
        root.querySelector("#fn").textContent = "已搜索 " + list.length + " 本图书";
        accsEl.innerHTML = '<div class="grid">' + (list.map(function (b) { return cardFn(b); }).join("") || '<div class="desc" style="padding:20px">没有匹配的图书。</div>') + '</div>';
      } else {
        root.querySelector("#fstat").className = "fstat";
        var g = groupBy(list, function (b) { return noEmoji(b.category); });
        accsEl.innerHTML = g.order.map(function (cat) { return accBlock(cat, g.map[cat], cardFn, openMap); }).join("") +
          '<div class="acc-hint">共 ' + (data.books || []).length + ' 本 · 点击分类展开</div>';
      }
      bindAccordion(accsEl, openMap, draw);
      accsEl.querySelectorAll(".card").forEach(function (c) {
        c.addEventListener("click", function () {
          var b = (data.books || [])[Number(c.getAttribute("data-i"))];
          if (!b) return;
          var links = b.links || {};
          drawer.querySelector("#dpad").innerHTML =
            '<h3>' + esc(noEmoji(b.title)) + '</h3><div class="dau">文 / ' + esc(b.author || "") + ' · ' + esc(b.en_title || "") + '</div>' +
            '<div class="dsum">' + esc(b.summary || "") + '</div>' +
            '<details class="fk" open><summary>深度感悟（' + (b.insights || []).length + ' 条）</summary><div class="fk-b"><ul>' +
              (b.insights || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ul></div></details>' +
            '<details class="fk"><summary>关联思维模型（' + (b.models_linked || []).length + '）</summary><div class="fk-b"><div class="mtags">' +
              (b.models_linked || []).map(function (t) { return '<span class="mtag">' + esc(noEmoji(t)) + '</span>'; }).join("") + '</div></div></details>' +
            '<details class="fk"><summary>专栏长文 / 购书跳转</summary><div class="fk-b">' +
              (links.douban ? '<a class="mlink" href="' + esc(links.douban) + '" target="_blank" rel="noopener">豆瓣</a>' : '') +
              (links.goodreads ? '<a class="mlink" href="' + esc(links.goodreads) + '" target="_blank" rel="noopener">Goodreads</a>' : '') +
              (links.article ? '<a class="mlink" href="' + esc(links.article) + '" target="_blank" rel="noopener">专栏长文</a>' : '') +
              (!links.douban && !links.goodreads && !links.article ? '<span class="desc">整理中，敬请期待。</span>' : '') +
            '</div></details>';
          drawer.classList.add("open"); backdrop.classList.add("show");
        });
      });
    }
    /* 预索引 _i */
    (data.books || []).forEach(function (b, i) { b._i = i; });
    root.querySelector(".search input").addEventListener("input", function (e) { state.q = e.target.value; draw(); });
    root.querySelector("#fclear").addEventListener("click", function () { state.q = ""; root.querySelector(".search input").value = ""; draw(); });
    draw();
  }

  /* ============ LEGACY 模式 ============ */
  function renderLegacy(root, data) {
    var scenes = data.scenes || [];
    var state = { scene: scenes[0] || "全部", q: "" };
    var openMap = {};
    root.innerHTML = '<style>' + STYLE + '</style><div class="wrap">' +
      '<div class="head"><h2>' + esc(noEmoji(data.title || "网格")) + '</h2><span class="en">' + esc(data.en || "") + '</span></div>' +
      '<div class="pills" id="pills"></div><div id="accs"></div></div>';
    var pillsEl = root.querySelector("#pills");
    function drawPills() {
      var all = ["全部"].concat(scenes);
      pillsEl.innerHTML = all.map(function (s) { return '<span class="chip' + (state.scene === s ? " on" : "") + '" data-s="' + esc(s) + '">' + esc(s) + '</span>'; }).join("");
      pillsEl.querySelectorAll(".chip").forEach(function (x) { x.addEventListener("click", function () { state.scene = x.getAttribute("data-s"); drawPills(); draw(); }); });
    }
    function draw() {
      var accsEl = root.querySelector("#accs");
      var list = (data.grids || []).filter(function (g) { return state.scene === "全部" || g.scene === state.scene; });
      var cardFn = function (g) {
        var detail = (g.detail || []).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join("");
        return '<div class="card"><div class="top"><div><div class="tt">' + esc(noEmoji(g.title)) + '</div><div class="en">' + esc(g.en || "") + '</div></div></div>' +
          '<div class="desc">' + esc(g.desc) + '</div>' + (detail ? '<details class="fk"><summary>要点清单</summary><div class="fk-b"><ol class="bt" style="padding-left:18px">' + detail + '</ol></div></details>' : '') + '</div>';
      };
      var g = groupBy(list, function (x) { return x.scene || "其他"; });
      accsEl.innerHTML = g.order.map(function (cat) { return accBlock(cat, g.map[cat], cardFn, openMap); }).join("");
      bindAccordion(accsEl, openMap, draw);
    }
    drawPills(); draw();
  }

  customElements.define("mental-model-latticework", Lattice);
})();
