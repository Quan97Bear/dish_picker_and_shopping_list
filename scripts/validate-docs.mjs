import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const activeDocs = [
  "AGENTS.md",
  "README.md",
  "docs/PROJECT_STATUS.md",
  "docs/TODO.md",
  "docs/PRODUCT_REQUIREMENTS.md",
  "docs/PRODUCT_ROADMAP.md",
  "NOTICE.md",
  ".agents/skills/maintain-dish-picker/SKILL.md",
];
const failures = [];

async function readRootFile(relativePath) {
  return readFile(path.join(rootDir, relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

const docEntries = await Promise.all(
  activeDocs.map(async (relativePath) => [
    relativePath,
    await readRootFile(relativePath),
  ]),
);
const docs = new Map(docEntries);
const packageJson = JSON.parse(await readRootFile("package.json"));

const requiredScripts = new Map([
  ["demo:phone", "node scripts/run-workflow.mjs demo:phone"],
  ["demo:stop", "node scripts/run-workflow.mjs demo:stop"],
  ["check:fast", "node scripts/run-workflow.mjs check:fast"],
  ["check:phone", "node scripts/run-workflow.mjs check:phone"],
  ["check:full", "node scripts/run-workflow.mjs check:full"],
  ["validate:docs", "node scripts/validate-docs.mjs"],
]);

for (const [scriptName, expectedCommand] of requiredScripts) {
  const actualCommand = packageJson.scripts?.[scriptName];
  if (actualCommand !== expectedCommand) {
    fail(`package.json 中的 ${scriptName} 必须是：${expectedCommand}`);
  }
}

const readme = docs.get("README.md");
const documentedNpmScripts = new Set(
  [...readme.matchAll(/\bnpm run ([\w:-]+)/g)].map((match) => match[1]),
);

for (const scriptName of documentedNpmScripts) {
  if (!packageJson.scripts?.[scriptName]) {
    fail(`README.md 引用了不存在的 npm script：${scriptName}`);
  }
}

for (const scriptName of requiredScripts.keys()) {
  if (!documentedNpmScripts.has(scriptName)) {
    fail(`README.md 必须记录 npm run ${scriptName}`);
  }
}

const markdownLinkPattern = /\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
for (const [docPath, content] of docs) {
  for (const match of content.matchAll(markdownLinkPattern)) {
    const rawTarget = match[1].replace(/^<|>$/g, "");
    if (
      rawTarget.startsWith("#")
      || /^[a-z][a-z0-9+.-]*:/i.test(rawTarget)
    ) {
      continue;
    }

    const fileTarget = decodeURIComponent(rawTarget.split("#")[0]);
    if (!fileTarget) {
      continue;
    }

    const absoluteTarget = path.resolve(
      rootDir,
      path.dirname(docPath),
      fileTarget,
    );
    try {
      await access(absoluteTarget);
    } catch {
      fail(`${docPath} 中的本地链接不存在：${rawTarget}`);
    }
  }
}

const removedExperimentTerms = [
  "毛玻璃",
  "失败实验",
  "不要再尝试",
  "唯一出路",
  "顶部状态栏无法控制",
  "SIGABRT",
];

for (const [docPath, content] of docs) {
  for (const term of removedExperimentTerms) {
    if (content.includes(term)) {
      fail(`${docPath} 重新出现已清理的实验描述：${term}`);
    }
  }
}

const requiredDocMarkers = new Map([
  [
    "docs/PROJECT_STATUS.md",
    ["## 生产版本", "## 本地演示版本", "## 当前产品差异"],
  ],
  ["docs/TODO.md", ["## Resume here"]],
  [
    "docs/PRODUCT_ROADMAP.md",
    ["## 2. 当前代码基线", "## 3. 阶段顺序"],
  ],
  [
    "README.md",
    ["## 手机联调", "## 自动化检查", "## 在 Codex Chat 中使用"],
  ],
]);

for (const [docPath, markers] of requiredDocMarkers) {
  const content = docs.get(docPath);
  for (const marker of markers) {
    if (!content.includes(marker)) {
      fail(`${docPath} 缺少职责标记：${marker}`);
    }
  }
}

const forbiddenDocMarkers = new Map([
  ["README.md", ["## Resume here", "## 当前产品差异"]],
  ["docs/PRODUCT_ROADMAP.md", ["## Resume here", "## 本地演示版本"]],
  ["docs/TODO.md", ["## 当前代码基线", "## 生产版本"]],
]);

for (const [docPath, markers] of forbiddenDocMarkers) {
  const content = docs.get(docPath);
  for (const marker of markers) {
    if (content.includes(marker)) {
      fail(`${docPath} 包含应由其他文档维护的章节：${marker}`);
    }
  }
}

const status = docs.get("docs/PROJECT_STATUS.md");
const localStatusSection = status
  .split("## 本地演示版本")[1]
  ?.split(/\n## /)[0];

if (!localStatusSection) {
  fail("PROJECT_STATUS.md 无法解析“本地演示版本”章节");
} else {
  let distHtml;
  try {
    distHtml = await readRootFile("dist/index.html");
  } catch {
    fail("缺少 dist/index.html；请先运行 npm run build");
  }

  if (distHtml) {
    const builtJs = distHtml.match(
      /src="\/assets\/(index-[^"]+\.js)"/,
    )?.[1];
    const builtCss = distHtml.match(
      /href="\/assets\/(index-[^"]+\.css)"/,
    )?.[1];
    const documentedJs = localStatusSection.match(
      /JavaScript：`([^`]+\.js)`/,
    )?.[1];
    const documentedCss = localStatusSection.match(
      /CSS：`([^`]+\.css)`/,
    )?.[1];

    if (!builtJs || !builtCss) {
      fail("dist/index.html 中无法解析 JavaScript 或 CSS 资源");
    }
    if (!documentedJs || !documentedCss) {
      fail("PROJECT_STATUS.md 中无法解析本地 JavaScript 或 CSS 资源");
    }
    if (builtJs && documentedJs && builtJs !== documentedJs) {
      fail(
        `本地 JavaScript 资源不一致：dist=${builtJs}，PROJECT_STATUS=${documentedJs}`,
      );
    }
    if (builtCss && documentedCss && builtCss !== documentedCss) {
      fail(
        `本地 CSS 资源不一致：dist=${builtCss}，PROJECT_STATUS=${documentedCss}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("文档校验失败：");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `文档校验通过：${activeDocs.length} 份活动文档、${documentedNpmScripts.size} 个 README 命令、资源哈希与文档职责均一致。`,
  );
}
