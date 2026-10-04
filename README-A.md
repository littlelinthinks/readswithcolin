# 组件 A · 金句闪卡 → readswithcolin 仓库

本包只含 1 个组件，上传到 **readswithcolin.com** 对应的 GitHub 仓库。

## 文件
- `quote-flashcard.js` — 1-3-1 金句闪卡（Web Component + Shadow DOM，零依赖）

## 粘贴步骤（1 个文件 + 2 行代码）

1. 上传 `quote-flashcard.js` 到仓库**根目录**（GitHub 网页版 Add file → Upload files）。
2. 编辑你**现有的首页 HTML**，在 `</body>` 之前加一行：
   ```html
   <script src="quote-flashcard.js"></script>
   ```
3. 在首页想放闪卡的位置（比如顶部）加一行：
   ```html
   <quote-flashcard></quote-flashcard>
   ```
4. Commit → Vercel 自动部署 → 刷新 `readswithcolin.com` 即可看到。

## 换成你自己的金句（可选）
```html
<quote-flashcard quotes='[{"quote":"金句","author":"出处","context":["解构1","解构2","解构3"],"action":"微行动"}]'></quote-flashcard>
```
不传就用内置的 3 张（防波堤 / 见路不走 / 第一性原理）。

## 撤回（零风险）
- 删掉你加的那 2 行 → commit → 立刻恢复原样；
- 或 GitHub 删掉 `quote-flashcard.js` → commit；
- 或 Vercel → Deployments → 部署前那条 → Promote to Production 一键回滚。

**你现有首页的结构、CSS、主题从头到尾没被改动**，只是新增文件 + 2 行引用。
