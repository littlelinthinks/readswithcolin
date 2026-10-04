# readswithcolin 智库升级包（深度思想微型智库）

> ⚠️ **安全底线**：本包只在你的仓库**新增**以下目录与文件，**100% 不改动**任何现有代码 / 路由 / 全局样式。
> 撤销方法：删除本包新增的 `components/`、`data/`、`posts/` 三个目录即可，零残留。

## 目录结构（请整包拖进仓库根目录）

```
readswithcolin-site/
├── components/widgets/
│   ├── pillar-essay-layout.js      # 基石长文排版（1-3-1 金句卡 + 黄金三段论 + 微行动沙箱）
│   ├── quote-card-exporter.js      # 暗黑金 1-3-1 闪卡 PNG 导出器
│   └── mental-model-latticework.js # 42 本图书思维模型网格（数据驱动 + 场景过滤）
├── data/
│   ├── pillar-essays-data.json     # 4 篇 3000 字基石长文结构化数据
│   └── books-grid.json             # 42 本图书网格数据（由你线上 42 篇书评自动生成）
├── posts/
│   ├── essay1-zizhitongjian.html   # 《智伯之亡与权力的复利极限》
│   ├── essay2-jianyubuzou.html     # 《为什么绝大多数人学不会“见路不走”》
│   ├── essay3-maoxuan.html         # 《实事求是与主要矛盾》
│   └── essay4-interviews.html      # 《从 YC 第一性原理到东方诸子百家》
└── 智库组件展示.html               # 演示页（可选，勿覆盖 index.html）
```

> 说明：任务里写的 `data/pillar-essays-data.json` 是 4 篇长文数据；"42 本图书" 的真实数据源是你线上的 42 篇书评，已抽成 `data/books-grid.json`（含分类场景标签与文章链接）。两者都保留了。

## 上线步骤

1. 把 `components/`、`data/`、`posts/` 三个目录**整包拖进 readswithcolin 仓库根目录** → Commit → Vercel 自动部署。
2. 长文页已自带组件引用，**无需改 index.html**，直接访问 `你的域名/posts/essay1-zizhitongjian.html` 即可看到效果。
3. （可选）想在某个现有页面嵌入组件，在目标位置放标签、`</body>` 前加 1 行 script：

   **42 本图书网格**：
   ```html
   <mental-model-latticework src="data/books-grid.json"></mental-model-latticework>
   <script src="components/widgets/mental-model-latticework.js"></script>
   ```
   **金句闪卡导出**：
   ```html
   <quote-card-exporter slug="zizhitongjian-zhibo-zhi-wang" src="data/pillar-essays-data.json"></quote-card-exporter>
   <script src="components/widgets/quote-card-exporter.js"></script>
   ```

## 技术说明

- 全部为**纯静态 Web Components + Shadow DOM，零依赖**，样式完全隔离，不碰老站 CSS。
- 组件运行时 `fetch` 对应 JSON；JSON 缺失或路径错误时，网格/清单会自动回退到内置数据，不会白屏。
- 长文页与组件都已用无头浏览器实跑验证：4 篇 slug 均正常渲染、金句卡可导出 PNG、图书网格筛选正常。

## 撤销

删除 `components/`、`data/`、`posts/` 三个目录即可，老站一切照旧。
