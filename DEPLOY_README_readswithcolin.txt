# readswithcolin.com 部署包（生成于 2026-09-26_1710）

新增 4 篇中西互证内容 + 封面图 + 索引更新：
- posts/reading-os.html        《习而新之》芒格 × 资治通鉴（心智修炼）
- posts/internal-anchor.html   《当现代心理学撞上东方解脱道》斯多葛/爱比克泰德 × 资治通鉴（心智修炼）
- posts/321-thursday-01.html   《3-2-1 周四》第 001 期 周报（心智修炼）
- posts/beyond-shallows.html   《越过浅水区》Cal Newport 深度阅读书评（英文原著）
- img/covers/*.svg            4 张配套封面（石/琥珀色系）
- data/posts.json             已加入 4 条索引（rwcNumber 36-39，isNew=true，publishedAt 2026-09-26）

部署步骤：
1. 解压本包，把 posts/、img/covers/、data/posts.json 覆盖到仓库对应目录（保持相对路径）。
2. git add . && git commit -m "add east-meets-west notes + 3-2-1 + book review" && git push
3. Vercel 自动部署；首页/归档/分类列表会自动出现新卡片。

质量说明（本版已修复）：
- internal-anchor.html 原有一句"改编自 DOAC"的伪引文，已替换为可逐字核实的爱比克泰德《手册》第 5 节真句
  （"Men are disturbed not by things, but by the views which they take of things."），东西互证更站得住。
- 4 篇文章页为自包含（内联样式 + 站点 nav/footer + 双语切换），引用 ../img 资源与 ../sw.js，零横向溢出。
