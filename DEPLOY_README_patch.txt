# readswithcolin.com 补全补丁（生成于 2026-09-27_1107）· 修复访谈互证上线后的 3 处遗漏

## 背景
RWC_2026-09-27_1052_访谈互证落地页+3篇访谈 已上线，但包内未含 3 类「站点级、包外却引用」的文件，导致新内容在部分入口不可见。本补丁修复：

## 修复 1：sitemap.xml（+4 条 URL）
新增 fangtan.html 与 3 篇访谈（yc-first-principles / cardone-10x / tkp-mindset）。
现有 URL 45 → 49。搜索引擎现已能收录新栏与 3 篇笔记。

## 修复 2：feed.xml（RSS，+3 条 item）
新增 3 篇访谈 item（标题/链接/描述/发布日期/分类=访谈互证），lastBuildDate 更新为 2026-09-27。
现有 item 35 → 38。RSS 订阅者现已能收到。

## 修复 3：39 篇旧文章页导航/footer 补「访谈互证」入口
旧文页（如 internal-anchor.html）的「专栏」下拉与 footer「浏览」区原本只有 资治通鉴/毛选精读/天道，缺访谈互证。
本补丁在 39 篇旧文中统一补入（与 3 篇新文、3 个主页面一致）：
  - nav 下拉：在「天道」后加 Interview Cross-Verification / 访谈互证
  - footer 浏览：在「3-2-1 Thursday」后加同款链接
（3 篇新访谈笔记本身已含，未重复修改。）

## 部署步骤
1. 解压，把 sitemap.xml、feed.xml 覆盖到仓库根目录；把 posts/ 下 39 个文件覆盖到对应目录（保持相对路径）。
2. git add . && git commit -m "patch: sitemap+feed+nav for 访谈互证" && git push
3. Vercel 自动部署。约数小时~1 天后 Google/Bing 收录新页；RSS 阅读器下次拉取即见。

## 注意
- 本补丁只动 sitemap.xml / feed.xml / 39 篇旧 posts，不影响已上线的 fangtan.html 与 3 篇访谈正文。
- 若你尚未上传那 4 篇读书笔记（RWC_2026-09-26_1710），它们仍不在 sitemap/feed 中——正常，待你审完上传后需再补一次（可复用本脚本逻辑）。
