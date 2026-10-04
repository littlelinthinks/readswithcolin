/**
 * <pillar-essay-layout> — Colin 智库 · 基石长文阅读排版（暗金风）
 * ============================================================
 * 独立组件（Web Component + Shadow DOM，零依赖，不碰老站任何代码/样式）。
 * 拉取 data/pillar-essays-data.json，按 slug 渲染：顶部 1-3-1 漏斗金句卡 +
 * 黄金三段论正文（引子 / 核心含子节 / 升华含行动沙箱）。
 *
 * 嵌入步骤（2 行代码）：
 *   <pillar-essay-layout slug="zizhitongjian-zhibo-zhi-wang" src="data/pillar-essays-data.json"></pillar-essay-layout>
 *   </body> 前放：<script src="components/widgets/pillar-essay-layout.js"></script>
 */
(function () {
  "use strict";
  if (customElements.get("pillar-essay-layout")) return;

  var STYLE = [
    ":host{display:block;max-width:760px;margin:0 auto;",
    "  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;",
    "  --bg:#020617;--panel:#0b1120;--border:#1e293b;--gold:#f59e0b;--gold-soft:#fbbf24;",
    "  --text:#e8e6e1;--muted:#94a3b8;--quote:#cbd5e1;}",
    "*{box-sizing:border-box;margin:0;padding:0;}",
    ".loading,.error{padding:40px;text-align:center;color:var(--muted);font-size:14px;}",
    ".error{color:#fca5a5;}",
    ".pillar{display:inline-block;font-size:11px;letter-spacing:.12em;color:var(--gold-soft);",
    "  border:1px solid rgba(245,158,11,.4);border-radius:999px;padding:3px 12px;margin-bottom:14px;}",
    ".title{color:var(--text);font-size:24px;font-weight:800;line-height:1.4;margin-bottom:8px;}",
    ".author{color:var(--muted);font-size:12px;margin-bottom:22px;}",
    /* hero 1-3-1 */
    ".hero{background:linear-gradient(160deg,#0b1120,#111827);border:1px solid var(--gold);border-radius:18px;",
    "  padding:24px;margin-bottom:30px;box-shadow:0 20px 50px rgba(0,0,0,.4);}",
    ".hero .tag{font-size:11px;letter-spacing:.16em;color:var(--gold-soft);text-transform:uppercase;margin-bottom:12px;}",
    ".hero .q{font-size:19px;font-weight:700;color:var(--text);line-height:1.7;quotes:'“' '”';}",
    ".hero .qe{font-size:13px;font-style:italic;color:var(--muted);line-height:1.65;margin-top:10px;}",
    ".hero .src{font-size:12.5px;color:var(--muted);margin-top:12px;}",
    ".hero .src b{color:var(--gold-soft);font-weight:600;}",
    ".layers{margin-top:20px;border-top:1px dashed var(--border);padding-top:16px;}",
    ".layers .lh{font-size:12px;letter-spacing:.1em;color:var(--gold-soft);margin-bottom:10px;}",
    ".layer{display:flex;gap:10px;margin-bottom:10px;}",
    ".layer .n{flex:none;width:22px;height:22px;border-radius:50%;background:rgba(245,158,11,.15);color:var(--gold-soft);",
    "  font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;}",
    ".layer .lt{font-size:13.5px;color:var(--text);line-height:1.65;}",
    ".layer .lt b{color:var(--gold-soft);}",
    ".action{margin-top:18px;background:rgba(245,158,11,.07);border-left:3px solid var(--gold);border-radius:8px;padding:12px 14px;}",
    ".action .ah{font-size:12px;font-weight:700;color:var(--gold-soft);margin-bottom:5px;}",
    ".action .at{font-size:13px;color:var(--text);line-height:1.65;}",
    /* body */
    ".sec{margin-bottom:26px;}",
    ".sec-h{font-size:18px;font-weight:700;color:var(--gold-soft);margin-bottom:12px;padding-left:12px;border-left:3px solid var(--gold);}",
    ".sub-h{font-size:15px;font-weight:700;color:var(--text);margin:16px 0 8px;}",
    "p{font-size:15px;color:var(--text);line-height:1.95;margin-bottom:14px;text-align:justify;}",
    "blockquote{font-size:14.5px;color:var(--quote);line-height:1.85;margin:14px 0;padding:12px 16px;",
    "  border-left:3px solid var(--border);background:#0b1120;border-radius:0 10px 10px 0;font-style:italic;}",
    /* action box */
    ".sandbox{background:#0b1120;border:1px solid var(--border);border-radius:14px;padding:18px;margin-top:14px;}",
    ".sandbox .sh{font-size:14px;font-weight:700;color:var(--gold-soft);margin-bottom:12px;}",
    ".chk{border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px;}",
    ".chk .cl{font-size:14px;font-weight:600;color:var(--text);}",
    ".chk .cd{font-size:13px;color:var(--muted);line-height:1.6;margin-top:4px;}",
    ".chk .ca{font-size:13px;color:var(--gold-soft);line-height:1.6;margin-top:6px;}",
    ".chk .ca b{font-weight:700;}"
  ].join("");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function blocksHTML(blocks) {
    if (!blocks) return "";
    return blocks.map(function (b) {
      if (b.type === "quote") return "<blockquote>" + esc(b.text) + "</blockquote>";
      return "<p>" + esc(b.text) + "</p>";
    }).join("");
  }

  function PillarEssayLayout() {
    var self = Reflect.construct(HTMLElement, [], PillarEssayLayout);
    return self;
  }
  PillarEssayLayout.prototype = Object.create(HTMLElement.prototype);

  PillarEssayLayout.prototype.connectedCallback = function () {
    var slug = this.getAttribute("slug") || "";
    var src = this.getAttribute("src") || "data/pillar-essays-data.json";
    var root = this.attachShadow({ mode: "open" });
    root.innerHTML = '<style>' + STYLE + '</style><div class="loading">载入基石长文中…</div>';

    fetch(src).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (data) {
      var list = data.essays || [];
      var e = null;
      for (var i = 0; i < list.length; i++) if (list[i].slug === slug) { e = list[i]; break; }
      if (!e) throw new Error("未找到 slug=" + slug);
      render(root, e);
    }).catch(function (err) {
      root.querySelector(".loading").className = "error";
      root.querySelector(".error").textContent =
        "载入失败：" + err.message + "（请确认 src 路径与 slug 是否正确）";
    });
  };

  function render(root, e) {
    var h = e.hero || {};
    var sources = (h.sources || []).join(" × ");
    var layers = (h.layers || []).map(function (l, i) {
      return '<div class="layer"><span class="n">' + (i + 1) + '</span><div class="lt"><b>' +
        esc(l.who) + '</b>：' + esc(l.text) + '</div></div>';
    }).join("");
    var sec = e.sections || {};
    var intro = sec.intro || {};
    var core = sec.core || {};
    var sublime = sec.sublime || {};
    var ab = sublime.actionBox || {};

    var coreHTML = (core.subsections || []).map(function (ss) {
      return '<div class="sub-h">' + esc(ss.heading) + '</div>' + blocksHTML(ss.blocks);
    }).join("");

    var sandboxHTML = "";
    if (ab.title) {
      var itemsHTML = (ab.items || []).map(function (it) {
        return '<div class="chk"><div class="cl">' + esc(it.label) + '</div>' +
          (it.desc ? '<div class="cd">' + esc(it.desc) + '</div>' : '') +
          (it.action ? '<div class="ca"><b>行动：</b>' + esc(it.action) + '</div>' : '') +
          '</div>';
      }).join("");
      sandboxHTML = '<div class="sandbox"><div class="sh">' + esc(ab.title) + '</div>' + itemsHTML + '</div>';
    }

    root.innerHTML = '<style>' + STYLE + '</style>' +
      '<article>' +
      '  <div class="pillar">' + esc(e.pillar) + '</div>' +
      '  <h1 class="title">' + esc(e.title) + '</h1>' +
      '  <div class="author">文 / ' + esc(e.author) + (e.style ? ' · ' + esc(e.style) : '') + '</div>' +
      '  <div class="hero">' +
      '    <div class="tag">Colin · 1-3-1 漏斗金句卡</div>' +
      '    <div class="q">“' + esc(h.quote) + '”</div>' +
      (h.quoteEn ? '    <div class="qe">“' + esc(h.quoteEn) + '”</div>' : '') +
      '    <div class="src"><b>' + esc(sources) + '</b></div>' +
      '    <div class="layers"><div class="lh">1-3-1 · 三层解构</div>' + layers + '</div>' +
      (h.action ? '<div class="action"><div class="ah">微行动锚点</div><div class="at">' + esc(h.action) + '</div></div>' : '') +
      '  </div>' +
      '  <section class="sec"><div class="sec-h">' + esc(intro.heading || "引子") + '</div>' + blocksHTML(intro.blocks) + '</section>' +
      '  <section class="sec"><div class="sec-h">' + esc(core.heading || "核心") + '</div>' + coreHTML + '</section>' +
      '  <section class="sec"><div class="sec-h">' + esc(sublime.heading || "升华") + '</div>' + blocksHTML(sublime.blocks) + sandboxHTML + '</section>' +
      '</article>';
  }

  customElements.define("pillar-essay-layout", PillarEssayLayout);
})();
