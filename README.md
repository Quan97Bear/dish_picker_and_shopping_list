# 今晚吃什么

手机优先的中文选菜、菜谱和采购清单网页。当前生产版本为静态应用，无登录、无后端，运行时不访问 GitHub 或付费 API。

线上地址：[dish-picker.pages.dev](https://dish-picker.pages.dev)

## 开始开发

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

## 手机联调

日常手机 Demo 不需要构建：

```bash
npm run demo:phone
```

手机与电脑连接同一 Wi‑Fi，然后打开终端显示的 `Network` 地址。开发服务器会
监听代码变化并自动刷新；服务保持运行时，不需要重复启动，也不需要 Codex
参与。

关闭本项目的手机 Demo：

```bash
npm run demo:stop
```

该命令只停止工作目录属于本项目、并且监听 5173 端口的进程。端口没有服务时
直接成功；如果端口属于其他项目，它会拒绝停止，避免误杀。

只有最终发布检查需要构建并预览 `dist/`：

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

## 自动化检查

| 目的 | 命令 | 固定执行内容 |
| --- | --- | --- |
| 日常快速检查 | `npm run check:fast` | 数据校验、Vitest、构建、部署产物检查、文档检查 |
| 手机关键流程 | `npm run check:phone` | 构建后用 Chromium 和 WebKit 检查奶油色、预览覆盖与滚动恢复 |
| 发布前完整检查 | `npm run check:full` | 快速检查加全部 Playwright 流程 |
| 只检查文档 | `npm run validate:docs` | 本地链接、README 命令、历史说法、文档职责和本地资源哈希 |

文档检查器位于 `scripts/validate-docs.mjs`。通常使用
`npm run validate:docs`；只有排查脚本本身时才直接运行：

```bash
node scripts/validate-docs.mjs
```

首次运行端到端测试前安装 Chromium：

```bash
npx playwright install chromium
```

## 在 Codex Chat 中使用

直接发送下面任意一句即可，不需要解释命令内部步骤：

| Chat 中发送 | Codex 执行 |
| --- | --- |
| `开手机Demo`、`手机Demo`、`phone demo` | 复用已经运行的 5173 服务；没有服务时启动 `npm run demo:phone`，然后返回手机 URL |
| `关闭手机Demo`、`kill phone demo`、`stop demo` | `npm run demo:stop` |
| `跑快检`、`quick test` | `npm run check:fast` |
| `跑手机检查`、`quick phone test` | `npm run check:phone` |
| `跑全检`、`full test` | `npm run check:full` |
| `检查文档` | `npm run validate:docs` |

`demo:phone` 是持续运行的开发服务；其余命令执行完会直接报告通过或失败。
Chat 请求只运行对应的固定入口，不临时拼接另一套流程。

本地固定流程由 `scripts/run-workflow.mjs` 执行。如果 Codex 的托管 shell
只有 Node、没有 npm，Codex 会用当前 Node 直接运行同一个 workflow；不会
安装 npm，也不会改写检查步骤。

## 重要目录

- `src/domain/`：不依赖 DOM 的菜单与采购领域逻辑
- `src/features/`：按用户流程组织的选菜与收件人界面
- `src/infrastructure/`：运行时数据加载
- `src/shared/`：跨功能共享的分享、二维码与提示工具
- `data/dishes.json`：生产环境使用的 40 道完整菜谱
- `data/dish-index.json`：与生产菜谱对应的轻量索引
- `data/dish-catalog.json`：只在本地使用的轮换候选池
- `tests/`：Vitest 与 Playwright 测试
- `dist/`：唯一允许部署的构建产物

菜品数据约束、URL 合同和验收规则见
[`docs/PRODUCT_REQUIREMENTS.md`](docs/PRODUCT_REQUIREMENTS.md)。

## 部署

生产环境是 Cloudflare Pages 项目 `dish-picker`：

```bash
npm run validate:data
npm test
npm run build
npx wrangler pages deploy dist --project-name dish-picker --branch main
```

只发布 `dist/`。`npm run build` 会检查部署产物，阻止项目指导、skills、文档、测试、维护脚本、本地候选池和 source map 泄漏到生产环境。

Cloudflare Pages 配置：

- Build command：`npm run build`
- Output directory：`dist`
- Node.js：20 或更高
- P0/P1 不启用 Pages Functions

## 文档入口

AI 和维护者从 [`AGENTS.md`](AGENTS.md) 开始。它会根据任务指向唯一的下一份文档。

- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)：现在生产环境是什么、已知问题是什么
- [`docs/TODO.md`](docs/TODO.md)：正在做什么、下次从哪里继续
- [`docs/PRODUCT_REQUIREMENTS.md`](docs/PRODUCT_REQUIREMENTS.md)：稳定产品合同
- [`docs/PRODUCT_ROADMAP.md`](docs/PRODUCT_ROADMAP.md)：批准的未来需求和优先级
- [`NOTICE.md`](NOTICE.md)：菜谱来源与许可证说明
