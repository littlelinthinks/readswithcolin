# READS WITH COLIN OS

**READING TO CHANGE YOURSELF**

Personal Reading + Knowledge + Action + Decision System.
不是"记录我读过什么书"，而是"记录书籍如何改变我的思想、判断和行动"。

核心链条：

```
Book → Idea → Evidence → Connection → Action → Decision → Result → Review → Principle
```

---

## 一、技术架构

```
index.html                 外壳（侧栏 / 底栏 / FAB / 离线提示）
app.css                    设计系统（Calm · Focused · Intellectual）
js/
  db.js       数据层       IndexedDB Adapter + Schema + ID 生成器
  store.js    业务层       实体 CRUD / 查重 / 跨库搜索 / Dashboard 聚合
  views.js    视图层       Dashboard / Books / Detail / Log / Ideas / Evidence / Connections / Graph / Actions / Decisions / Principles / Reviews / Evolution / AI 助手 / Search / Settings
  ai.js       AI 抽象层    provider 无关 / 接地检索 / 本地语义近似 / AI 配置（Key 存本地）
  sync.js     同步脚手架     Supabase Storage 备份即同步（默认关闭、配置驱动）
  app.js      应用外壳     路由 / 事件委托 / Quick Capture / PWA 注册
  xlsxio.js   导入导出     Excel ↔ 数据库 / JSON 备份（ID 永不破坏）
  ui.js       组件库       弹窗表单 / Toast / 图表 / 空状态
  seed.js     引导         首启欢迎 + 演示数据
sw.js / manifest.webmanifest  PWA：可安装、离线、独立图标
vendor/xlsx.full.min.js      SheetJS（本地打包，无 CDN 依赖）
```

**数据层抽象（为将来 Supabase 预留）**：`store.js` 只依赖 `db.js` 的 Adapter 接口
（`all / get / put / bulkPut / del / byIndex / dump / restore`）。
将来切换云端数据库时，只需新写 `db.supabase.js` 实现同样接口并替换引用，业务与视图层零改动。

## 二、数据库 Schema（IndexedDB，9 表）

| 表 | 主键 | 关键字段 | 索引 |
|---|---|---|---|
| books | BK-xxxx | title/titleEn/author/authors/publisher/isbn/language/edition/category/topics/status/format/rating/coreQuestion/source/needsReview… | status/category/author/topics |
| logs | LG-xxxx | bookId/date/chapter/pages/minutes/summary/interpretation/question/disagreement | bookId/date |
| ideas | ID-xxxx | bookId/idea/interpretation/whyImportant/application/tags/aiGenerated | bookId/date/tags |
| evidence | EV-xxxx | **type(author_claim/book_fact/historical_fact/research/my_inference)**/content/source/confidence | type/bookId/ideaId |
| connections | CN-xxxx | from/to(type+id)/relation(similar/conflict/complementary/causal/extension/correction)/newUnderstanding | fromId/toId/relation |
| actions | AC-xxxx | source/action/status(todo/doing/done/cancelled/deferred)/expectedResult/actualResult/review | status/sourceId |
| decisions | DC-xxxx | decision/facts/unknowns/assumptions/mentalModel/alternatives/choice/reason/result/review | date/bookId |
| principles | PR-xxxx | principle/conditions/exceptions/risks/applications/lastReview/stillValid/status | status/lastReview |
| reviews | RV-xxxx | period(daily…yearly)/periodKey/content | period/periodKey |

ID 规则：`前缀-0001` 递增，**永不复用**；Excel/JSON 导入时已有 ID 原样保留并同步计数器。

## 三、Phase 状态（对齐《WorkBuddy Engineering Roadmap》总纲）

- [x] **Phase 1 项目审计与系统接管** — 继承可运行应用，架构 / 功能 / 数据审计完成；IndexedDB 9 表底座与本地持久化跑通
- [x] **Phase 2 数据库与知识资产工程化** — Evidence / Connections / Actions / Decision Journal / Principles / Reviews 全量闭环 + 千本级数据底座（导入器 v2：快照回滚 / 增量幂等 / 需复核标记 / Excel 导入契约）
- [x] **Phase 3 核心阅读体验与 Mobile First** — Quick Capture（2 次点击）/ 书详情 9 Tab 全景（新增 Questions + Principles 聚合）/ iPhone 模拟走查通过（touch target ≥44px、safe-area、tabs 横向滚动、零 console error）
- [x] **Phase 4 知识图谱与跨书连接** — D3 力导向总览 + 聚焦钻取 + 关系 / 类型筛选 + 搜索定位（详见下文）
- [x] **Phase 5 行动-决策-原则-个人进化** — Action/Decision/Principle/Review 闭环 + **Personal Evolution 纵向时间线**：同一主题/书/原则，几年后我的答案如何变化（不新增表，从带日期实体按 track 聚合）
- [x] **Phase 6 AI 助手 + 语义搜索 + 同步脚手架** — AI 抽象层（provider 无关 / Key 存本地 / 无 Key 优雅降级 / 接地检索 / 输出全标 `aiGenerated`）；Ask My Library；书籍分析草稿；混合/语义搜索；Supabase 同步脚手架（默认关闭、配置驱动）

### Phase 5：Personal Evolution 纵向视图

- **track 三类**：我的原则（每条在用原则）、书籍（每本书）、主题标签（出现 ≥2 次的高频标签）。
- **时间线**：选一条 track → 按年分组，把相关 Ideas/Logs/Evidence/Actions/Decisions/Principles 按日期串成线，直观看到「同一问题，几年后答案变了什么」。
- 不新增任何数据表，纯从现有带日期实体聚合——这才是个人知识资产的复利。

### Phase 6：AI 助手 + 语义搜索 + 同步脚手架

- **AI 抽象层（`js/ai.js`）**：默认走 OpenAI 兼容 `/chat/completions` + `/embeddings`；Key 存 `localStorage`，绝不进代码仓库；无 Key 时所有 AI 功能优雅降级——Ask My Library 退化展示检索片段、语义搜索退化本地分词近似（`tokenize` 二元 bigram + `localSemanticScore` + `cosine`）。
- **接地原则（Grounded）**：AI 只能引用你自己的数据库片段；无证据明确说 "No evidence found in your library."，绝不幻觉补全。所有 AI 产出标记 `aiGenerated: true`，且必须经你点「保存」才入库。
- **Ask My Library**：输入问题 → 检索相关片段 →（配 AI）综合成带 `[n]` 引用的回答；附可点击的引用片段。
- **书籍分析**：选书 → AI 提取核心思想/问题/行动/矛盾点，全部为草稿，逐项保存。
- **混合 / 语义搜索**：搜索页可切「全文 / 语义」。语义模式配 AI 用 embedding 真语义，否则本地分词近似；每条结果标注「为何匹配」。
- **同步脚手架（`js/sync.js`）**：默认关闭、配置驱动。启用后把数据库 dump 备份到 Supabase Storage（设备 ID 命名，`x-upsert`），诚实实现「备份即同步」；增量合并/冲突解决留待后续一轮。

### Phase 2 交付明细

| 模块 | 说明 |
|---|---|
| Evidence | 独立页面 + 类型筛选；五种类型各有独立视觉语言：**作者主张 = 金色虚线 + 斜体引文 + 「这不是事实」标注**；我的推断 = 灰点线 + 浅底；三类事实 = 实线 + 绿/墨徽章。绝不让「作者说」伪装成事实 |
| Connections | 六类关系（相似/冲突/互补/因果/延伸/修正）+ 必填「我的新理解」；跨书自动标记；节点可跨 books / ideas / evidence 任意连接；书详情页 Connections Tab 同步展示 |
| Actions | 独立页面 + 状态筛选；勾选完成强制填写「实际结果 + 复盘」，完成率实时统计 |
| Decisions | 完整决策日志：背景 / 已知事实 / 未知 / 假设 / 心智模型 / 备选 / 选择 / 理由 / 结果 / 复盘，支持关联书籍与原则 |
| Principles | 「原则不是摘录」纪律条；复审（更新 stillValid + lastReview）/ 修改 / 归档 / 恢复完整生命周期 |
| Reviews | 日/周/月/季/年五档自动汇总（阅读、思想、证据、连接、行动、决策、原则），笔记随写随存；历史复盘可回跳；书籍详情 Reviews Tab 显示本书出现的复盘 |
| 导航 | 侧栏按 INPUT / KNOWLEDGE / OUTPUT / SYSTEM 分组；手机底栏改为 Dashboard / Books / + / Ideas / More（More 抽屉列出全部 12 个功能） |

### Phase 2 增补：千本级数据底座与批量导入（豆包书单）

为承接「豆包整理的上千套书单，且随时增量更新」而做的数据工程化：

- **Books 扩字段**：新增 `authors[]`（多作者实体，由 author 自动拆分）、`publisher` / `isbn` / `language` / `edition` / `source`，以及 `needsReview` + `reviewReasons`（缺关键字段自动标需复核，绝不编造）。
- **导入器 v2**：导入前自动快照（可一键回滚）；按类型还原数组/数字；缺书名跳过、缺 ISBN/作者标需复核；**增量幂等**（有 ID 合并、无 ID 补发，绝不清空已有数据）；1000+ 行分块回调进度，不卡 UI。
- **Books 列表分块渲染**：首屏只渲 48 本 +「加载更多」，承载 1000~10000+ 本不卡顿；新增「需复核」筛选。
- **豆包导入契约**：见 `导入契约.md`，Settings → 下载导入模板 即得标准 Excel 表头。

### Phase 4：知识图谱可视化

- **Knowledge Graph 页**（导航 KNOWLEDGE 组）：把 `connections`（六类关系）+ 书籍 `relatedBookIds` 聚合成可交互的力导向网络。D3 v7 本地化于 `vendor/`，无 CDN 依赖，零改数据库 Schema。
- **节点三类形状**：书籍（方）/ 思想（圆）/ 证据（菱形），大小随连接度增长；边按关系类型着色，「相关书」弱边为灰虚线。阅读记录（logs）颗粒过细，默认不入图。
- **聚焦钻取**：点击节点 → 高亮其全部邻居、淡出其余，右侧详情卡显示节点类型、原文、所属书与完整关系网（「查看」可跳转对应书籍/列表）；点击空白或 × 清除聚焦。
- **工具栏**：按关系类型 / 节点类型筛选，搜索框按文本实时定位（防抖）；左下图例说明形状与颜色。
- **性能**：只渲染有连接的节点；节点 > 500 时自动收紧布局参数；聚焦不重建全图。
- 演示数据已含三条跨书连接，首次启动即可看到图谱效果。

## 四、使用与部署

- 本地预览：`python3 -m http.server 8910` → http://localhost:8910
- 部署：整个目录上传到任意静态托管（Nginx / 对象存储 / GitHub Pages 均可）
- iPhone 安装：Safari 打开 → 分享 → 添加到主屏幕
- 备份纪律：Settings → 导出 JSON，建议每周一次；导入时选择「合并」不会破坏现有数据
