# 家常菜单选择与采购清单 App — 产品需求文档（PRD）

版本：1.1  
日期：2026-07-21  
产品定位：免费、无登录、手机优先的静态网页应用

## 版本 1.1 变更说明（2026-07-21）

本版本的以下规则优先于文档中尚未更新的旧数量和旧菜单示例：

- 当前运行菜单由 30 道扩展为恰好 40 道简单家常菜，其中仍为恰好 5 道汤。
- 当前 40 道菜及其食材不得包含茄子；保留尖椒和青椒类菜品。
- 选菜页提供可多选的忌口筛选，首版包括“不要青椒/尖椒”、“不要鱼”、“不要猪肉”、“不要鸡蛋”和“不吃辣”。
- 点餐者可为每道已选菜添加最多 80 字的备注。
- 备注与菜品 ID、份数一起编码进分享 URL，接收者可在对应菜谱中看到。
- 备注不应包含隐私或敏感信息；持有链接的人均可读取备注。

## 1. 产品概述

### 1.1 背景

两个人决定晚餐时，通常有两个分离的任务：一个人只想轻松选出“今天想吃什么”，另一个人需要知道“买什么、买多少、怎么做”。本产品用一个可分享 URL 串起这两个任务，不要求双方注册账号，也不需要服务器、数据库或付费 API。

### 1.2 产品目标

构建一个静态 Web App：

1. 选菜者在手机上浏览家常菜，只看到菜名、分类及可选图片，不看到食材与步骤。
2. 选菜者将若干菜加入“今日菜单”，点击“生成菜单”。
3. 应用把所选菜品 ID 编码到 URL 中，并提供复制、系统分享和二维码入口。
4. 接收者打开 URL，看到所选菜品、每道菜的食材和做法。
5. 接收者点击“生成采购清单”，应用合并同名、同单位的食材数量，并以可勾选列表展示。

### 1.3 成功标准

- 从进入选菜页到复制链接，普通用户在 2 分钟内完成。
- 分享链接在不同手机、浏览器及设备间可恢复同一菜单。
- 采购清单对可合并食材进行准确求和；不可安全合并的项目不丢失。
- 首屏适配 360px 宽手机，无横向滚动。
- 部署后日常使用成本为 0；核心功能在无后端条件下运行。
- 修改当前 30 道菜的完整数据与轻量索引即可轮换菜品，无须改业务逻辑。

## 2. 用户与核心场景

### 2.1 用户角色

- 选菜者：只关心菜名、图片、分类和是否已选，希望界面轻量。
- 做饭者：需要菜单详情、份数、逐菜食谱及合并采购清单。
- 维护者：通过编辑 JSON 增删菜品、修正份量与步骤。

### 2.2 主流程

#### A. 选菜流程

1. 打开应用首页。
2. 按分类浏览或搜索菜名。
3. 点击“加入菜单”；再次点击可移除。
4. 顶部或底部固定栏实时显示已选数量。
5. 打开“今日菜单”抽屉，调整份数、删除或清空。
6. 点击“生成菜单”。
7. 应用生成 URL，例如：`https://example.pages.dev/?menu=tomato-egg,pepper-pork,seaweed-egg-soup&p=2&v=1`。
8. 点击“复制链接”或调用 Web Share API 分享；不支持 Web Share API 时自动回退到复制。

#### B. 接收与做饭流程

1. 接收者打开带 `menu` 参数的 URL。
2. 应用验证参数，只读取本地 JSON 中存在的菜品 ID。
3. 展示“今晚吃这些”、总份数与菜品详情。
4. 每道菜显示标准化食材、步骤、预计时长、难度及来源链接。
5. 点击“生成采购清单”。
6. 合并可合并食材，按蔬菜、肉蛋水产、调味品、其他分组。
7. 用户可勾选已备/已买项目，并复制采购清单文本。

### 2.3 异常流程

- URL 无 `menu`：进入选菜页。
- ID 不存在：忽略无效 ID，并提示“部分菜品已下架或链接无效”。
- 全部 ID 无效：展示空状态和“重新选菜”。
- JSON 加载失败：显示重试按钮及明确错误，不出现空白屏。
- URL 太长：MVP 限制最多选择 12 道菜；30 道内置数据不会全部写入 URL，只有短 ID。
- 单位不兼容：例如“2 个番茄”和“300 g 番茄”分别显示，不做猜测换算。

## 3. 产品范围

### 3.1 MVP 必须实现

- 30 道家常菜，其中恰好 5 道汤。
- 菜品分类、搜索、加入/移除、已选菜单抽屉。
- URL 编码与解码；刷新、复制和跨设备打开不丢失。
- 接收者模式：食材、步骤、来源信息。
- 合并采购清单、勾选状态和复制纯文本。
- 手机优先响应式布局、基本无障碍支持。
- 纯静态部署，无账号、无数据库、无付费服务。
- README：本地运行、维护数据、测试和三种部署方法。

### 3.2 建议实现

- 份数选择，默认 2 人份，范围 1–8。
- Web Share API 和二维码（二维码应使用本地依赖或构建期打包，不调用第三方在线 API）。
- 本机 `localStorage` 保存选菜草稿和采购勾选状态。
- 菜品图片占位；有授权图片时再添加，图片加载失败时显示渐变占位和菜名。
- 深色模式、打印采购清单。

### 3.3 暂不实现

- 登录、多人协作、云端历史记录、自动推送消息。
- 后台管理界面、在线抓取 GitHub、付费 AI 生成菜谱。
- 库存、营养精算、价格比较、外卖下单。
- 把菜单永久存储到短链接服务。

## 4. 信息架构与界面要求

### 4.1 选菜页

- 顶栏：产品名、搜索、已选数量。
- 分类标签：全部、素菜、肉菜、汤、混合菜、炖菜；未来轮换菜品时可按需扩展主食、早餐、饮料、甜品和其他。
- 菜品网格：手机 2 列，宽屏 3–5 列。
- 菜品卡只显示：图片/占位、菜名、分类、预计时长（可选）、“加入菜单/已加入”。
- 明确禁止在选菜卡展示完整食材或做法。
- 底部固定操作栏：`已选 N 道`、`查看菜单`。

### 4.2 今日菜单抽屉/页面

- 已选菜名列表、删除、清空、份数调整。
- 主按钮“生成菜单”，次按钮“继续选菜”。
- 生成后显示只读 URL、复制、系统分享、二维码。

### 4.3 接收者页

- 菜单概览：菜名标签和份数。
- 主按钮“生成采购清单”。
- 采购清单默认折叠，生成后滚动定位到清单。
- 菜谱使用折叠卡片，默认展开第一道；每道包含食材、编号步骤、注意事项和来源。
- 提供“重新选菜”但不改变原链接，只有再次生成才产生新链接。

### 4.4 视觉与无障碍

- 温暖、干净的家常餐桌风格；避免复杂动画。
- 触控目标至少 44×44 CSS px；正文不小于 16px。
- 所有交互可用键盘完成；焦点样式清晰。
- 使用语义 HTML、按钮真实 `button`、表单有标签、状态用 `aria-live`。
- 颜色不能作为唯一选中提示；按钮同时更改文字与图标。
- 尊重 `prefers-reduced-motion`。

## 5. 30 道首发推荐菜

筛选原则：家常、原料常见、做法成熟、组合覆盖素菜、肉菜、混合菜、炖菜与汤，适合 2 人晚餐。首发菜单明确排除鱼类菜品；正式录入前逐道核对 HowToCook 原文与合理用量。

### 5.1 素菜/蛋豆制品（10 道）

1. 西红柿炒鸡蛋
2. 酸辣土豆丝
3. 手撕包菜
4. 蒜蓉西兰花
5. 红烧茄子
6. 地三鲜
7. 蚝油生菜
8. 韭菜炒蛋
9. 西葫芦炒鸡蛋
10. 葱煎豆腐

### 5.2 荤菜（12 道）

11. 辣椒炒肉
12. 宫保鸡丁
13. 鱼香肉丝
14. 麻婆豆腐
15. 可乐鸡翅
16. 黄焖鸡
17. 土豆炖排骨
18. 西红柿土豆炖牛肉
19. 回锅肉
20. 香菇滑鸡
21. 洋葱炒猪肉
22. 白菜猪肉炖粉条

### 5.3 混合菜/炖菜（3 道）

23. 茄子炖土豆
24. 青椒土豆炒肉
25. 蒜苔炒肉末

### 5.4 汤（恰好 5 道）

26. 西红柿鸡蛋汤
27. 紫菜蛋花汤
28. 玉米排骨汤
29. 排骨山药玉米汤
30. 黄瓜皮蛋汤

说明：HowToCook 的目录分类不一定等同于本产品的展示分类。例如麻婆豆腐虽然含豆腐，但产品中归入“肉菜”或“混合菜”应由标准化数据定义。产品选择页不得出现鱼类菜品。首版分类至少包括素菜、肉菜、汤、混合菜、炖菜；后续用 `tags` 支持辣度、耗时、主要蛋白等多维筛选。

## 6. HowToCook 集成策略

### 6.1 已核实的仓库特征

- 上游：`Anduin2017/HowToCook`。
- 菜谱位于 `dishes/` 下的多份 Markdown 文件，并按 `vegetable_dish`、`meat_dish`、`aquatic`、`soup` 等目录组织，不是单一 Markdown。
- 典型菜谱包含“必备原料和工具”“计算”“操作”“附加内容”等结构；但历史贡献导致格式、单位与表述并非完全统一。
- 仓库标注为 Unlicense。仍建议在本项目 README 和 `NOTICE.md` 中保留来源、上游链接、抓取日期及原始文件链接，既方便追溯，也尊重社区贡献。

### 6.2 推荐方案：当前 30 道完整菜谱 + 本地候选菜单

运行时不要直接请求 GitHub。MVP 只需规范化并加载当前 30 道菜，另外在本地保留一份候选菜单，供维护者以后轮换这 30 道菜：

- `data/dishes.json`：当前 App 使用的恰好 30 道完整菜谱，包含标准化食材、步骤、分类、评分和来源。
- `data/dish-index.json`：选择页加载的轻量索引，仅包含与 `dishes.json` 对应的 30 道菜。
- `data/dish-catalog.json`：本地候选菜单，供以后换着选入 30 道运行菜单。候选项可只保存菜名、来源路径、分类和审核状态；未选入前不强制具备完整食材与步骤。

当前运行菜单始终为 30 道；候选菜单的数量可随维护需要增长。优点：

- 页面离线可用，GitHub 故障或限流不影响用户。
- 避免跨域、网络延迟和上游格式变化。
- 能统一名称、单位、默认份数、产品分类和合并键。
- 首页只加载轻量索引，查看具体菜谱时再按 ID 查完整数据。
- 部署仍是纯静态、完全免费。

### 6.3 导入流程

1. 固定上游 commit SHA 或 release，记录到 `data/source-manifest.json`。
2. 只读取当前 30 道菜及本次需要补充的候选菜 Markdown；跳过 README、模板、技巧和非菜谱文件。
3. 提取标题、上游目录分类、原料、份量公式、步骤、附加说明和源路径。
4. 将审核通过的当前 30 道转换成 `dishes.json`；为每道菜保持稳定 ID，并映射到产品分类。
5. 为每道菜计算 `homestyleScore`（0–100）和 `homestyleRank`。评分依据为原料常见度、家庭厨房可完成度、步骤复杂度、耗时、设备要求和日常餐桌适配度；保留评分理由，确保排序可审查，不将 GitHub stars 误当作菜品热度。
6. 从当前 30 道生成按 `homestyleScore` 降序、名称稳定排序的 `dish-index.json`；鱼类不得进入当前数据或产品索引。
7. 对每个食材设置稳定 `key`、显示名、数量和单位；人工复核异常值、可选配料、份量口径和食品安全表述。
8. 运行 JSON Schema 校验、30 道数量检查、重复 ID 检查、5 道汤检查、分类检查、排序稳定性检查和采购合并测试。
9. 将来源 URL、上游 commit、同步日期写入每道菜及 manifest。

### 6.4 不建议方案

- 客户端每次从 `raw.githubusercontent.com` 拉菜谱：依赖网络、解析复杂、上游一改就可能坏。
- 原样复制 Markdown 并在浏览器临时解析：难以可靠合并购物清单。
- 自动换算“个/克/适量”：缺乏可靠密度或标准大小，不应伪造精度。

### 6.5 后续同步

建议提供 `scripts/import-howtocook.mjs`，只供维护者在补充候选菜或轮换当前菜品时运行。脚本可生成候选记录和差异报告；默认不直接覆盖已审核的 `dishes.json` 和 `dish-index.json`。上游同步不是 MVP 验收条件，也不是运行时依赖。

## 7. 技术架构

### 7.1 架构原则

- 静态优先：所有资源由 CDN 提供，业务逻辑在浏览器执行。
- URL 即菜单状态：共享所需的最小状态放在查询参数中。
- 数据与界面分离：菜谱 JSON 独立维护。
- 无敏感数据：URL 不包含姓名、地址、账号或私人备注。
- 渐进增强：剪贴板、系统分享和二维码不可用时，核心流程仍工作。

### 7.2 推荐技术栈

- HTML5、CSS3、原生 JavaScript ES Modules。
- 可选构建工具：Vite，仅用于开发服务器、模块打包和测试；生产输出仍为静态文件。
- 测试：Vitest（数据与合并逻辑）+ Playwright（关键用户流程）。
- 校验：JSON Schema + Ajv，或使用轻量自定义验证；应在构建/测试阶段失败，而不是把坏数据发布出去。
- 二维码：本地安装并打包的开源 QR 库；不调用在线 QR 服务。
- 不需要 React、后端框架、数据库或服务端函数。若团队熟悉 React，也可使用 Vite + React，但对 30 道菜的 MVP 并无必要。

### 7.3 URL 协议

推荐可读格式：

```text
/?menu=tomato-egg,pepper-pork,seaweed-egg-soup&p=2&v=1
```

- `menu`：逗号分隔的稳定短 ID；去重并保持选菜顺序。
- `p`：份数，整数 1–8，默认 2。
- `v`：协议版本，首版为 1。
- 菜谱、食材和步骤不进入 URL；接收端用 ID 从同版本静态 JSON 查询。
- 对非法字符、重复 ID、过多 ID 和未知版本做防御性处理。
- 若未来 ID 变更，在 `data/aliases.json` 维护旧 ID 到新 ID 的映射，避免历史链接失效。

### 7.4 采购合并算法

1. 根据菜单和份数将每道菜的 `ingredients` 展开。
2. 默认忽略 `kind: tool`；可选配料保留并标记“可选”。
3. 用 `ingredient.key + unit + optional` 分组。
4. 数字数量求和，并按显示规则舍入；例如鸡蛋向上取整到整数。
5. `amount` 为 `null` 或单位为 `适量` 时，作为文本项目去重，不参与数值求和。
6. 同一食材不同单位分别显示，不擅自换算。
7. 先按采购类别，再按中文显示名排序。

## 8. 项目结构

```text
home-menu-app/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── NOTICE.md
├── public/
│   ├── favicon.svg
│   └── images/
│       └── dishes/              # 授权明确的本地图片；MVP 可为空
├── src/
│   ├── main.js                  # 启动、路由模式判断
│   ├── styles.css
│   ├── data.js                  # 加载与验证菜谱数据
│   ├── menu-state.js            # 选择、份数、URL 编解码
│   ├── shopping-list.js         # 合并算法
│   ├── ui/
│   │   ├── picker.js
│   │   ├── menu-drawer.js
│   │   ├── recipient.js
│   │   └── toast.js
│   └── utils/
│       ├── share.js
│       └── escape.js
├── data/
│   ├── dishes.json                # 当前 App 使用的 30 道完整菜谱
│   ├── dish-index.json            # 当前 30 道的轻量选择页索引
│   ├── dish-catalog.json          # 供以后轮换的本地候选菜单
│   ├── dishes.schema.json
│   ├── aliases.json
│   └── source-manifest.json
├── scripts/
│   └── import-howtocook.mjs     # 可选维护工具，不进入浏览器
└── tests/
    ├── shopping-list.test.js
    ├── url-state.test.js
    ├── data-validation.test.js
    └── e2e.spec.js
```

如追求零构建，也可把 `src/` 改为浏览器原生模块并直接托管；但 Vite 能提供更好的本地开发、测试和资源路径处理，同时不会引入运行时费用。

## 9. JSON 数据模型

### 9.1 设计要求

- 数据层拆为“当前 30 道完整详情”、“轻量索引”和“本地候选菜单”。
- `id` 永久稳定、URL 安全、不可重复。
- `servings` 表示本条食材数量对应的基准份数。
- 数值和单位拆开，禁止把 `300g` 塞进一个字符串。
- `key` 是采购合并键，例如不同菜谱里的“番茄/西红柿”统一为 `tomato`，显示名仍用本项目约定。
- 工具与食材分开，避免把“锅”加入采购清单。
- 所有外来内容保留来源字段。
- 每道菜同时保留 `sourceCategory`（HowToCook 原目录）和标准化 `category`。
- `homestyleScore` 为 0–100，分数越高越家常；`homestyleRank` 从 1 开始，必须由确定性算法生成并允许人工覆写。
- `excludedFromApp` 控制候选项是否可被选入当前菜单；鱼类菜品不得进入当前 30 道或选择页索引。

### 9.2 轻量索引模型

`data/dish-index.json` 是一个恰好包含当前 30 道菜的数组，按 `homestyleScore` 降序排列；同分时依次按 `homestyleRank`、中文菜名和 ID 排序。每项至少包含：

```json
[
  {
    "id": "tomato-egg",
    "name": "西红柿炒鸡蛋",
    "category": "vegetable",
    "categoryName": "素菜",
    "tags": ["家常", "快手", "鸡蛋", "不辣"],
    "homestyleScore": 98,
    "homestyleRank": 1,
    "enabled": true
  }
]
```

该索引只包含允许在产品中选择的菜；鱼类菜品不得出现。

### 9.3 当前菜谱详情示例

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-07-21",
  "dishes": [
    {
      "id": "tomato-egg",
      "name": "西红柿炒鸡蛋",
      "sourceCategory": "vegetable_dish",
      "category": "vegetable",
      "tags": ["家常", "快手", "鸡蛋", "不辣"],
      "servings": 2,
      "durationMinutes": 15,
      "difficulty": 2,
      "homestyleScore": 98,
      "homestyleRank": 1,
      "excludedFromApp": false,
      "exclusionReason": null,
      "image": null,
      "ingredients": [
        {
          "key": "tomato",
          "name": "西红柿",
          "amount": 2,
          "unit": "个",
          "shoppingCategory": "蔬菜",
          "optional": false,
          "rounding": "whole"
        },
        {
          "key": "egg",
          "name": "鸡蛋",
          "amount": 3,
          "unit": "枚",
          "shoppingCategory": "肉蛋水产",
          "optional": false,
          "rounding": "ceil"
        },
        {
          "key": "salt",
          "name": "盐",
          "amount": 3,
          "unit": "克",
          "shoppingCategory": "调味品",
          "optional": false,
          "rounding": "none"
        },
        {
          "key": "sugar",
          "name": "糖",
          "amount": null,
          "unit": "适量",
          "shoppingCategory": "调味品",
          "optional": true,
          "rounding": "none"
        }
      ],
      "tools": ["炒锅", "锅铲", "碗"],
      "steps": [
        "西红柿洗净、去蒂并切块。",
        "鸡蛋打散；热锅加油，将鸡蛋炒至凝固后盛出。",
        "原锅炒软西红柿，加入鸡蛋、盐和可选的糖，翻炒均匀后出锅。"
      ],
      "notes": ["实际调味应按份数和口味调整。"],
      "source": {
        "project": "Anduin2017/HowToCook",
        "path": "dishes/vegetable_dish/西红柿炒鸡蛋.md",
        "url": "https://github.com/Anduin2017/HowToCook/blob/master/dishes/vegetable_dish/西红柿炒鸡蛋.md",
        "license": "Unlicense",
        "retrievedAt": "2026-07-21"
      }
    }
  ]
}
```

注意：示例展示结构，不应替代对上游原文和用量的逐道核对。对于范围值，可增加 `amountMin`/`amountMax`，或选取经人工审核的默认值；不要把范围字符串用于求和。

## 10. 非功能要求

### 10.1 性能

- 首次加载压缩资源目标小于 500 KB（不含菜品图片）。
- 30 道菜时，普通手机上搜索、筛选和加入操作无明显延迟。
- 图片使用 WebP/AVIF、多尺寸和懒加载；MVP 可无图片。
- Lighthouse 目标：Performance、Accessibility、Best Practices、SEO 均 ≥ 90（合理环境下）。

### 10.2 安全与隐私

- 不收集个人信息，不接入广告和第三方追踪。
- 动态文本使用 `textContent`，不把 URL 或 JSON 内容直接注入 `innerHTML`。
- 查询参数设长度和数量上限，只接受已知 ID。
- 外链使用 `rel="noopener noreferrer"`。
- 不把隐私备注写入 URL；分享 URL 默认可被获得链接的人读取。

### 10.3 兼容性

- 支持当前及前一主要版本的 Chrome、Safari、Edge、Firefox。
- iOS Safari 与 Android Chrome 完成核心流程测试。
- GitHub Pages 子路径部署时，资源路径必须使用 Vite `base` 或相对路径正确处理。

## 11. 免费部署方案

### 11.1 首选：Cloudflare Pages

适合本项目：静态资源全球分发、自动 HTTPS、Git 推送自动部署，免费档对 30 道菜的小应用非常充足。当前官方文档列出的免费档包括每月 500 次构建、每站最多 20,000 个文件、单个静态资源最大 25 MiB。配置：

- Build command：`npm run build`
- Output directory：`dist`
- Node 版本：项目中固定一个当前 LTS 版本
- 不启用 Pages Functions，保持纯静态

### 11.2 备选：GitHub Pages

优点是与仓库天然集成、免费且简单。可使用 GitHub Actions 构建并发布 `dist/`。当前官方限制包括发布站点建议不超过 1 GB、每月软带宽限制 100 GB；本项目远低于该规模。注意设置正确的仓库子路径 `base`，且不要用于商业 SaaS 或敏感交易。

### 11.3 备选：Vercel Hobby

导入 Git 仓库即可识别 Vite 并自动部署。Hobby 适合个人、非商业项目；本项目不使用 Functions，因此大部分服务端额度与它无关。若未来变为商业用途，需重新核对 Vercel 条款或切换平台。

### 11.4 推荐决策

默认选择 Cloudflare Pages；若项目已经完全托管在 GitHub 且希望最少账户，选择 GitHub Pages；若开发者最熟悉 Vercel，个人非商业使用可选 Vercel Hobby。三者均不改变应用架构。

## 12. 测试与验收

### 12.1 自动测试

- URL：空菜单、单项、多项、重复、未知 ID、非法份数、未知协议版本。
- 合并：同 key 同单位求和、不同单位不合并、可选项、适量、整数向上取整。
- 数据：30 个唯一 ID、恰好 5 个 soup、每道至少 1 项食材和 1 个步骤、来源完整。
- E2E：选 3 道菜 → 生成链接 → 新页面打开 → 显示相同 3 道 → 生成采购清单。
- E2E：复制/分享回退、手机视口、刷新保持。

### 12.2 MVP 验收标准

- 选择页不展示食材和做法。
- 最多可选 12 道，选择状态和计数同步。
- 生成链接不依赖网络请求或后端写入。
- 新设备打开链接可正确看到菜单详情。
- 采购清单不会错误合并不同单位。
- 30 道菜全部可渲染，且汤类正好 5 道。
- `npm test` 与端到端关键流程通过。
- README 包含 Cloudflare Pages、GitHub Pages、Vercel 三种部署说明。

## 13. 实施路线图

### 阶段 0：数据与约定（0.5–1 天）

- 建立项目、URL 协议、JSON Schema 和分类枚举。
- 固定 HowToCook 上游 commit，确认 30 道源文件。
- 产出经人工复核的 `dishes.json` 与来源 manifest。

### 阶段 1：选菜 MVP（1–2 天）

- 完成响应式选菜网格、分类、搜索、加入/移除和菜单抽屉。
- 完成份数和 URL 编解码。
- 添加单元测试。

### 阶段 2：接收者与采购清单（1–2 天）

- 完成接收者页面、菜谱折叠卡。
- 完成采购合并、勾选、复制清单。
- 完成异常参数和空状态。

### 阶段 3：分享与质量（1 天）

- 添加复制、Web Share API、二维码与回退。
- 做无障碍、手机兼容、性能和安全检查。
- 完成 Playwright 关键流程。

### 阶段 4：部署与交付（0.5 天）

- 部署 Cloudflare Pages。
- 验证 GitHub Pages 和 Vercel 配置文档。
- 完成 README、NOTICE 和维护说明。

### 后续版本

- 菜品图片、收藏、过敏原/忌口筛选、辣度与耗时筛选。
- 菜单历史可仅保存在本机；需要跨设备历史时再评估后端。
- 扩充本地候选菜单，并建立从候选库轮换当前 30 道菜的审核流程。

## 14. 风险与决策

- 上游数据不完全统一：必须标准化并人工复核，不能盲目解析发布。
- 食材单位不一致：只合并同 key、同单位；准确优先于“看起来整洁”。
- 历史链接随删菜失效：ID 永久稳定，删除时保留 alias 或归档条目。
- 分享 URL 可被转发：产品不存私人信息，并在生成处提示“持有链接者可查看菜单”。
- 图片版权和体积：MVP 使用无图片占位；只加入来源与授权明确的本地图片。
- 静态站没有真正的“发送通知”：由系统分享面板或复制链接完成交付，符合零后端目标。

## 15. 参考资料

- HowToCook 仓库：https://github.com/Anduin2017/HowToCook
- HowToCook 示例菜谱：https://github.com/Anduin2017/HowToCook/blob/master/dishes/vegetable_dish/西红柿炒鸡蛋.md
- Cloudflare Pages 限制：https://developers.cloudflare.com/pages/platform/limits/
- GitHub Pages 限制：https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Vercel Hobby：https://vercel.com/docs/plans/hobby

---

## 16. 可直接粘贴给 Codex 的构建提示词

以下提示词应整体复制给 Codex：

```text
请在当前工作区直接构建一个完整、可运行、可部署的“家常菜单选择与采购清单”静态 Web App。不要只给示例或代码片段；请创建文件、实现功能、运行测试并修复发现的问题，直到达到下列验收标准。

产品目标：
一个用户在手机网页上挑选想吃的菜并生成可分享 URL；接收者打开 URL 后看到所选菜的食材和做法，并可一键生成所有菜的合并采购清单。应用必须可长期免费运行，不使用后端、数据库、登录或付费 API。

核心体验：
1. 选菜页只显示菜名、分类、可选图片/占位和“加入菜单”状态；绝对不要显示完整食材或步骤。
2. 支持搜索、分类筛选、加入/移除、已选数量、菜单抽屉、清空和 1–8 人份选择，默认 2 人份，最多选择 12 道。
3. 点击“生成菜单”后，用 URL 查询参数保存所选菜品短 ID、份数和协议版本，例如 `?menu=tomato-egg,pepper-pork&p=2&v=1`。不把完整菜谱写进 URL，不调用短链接服务。
4. 提供复制链接、Web Share API 分享及不支持时的可靠回退。二维码使用本地安装并随构建打包的库，不能调用第三方在线 QR API。
5. 接收者打开链接后看到菜单概览、每道菜的标准化食材、编号步骤、用时、难度和来源。
6. “生成采购清单”将所有菜的食材按份数缩放，并仅在 ingredient key、unit、optional 相同时求和；不同单位不得猜测换算；“适量”和未知数量去重但不数值求和。鸡蛋等离散单位按数据的 rounding 规则处理。
7. 采购清单按蔬菜、肉蛋水产、调味品、其他分组，可勾选并复制为纯文本。
8. URL 无效、未知 ID、数据加载失败、空菜单均须有友好错误与恢复入口。

技术要求：
- 使用 Vite + 原生 HTML/CSS/JavaScript ES Modules。不要使用 React，除非工作区已有明确的 React 基础设施；不要使用服务端函数。
- 生产物必须是纯静态 `dist/`，可部署到 Cloudflare Pages、GitHub Pages 或 Vercel。
- 数据必须拆为 `data/dishes.json`（当前 App 使用的恰好 30 道完整菜谱）、`data/dish-index.json`（这 30 道的轻量选择页索引）和 `data/dish-catalog.json`（供以后轮换的本地候选菜单），并提供 `data/dishes.schema.json`、`data/source-manifest.json` 和可选 `data/aliases.json`。
- 业务模块至少拆分为数据加载/验证、菜单状态与 URL、采购合并、选菜 UI、接收者 UI、分享工具。
- 动态内容使用安全 DOM API，不将 URL/JSON 原样注入 innerHTML。
- 手机优先；360px 无横向滚动；触控目标至少 44px；正文至少 16px；支持键盘、清晰焦点、aria-live、reduced motion。
- 不接入分析、广告或任何个人数据收集。
- 菜品图可先使用优雅的本地占位，禁止随意抓取版权不明图片。

HowToCook 数据策略：
- 上游仓库为 https://github.com/Anduin2017/HowToCook ，许可证在仓库中标注为 Unlicense。
- 菜谱是 `dishes/` 下按类别组织的多份 Markdown，不是一个大文件。
- 如果当前环境允许访问该仓库，请固定并记录一个 commit SHA，只读取当前 30 道菜所对应的 Markdown，提取并规范化到 `dishes.json`。完整详情至少包含菜名、稳定 ID、上游分类、产品分类、食材、份量计算、工具、步骤、附加说明、家常评分、排除状态和来源。
- 生成恰好包含当前 30 道的 `dish-index.json`，包含菜名、ID、分类、标签、`homestyleScore` 和 `homestyleRank`，按家常程度从高到低稳定排序。家常评分依据原料常见度、家庭厨房可完成度、步骤复杂度、耗时、设备要求和日常餐桌适配度，并保留可解释的评分信息。
- `dish-catalog.json` 作为本地候选菜单，可只保存菜名、来源路径、分类和审核状态。候选菜被换入当前 30 道之前，再补齐并人工审核完整食材、份量和步骤。
- 鱼类不得进入 `dishes.json`、`dish-index.json` 或选菜页；候选菜单若保留鱼类条目，必须设置 `excludedFromApp: true`、`exclusionReason: "fish"`。
- 如果网络不可用，不要伪造上游内容或来源 commit。先实现 Schema、当前 30 道的待审核数据和明确说明，并报告仍需人工核对的项目。
- 运行时绝不能请求 GitHub；只加载本项目静态 JSON。
- 每道菜保留 source.project、source.path、source.url、source.license、source.commit（如果取得）和 retrievedAt。
- 创建 NOTICE.md，说明数据来源并链接上游。不要声称本应用是 HowToCook 官方产品。
- 建议创建 `scripts/import-howtocook.mjs`：按指定菜品生成候选记录和差异报告，默认不得自动覆盖人工审核的 `dishes.json` 和 `dish-index.json`。此导入器不是 MVP 验收的硬性前置。

首发必须包含以下 30 道家常菜，且汤恰好 5 道：
素菜/蛋豆制品：西红柿炒鸡蛋、酸辣土豆丝、手撕包菜、蒜蓉西兰花、红烧茄子、地三鲜、蚝油生菜、韭菜炒蛋、西葫芦炒鸡蛋、葱煎豆腐。
荤菜：辣椒炒肉、宫保鸡丁、鱼香肉丝、麻婆豆腐、可乐鸡翅、黄焖鸡、土豆炖排骨、西红柿土豆炖牛肉、回锅肉、香菇滑鸡、洋葱炒猪肉、白菜猪肉炖粉条。
混合菜/炖菜：茄子炖土豆、青椒土豆炒肉、蒜苔炒肉末。
汤：西红柿鸡蛋汤、紫菜蛋花汤、玉米排骨汤、排骨山药玉米汤、黄瓜皮蛋汤。

每道菜 JSON 至少包含：
- id：稳定、唯一、URL 安全的短 ID
- name、sourceCategory、category、tags、servings、durationMinutes、difficulty、image
- homestyleScore、homestyleRank、homestyleReason、excludedFromApp、exclusionReason
- ingredients：key、name、amount（可为 null）、unit、shoppingCategory、optional、rounding
- tools、steps、notes
- source：project、path、url、license、commit、retrievedAt

项目建议结构：
- index.html
- package.json、vite.config.js
- src/main.js、styles.css、data.js、menu-state.js、shopping-list.js
- src/ui/picker.js、menu-drawer.js、recipient.js、toast.js
- src/utils/share.js、escape.js
- data/dishes.json、dish-index.json、dish-catalog.json、dishes.schema.json、aliases.json、source-manifest.json
- public/images/dishes/
- tests/shopping-list.test.js、url-state.test.js、data-validation.test.js、e2e.spec.js
- README.md、NOTICE.md

测试与验收：
- 使用 Vitest 测试 URL 编解码、数据校验和采购合并。
- 使用 Playwright 或同等 E2E 测试：选择 3 道菜 → 生成 URL → 新页面打开 → 显示相同 3 道 → 生成正确采购清单。
- 测试重复/未知 ID、非法份数、不同单位不合并、适量、可选项和整数向上取整。
- 自动验证 `dishes.json` 和 `dish-index.json` 均恰好包含同一组 30 个唯一 ID、索引排序稳定、鱼类不进入产品数据、恰好 5 道 soup、每道至少有食材和步骤、来源字段完整。候选菜单不计入这 30 道的验收数量。
- 运行构建和测试，修复失败；检查手机视口和基本无障碍。

部署与文档：
- README 写清本地安装、开发、测试、构建、如何增删菜品和如何更新来源。
- 写出 Cloudflare Pages（首选）、GitHub Pages、Vercel 三种免费部署步骤。Cloudflare Pages 的构建命令为 `npm run build`，输出目录为 `dist`。
- 对 GitHub Pages 子路径设置正确的 Vite base，并提供 GitHub Actions 发布工作流（如适用）。

工作方式：
1. 先检查当前工作区并给出简短实施计划。
2. 直接创建并编辑实际文件，不要仅在聊天中粘贴大量代码。
3. 保持实现简单、可维护；不要为了“高级”擅自加入后端、账户或云数据库。
4. 完成后运行测试和生产构建；若浏览器工具可用，实际走一遍手机端关键流程。
5. 最终汇报创建了什么、测试结果、部署方式，以及仍需人工复核的 HowToCook 数据项。

完成定义：项目可以本地启动，30 道菜均可选择；分享 URL 可跨页面恢复；接收者能查看菜谱并生成合并采购清单；测试和生产构建通过；README 和 NOTICE 完整。
```
