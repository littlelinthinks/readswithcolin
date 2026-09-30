# readswithcolin.com 部署包（生成于 2026-09-26_2338）· 访谈互证栏

## 本次变更
1. 新增「访谈互证」分类/专栏（slug: interview）
   - data/categories.json：新增 interview 分类（Interviews & Cross-Verification / 访谈互证）
   - categories.html：新增顶部 chip + 数据驱动分栏区块（#interview，自动从 posts.json 拉卡片）+ 导航「专栏」下拉入口
   - archive.html：新增筛选按钮 + 导航下拉入口 + 卡片配色
   - index.html：导航「专栏」下拉新增「访谈互证」入口
2. 访谈互证首篇：posts/yc-first-principles.html（Y Combinator × 资治通鉴 中西互证笔记）
   - 配套封面 img/covers/yc-first-principles.svg
   - data/posts.json：新增 RWC #40（category=interview, isNew=true, publishedAt 2026-09-26）
3. 顺手对齐：internal-anchor 在 posts.json 残留的 DOAC 伪引文，已改为可核实的爱比克泰德《手册》第 5 节真句（与已修 HTML 一致）。

## 路由决策（已与 Colin 确认）
- thecolin.vip：不上任何访谈内容（长文站，守住《资治通鉴》主轴）。
- readswithcolin.com：所有访谈萃取内容一律归「访谈互证」栏。
- 防乱纪律（访谈提取卡 SOP 核心）：每篇访谈内容 MUST 做中西互证、绑定一个东方经典锚点（通鉴/诸子）；绑不上的，不发布。引文只保留可逐字核实的来源（如 YC "Make something people want"），不得伪托。

## 部署步骤
1. 解压，把 data/、categories.html、archive.html、index.html、posts/、img/covers/ 覆盖到仓库对应目录（保持相对路径）。
2. git add . && git commit -m "add 访谈互证 column + YC note" && git push
3. Vercel 自动部署；分类页/归档/首页会自动出现「访谈互证」卡片与 YC 笔记。
