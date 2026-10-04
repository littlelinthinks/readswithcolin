/**
 * <quote-card-exporter> — Colin 智库 · 暗金 1-3-1 闪卡 PNG 导出器（暗金风）
 * ============================================================
 * 独立组件（Web Component + Shadow DOM，零依赖，不碰老站任何代码/样式）。
 * 拉取 data/pillar-essays-data.json（按 slug），展示暗金 1-3-1 金句卡，
 * 纯前端 Canvas 渲染生成 1080×1350 高清 PNG，一键下载用于微信朋友圈分享。
 *
 * 嵌入步骤（2 行代码）：
 *   <quote-card-exporter slug="zizhitongjian-zhibo-zhi-wang" src="data/pillar-essays-data.json"></quote-card-exporter>
 *   </body> 前放：<script src="components/widgets/quote-card-exporter.js"></script>
 */
(function () {
  "use strict";
  if (customElements.get("quote-card-exporter")) return;

  var STYLE = [
    ":host{display:block;max-width:420px;margin:0 auto;",
    "  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;",
    "  --bg:#020617;--panel:#0b1120;--border:#1e293b;--gold:#f59e0b;--gold-soft:#fbbf24;",
    "  --text:#e8e6e1;--muted:#94a3b8;}",
    "*{box-sizing:border-box;margin:0;padding:0;}",
    ".loading,.error{padding:30px;text-align:center;color:var(--muted);font-size:13px;}",
    ".error{color:#fba5a5;}",
    ".card{background:linear-gradient(160deg,#0b1120,#111827);border:1px solid var(--gold);border-radius:18px;",
    "  padding:26px;box-shadow:0 20px 50px rgba(0,0,0,.45);}",
    ".tag{font-size:11px;letter-spacing:.16em;color:var(--gold-soft);text-transform:uppercase;margin-bottom:14px;}",
    ".q{font-size:19px;font-weight:700;color:var(--text);line-height:1.7;}",
    ".src{font-size:12.5px;color:var(--muted);margin-top:12px;}",
    ".src b{color:var(--gold-soft);}",
    ".layers{margin-top:18px;border-top:1px dashed var(--border);padding-top:14px;}",
    ".lh{font-size:12px;letter-spacing:.1em;color:var(--gold-soft);margin-bottom:10px;}",
    ".layer{display:flex;gap:9px;margin-bottom:9px;}",
    ".layer .n{flex:none;width:20px;height:20px;border-radius:50%;background:rgba(245,158,11,.15);color:var(--gold-soft);",
    "  font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;}",
    ".layer .lt{font-size:13px;color:var(--text);line-height:1.6;}",
    ".layer .lt b{color:var(--gold-soft);}",
    ".action{margin-top:16px;background:rgba(245,158,11,.07);border-left:3px solid var(--gold);border-radius:8px;padding:11px 13px;}",
    ".action .ah{font-size:11px;font-weight:700;color:var(--gold-soft);margin-bottom:4px;}",
    ".action .at{font-size:12.5px;color:var(--text);line-height:1.6;}",
    ".export{margin-top:16px;width:100%;border:none;border-radius:12px;background:linear-gradient(90deg,var(--gold),var(--gold-soft));",
    "  color:#020617;font-weight:700;font-size:14px;padding:13px;cursor:pointer;transition:opacity .15s;}",
    ".export:hover{opacity:.9;}",
    ".export:disabled{opacity:.5;cursor:default;}"
  ].join("");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function QuoteCardExporter() {
    var self = Reflect.construct(HTMLElement, [], QuoteCardExporter);
    return self;
  }
  QuoteCardExporter.prototype = Object.create(HTMLElement.prototype);

  QuoteCardExporter.prototype.connectedCallback = function () {
    var slug = this.getAttribute("slug") || "";
    var src = this.getAttribute("src") || "data/pillar-essays-data.json";
    var root = this.attachShadow({ mode: "open" });
    root.innerHTML = '<style>' + STYLE + '</style><div class="loading">载入金句卡中…</div>';
    var self = this;
    fetch(src).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        var list = data.essays || [];
        var e = null;
        for (var i = 0; i < list.length; i++) if (list[i].slug === slug) { e = list[i]; break; }
        if (!e) throw new Error("未找到 slug=" + slug);
        self._essay = e;
        render(root, e);
      })
      .catch(function (err) {
        root.querySelector(".loading").className = "error";
        root.querySelector(".error").textContent = "载入失败：" + err.message;
      });
  };

  function render(root, e) {
    var h = e.hero || {};
    var sources = (h.sources || []).join(" × ");
    var layers = (h.layers || []).map(function (l, i) {
      return '<div class="layer"><span class="n">' + (i + 1) + '</span><div class="lt"><b>' +
        esc(l.who) + '</b>：' + esc(l.text) + '</div></div>';
    }).join("");
    root.innerHTML = '<style>' + STYLE + '</style>' +
      '<div class="card">' +
      '  <div class="tag">Colin · 1-3-1 Quote Card</div>' +
      '  <div class="q">“' + esc(h.quote) + '”</div>' +
      '  <div class="src"><b>' + esc(sources) + '</b></div>' +
      '  <div class="layers"><div class="lh">1-3-1 · 三层解构</div>' + layers + '</div>' +
      (h.action ? '<div class="action"><div class="ah">微行动锚点</div><div class="at">' + esc(h.action) + '</div></div>' : '') +
      '</div>' +
      '<button class="export">导出高清 PNG（朋友圈分享）</button>';
    var btn = root.querySelector(".export");
    btn.addEventListener("click", function () { exportPNG(root, e); });
  }

  function wrapText(ctx, text, x, y, maxW, lh) {
    var line = "", lines = [];
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxW && line !== "") { lines.push(line); line = text[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    for (var j = 0; j < lines.length; j++) { ctx.fillText(lines[j], x, y); y += lh; }
    return y;
  }

  function exportPNG(root, e) {
    var h = e.hero || {};
    var W = 1080, H = 1350, pad = 84;
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");
    // 背景渐变
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0b1120"); g.addColorStop(1, "#111827");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 金边
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 4;
    ctx.strokeRect(pad - 24, pad - 24, W - 2 * (pad - 24), H - 2 * (pad - 24));
    var cx = pad;
    // 顶部标签
    ctx.fillStyle = "#fbbf24"; ctx.textBaseline = "top";
    ctx.font = "600 26px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("COLIN · 1-3-1 金句卡", cx, pad);
    var y = pad + 60;
    // 金句
    ctx.fillStyle = "#e8e6e1"; ctx.font = "700 46px 'PingFang SC','Microsoft YaHei',serif";
    y = wrapText(ctx, "“" + (h.quote || "") + "”", cx, y, W - 2 * pad, 66) + 28;
    // 出处
    ctx.fillStyle = "#94a3b8"; ctx.font = "500 28px 'PingFang SC','Microsoft YaHei',sans-serif";
    y = wrapText(ctx, (h.sources || []).join(" × "), cx, y, W - 2 * pad, 40) + 30;
    // 分隔
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(W - pad, y); ctx.stroke();
    y += 34;
    // 三层解构标题
    ctx.fillStyle = "#fbbf24"; ctx.font = "600 26px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("1-3-1 · 三层解构", cx, y); y += 46;
    (h.layers || []).forEach(function (l, idx) {
      ctx.fillStyle = "#fbbf24"; ctx.font = "700 30px 'PingFang SC','Microsoft YaHei',sans-serif";
      ctx.fillText((idx + 1) + ".", cx, y);
      ctx.fillStyle = "#e8e6e1"; ctx.font = "400 27px 'PingFang SC','Microsoft YaHei',sans-serif";
      y = wrapText(ctx, l.who + "：" + l.text, cx + 46, y, W - 2 * pad - 46, 40) + 16;
    });
    // 微行动锚点
    if (h.action) {
      y += 16;
      ctx.fillStyle = "#fbbf24"; ctx.font = "700 26px 'PingFang SC','Microsoft YaHei',sans-serif";
      ctx.fillText("微行动锚点", cx, y); y += 44;
      ctx.fillStyle = "#e8e6e1"; ctx.font = "400 26px 'PingFang SC','Microsoft YaHei',sans-serif";
      y = wrapText(ctx, h.action, cx, y, W - 2 * pad, 38) + 10;
    }
    // 页脚
    ctx.fillStyle = "#64748b"; ctx.font = "500 24px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("www.readswithcolin.com  ·  www.thecolin.vip", cx, H - pad - 8);

    var url = canvas.toDataURL("image/png");
    var a = document.createElement("a");
    a.href = url;
    a.download = "colin-quote-" + (e.slug || "card") + ".png";
    document.body.appendChild(a); a.click(); a.remove();
  }

  customElements.define("quote-card-exporter", QuoteCardExporter);
})();
