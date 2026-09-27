# readswithcolin.com 部署包（生成于 2026-09-27_1052）· 访谈互证专栏（独立落地页 + 3 篇访谈）
# 本包【取代】RWC_2026-09-26_2338_*（仅 YC 单篇+分类锚点）与 RWC_2026-09-27_0946_*（同内容旧时间戳）。请勿重复上传旧包。

## 本次变更
1. 新增独立策展落地页 fangtan.html（访谈互证专栏，与通鉴/天道/毛选同款原生骨架）
   - 栏目引言、为什么读、怎么讲（摘录/西方之术/东方之道/习而新之）、3 篇已成稿预告、承诺 loop、引文诚信声明
2. 访谈互证专栏 3 篇笔记：
   - posts/yc-first-principles.html（RWC #40，Y Combinator × 资治通鉴）
   - posts/cardone-10x.html（RWC #41，Grant Cardone × 资治通鉴）
   - posts/tkp-mindset.html（RWC #42，TKP × 诸子百家）
3. 新增封面：img/covers/cardone-10x.svg、img/covers/tkp-mindset.svg（yc 封面沿用既有）
4. data/posts.json：新增 #41/#42（category=interview），现访谈互证共 3 篇
5. data/categories.json：保留 interview 分类（分类页数据驱动区块生效）
6. 全站导航 + footer：index/archive/categories/三篇 posts 的「专栏」下拉与「浏览」footer 均指向 fangtan.html

## 引文诚信（延续此前纪律）
- Cardone：取自其 2016 公开著作《Be Obsessed or Be Average》书名主旨（即中心论点），未编造逐字访谈对话。
- TKP：引用查理·芒格 1994 南加大演讲原话「心智模型格栅」（可核实）；TKP 仅作"心智模型+广读"取向引用。
- YC："Make something people want" 为 YC/Paul Graham 创业公理。
- 三篇均只在底部置「引文说明」，标注可核实来源，杜绝伪托。

## 部署步骤
1. 解压，把 fangtan.html、posts/、img/covers/、data/、index.html、archive.html、categories.html 覆盖到仓库对应目录（保持相对路径）。
2. git add . && git commit -m "add 访谈互证 column landing + 3 interview notes" && git push
3. Vercel 自动部署；首页/分类页/归档页/导航下拉/footer 均出现「访谈互证」入口与 3 篇笔记。
