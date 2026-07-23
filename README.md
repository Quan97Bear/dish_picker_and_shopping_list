# 今晚吃什么

一个无登录、无后端、手机优先的家常菜单选择与采购清单静态应用。当前部署携带固定的 40 道简单家常菜，其中恰好 5 道汤，不含茄子。选菜者可按青椒/尖椒、鱼、猪肉、鸡蛋和辣味设置忌口筛选，也可以通过分享链接向接收者推荐菜单中尚未收录的新菜。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

终端会显示本地访问地址。应用运行时只加载本站的静态 JSON，不访问 GitHub 或其他 API。

## 测试与构建

```bash
npm run validate:data
npm test
npm run build
npm run preview
```

端到端测试首次运行前需要安装 Playwright 浏览器：

```bash
npx playwright install chromium
npm run test:e2e
```

生产文件输出到 `dist/`。`npm run build` 会自动检查部署产物，阻止 `AGENTS.md`、`.agents/skills`、PRD、测试、维护脚本、source map 和候选菜单等开发文件进入生产包。部署内容包含构建后的运行时菜谱数据；`dish-catalog.json` 是维护用候选清单，不会进入生产构建，应用运行时也不会请求它。部署平台必须发布 `dist/`，不能发布仓库根目录。

## 数据维护

- `data/dishes.json`：当前运行的 40 道完整菜谱。
- `data/dish-index.json`：与当前 40 道完全对应的轻量索引。
- `data/dish-catalog.json`：以后轮换菜品使用的本地候选清单。
- `data/source-manifest.json`：来源版本与人工复核状态。
- `data/aliases.json`：旧 ID 到新 ID 的兼容映射。

轮换菜品时，应先从候选清单选择条目，补齐并人工审核食材、份量、步骤及来源，然后同时更新详情和索引。运行 `npm run validate:data`，确保仍为 40 道、5 道汤、不含茄子且 ID 完全一致。新菜必须正确标注 `avoid`，以便忌口筛选。不要复用已发布过的 ID；必要时用 aliases 保持旧链接兼容。

当前 40 道菜的数据是可运行初稿。正式上线前仍应逐道对照 HowToCook 固定 commit，核实源文件路径、份量、步骤和食品安全表述，并在 `source-manifest.json` 填入 commit。

## 免费部署

### Cloudflare Pages（推荐）

连接仓库后设置 Build command 为 `npm run build`，Output directory 为 `dist`，无需启用 Functions。

### GitHub Pages

仓库已包含 `.github/workflows/deploy-pages.yml`。在仓库 Pages 设置中选择 GitHub Actions。工作流会把仓库名作为 Vite 子路径构建。

### Vercel

导入仓库，Framework Preset 选择 Vite，Build Command 使用 `npm run build`，Output Directory 使用 `dist`。本项目不需要 Functions。

## 隐私

应用不收集个人信息，不包含分析或广告。分享 URL 会保存菜品 ID、人数、点菜备注、新菜建议和协议版本；持有链接的人都能看到这些内容，因此请勿填写敏感信息。
