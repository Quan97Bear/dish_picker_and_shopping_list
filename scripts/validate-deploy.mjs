import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const forbiddenDirectories = new Set([
  '.agents',
  '.codex',
  '.git',
  '.github',
  'node_modules',
  'scripts',
  'tests'
]);
const forbiddenFiles = [
  /^AGENTS(?:\.override)?\.md$/i,
  /^SKILL\.md$/i,
  /^README\.md$/i,
  /^NOTICE\.md$/i,
  /^dish_picker_and_shopping_list\.md$/i,
  /^package(?:-lock)?\.json$/i,
  /^pnpm-lock\.yaml$/i,
  /^playwright\.config\./i,
  /^vite\.config\./i,
  /^dish-catalog(?:-[^.]+)?\.json$/i,
  /^dishes\.schema(?:-[^.]+)?\.json$/i,
  /^source-manifest(?:-[^.]+)?\.json$/i,
  /\.map$/i
];

async function collectFiles(directory, relativeDirectory = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);

    if (entry.isSymbolicLink()) {
      throw new Error(`部署产物不允许符号链接：${relativePath}`);
    }

    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath, relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

let files;
try {
  files = await collectFiles(distDir);
} catch (error) {
  if (error?.code === 'ENOENT') {
    throw new Error('找不到 dist/；请先运行 Vite 构建。');
  }
  throw error;
}

const forbidden = files.filter((file) => {
  const segments = file.split(path.sep);
  return segments.some((segment) => forbiddenDirectories.has(segment))
    || forbiddenFiles.some((pattern) => pattern.test(path.basename(file)));
});

if (!files.includes('index.html')) {
  throw new Error('部署产物缺少 index.html。');
}

if (forbidden.length > 0) {
  throw new Error(`部署产物包含开发或维护文件：\n${forbidden.join('\n')}`);
}

console.log(`部署产物校验通过：dist/ 共 ${files.length} 个运行时文件。`);
