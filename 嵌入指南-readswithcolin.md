# readswithcolin.com 智库组件嵌入指南

## 现状说明

200 大跨学科思维模型（痛点诊所 + 付费墙）、35 本图书网格、4 篇长文与金句卡**已全部在线**，但目前挂在独立演示页上：

> 🔗 直接访问：<https://www.readswithcolin.com/智库组件展示.html>

站内导航暂无入口指向它。要让访客在正式页面看到，按下面粘贴即可。

## 怎么嵌（推荐嵌到 index.html 首页底部，或 archive.html）

打开目标页面，找到**最底部**的 `</body>`，把下面整段粘贴到它**前面**：

```html
<!-- ===== 深度思想微型智库 · Web Components 挂载 ===== -->
<script src="components/widgets/mental-model-latticework.js"></script>
<script src="components/widgets/pillar-essay-layout.js"></script>
<script src="components/widgets/quote-card-exporter.js"></script>

<section style="max-width:1200px;margin:60px auto;padding:0 20px;">
  <h2 style="text-align:center;margin:0 0 24px;">🧠 200 大跨学科思维模型 · 痛点诊所</h2>
  <mental-model-latticework src="data/mental-models-200.json"></mental-model-latticework>

  <h2 style="text-align:center;margin:56px 0 24px;">📚 35 本精选图书 · 思维模型网格</h2>
  <mental-model-latticework src="data/books-grid.json"></mental-model-latticework>
</section>
<!-- ===== 智库挂载结束 ===== -->
```

## 按需删减

| 想展示 | 保留哪段 |
|---|---|
| 200 思维模型（痛点下拉 + L1/L2/L3 + 毛玻璃付费墙） | `<mental-model-latticework src="data/mental-models-200.json">` |
| 35 本图书网格 | `<mental-model-latticework src="data/books-grid.json">` |
| 长文页专用（posts/ 里已挂好，无需重复） | pillar-essay-layout / quote-card-exporter |

## 注意事项

- 两个 `<script>` 每页引一次即可；posts/ 下的长文页**已经**引用了 pillar-essay-layout 和 quote-card-exporter，不要重复改它们；
- `src` 路径相对页面：根目录页面用 `data/...`，`posts/` 子目录页面用 `../data/...`；
- 组件样式全部隔离在 Shadow DOM，不碰老站 CSS，整段可随时删除。

## 长文页直达链接（可加进导航/归档页）

- `posts/essay1-zizhitongjian.html` 资治通鉴 · 摄政之望
- `posts/essay2-jianyubuzou.html` 刻意练习 · 步步为营三部曲
- `posts/essay3-maoxuan.html` 毛选 · 实事求是抓主要矛盾
- `posts/essay4-interviews.html` 访谈录 · YC 第一性原理与东方智慧
