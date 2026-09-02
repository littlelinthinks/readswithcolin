/* ==========================================================================
   Reads with Colin — 站点交互脚本
   1) 订阅表单：前端演示版（接入真实服务见 README）
   2) 返回顶部按钮
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- 订阅表单 ---------- */
  document.querySelectorAll(".subscribe-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var email = input ? input.value.trim() : "";
      var success = form.parentElement.querySelector(".subscribe-success");

      // 简单邮箱格式校验
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        input.style.borderColor = "#c0392b";
        input.focus();
        return;
      }
      input.style.borderColor = "";

      /* ------------------------------------------------------------
       * 接入真实的订阅服务时，替换下面这段演示逻辑，例如 Mailchimp：
       *   fetch('https://xxx.list-manage.com/subscribe/post?u=...&id=...', {
       *     method: 'POST', body: new FormData(form) })
       * 或直接把 <form action="..."> 指向服务提供的地址。
       * 详见 README.md「接入订阅服务」一节。
       * ------------------------------------------------------------ */
      try { localStorage.setItem("rwc-subscribed", email); } catch (err) {}

      form.style.display = "none";
      if (success) {
        success.textContent =
          "🎉 Thanks for subscribing — welcome aboard, reader! " +
          "感谢订阅，欢迎加入我们的阅读之旅。";
        success.classList.add("show");
      }
    });
  });

  // 已订阅过的访客直接显示成功态
  try {
    if (localStorage.getItem("rwc-subscribed")) {
      document.querySelectorAll(".subscribe-form").forEach(function (form) {
        var success = form.parentElement.querySelector(".subscribe-success");
        if (success && success.textContent.indexOf("已") === -1 && !success.classList.contains("show")) {
          // 不强制隐藏表单，保留再次输入的机会
        }
      });
    }
  } catch (err) {}

  /* ---------- 返回顶部 ---------- */
  var backTop = document.querySelector(".back-top");
  if (backTop) {
    window.addEventListener(
      "scroll",
      function () {
        backTop.classList.toggle("show", window.scrollY > 600);
      },
      { passive: true }
    );
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 平滑展开文章正文外链（新标签页） ---------- */
  document.querySelectorAll('.post-body a[href^="http"]').forEach(function (a) {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });

  /* ==========================================================================
     双语切换 (i18n)
     - 通过 CSS [lang=zh] [lang=en] { display:none } 隐藏不匹配语言的内容
     - 优先从 URL 参数 ?lang=zh/en 读取；否则从 localStorage；否则按浏览器语言
     - 切换后写入 localStorage 并同步 URL（不刷新页面）
     ========================================================================== */
  var STORAGE_KEY = "rwc-lang";
  var SUPPORTED = { en: "en", zh: "zh", "zh-cn": "zh", "zh-hans": "zh" };
  function detectLang() {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (fromUrl && SUPPORTED[fromUrl.toLowerCase()]) {
      return SUPPORTED[fromUrl.toLowerCase()];
    }
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED[saved]) return SUPPORTED[saved];
    } catch (err) {}
    var nav = (navigator.language || "en").toLowerCase();
    if (nav.indexOf("zh") === 0) return "zh";
    return "en";
  }
  function applyLang(lang) {
    document.documentElement.setAttribute("lang", lang);
    // 高亮切换器
    document.querySelectorAll(".lang-switch [data-set-lang]").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-set-lang") === lang);
    });
    // 同步订阅成功提示（多语言）
    document.querySelectorAll(".subscribe-success[data-success-en]").forEach(function (el) {
      el.textContent = el.getAttribute(lang === "zh" ? "data-success-zh" : "data-success-en");
    });
    // 同步页脚年份/版权其实不需要，i18n 已通过 [lang=en/zh] 隐藏
    // 同步 URL（不刷新）
    try {
      var url = new URL(location.href);
      if (url.searchParams.get("lang") !== lang) {
        url.searchParams.set("lang", lang);
        history.replaceState(null, "", url.toString());
      }
    } catch (err) {}
  }
  var currentLang = detectLang();
  applyLang(currentLang);
  // 绑定切换按钮
  document.querySelectorAll(".lang-switch [data-set-lang]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var lang = el.getAttribute("data-set-lang");
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (err) {}
      applyLang(lang);
      // 平滑滚到顶，避免切换后位置错乱
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* ---------- 微信分享弹层（中文版） ---------- */
  var wxBtn = document.querySelector(".share-btn.wechat");
  var wxModal = document.querySelector(".wx-modal");
  if (wxBtn && wxModal) {
    wxBtn.addEventListener("click", function (e) {
      e.preventDefault();
      var pageUrl = location.href;
      var linkEl = wxModal.querySelector(".wx-link");
      if (linkEl) linkEl.textContent = pageUrl;
      try { navigator.clipboard && navigator.clipboard.writeText(pageUrl); } catch (err) {}
      wxModal.classList.add("show");
    });
    wxModal.addEventListener("click", function (e) {
      if (e.target === wxModal || e.target.classList.contains("wx-close")) {
        wxModal.classList.remove("show");
      }
    });
  }

  /* ---------- 通用：复制链接按钮 ---------- */
  document.querySelectorAll(".share-btn.copy-link").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var url = location.href;
      var done = function () { btn.textContent = "✓ Copied 已复制"; setTimeout(function(){ location.reload(); }, 1200); };
      try { navigator.clipboard.writeText(url).then(done, done); } catch (err) { done(); }
    });
  });
})();
