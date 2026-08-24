import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const workflow = process.argv[2];
const execFileAsync = promisify(execFile);
const childPath = [
  path.dirname(process.execPath),
  process.env.PATH,
].filter(Boolean).join(path.delimiter);
const viteCli = path.join(rootDir, "node_modules/vite/bin/vite.js");
const vitestCli = path.join(rootDir, "node_modules/vitest/vitest.mjs");
const playwrightCli = fileURLToPath(import.meta.resolve("@playwright/test/cli"));
const validateData = path.join(rootDir, "scripts/validate-data.mjs");
const validateDeploy = path.join(rootDir, "scripts/validate-deploy.mjs");
const validateDocs = path.join(rootDir, "scripts/validate-docs.mjs");
const phoneTestPattern =
  "theme, canvas|solid background|opening and closing|mobile search|household combination|pantry ingredients";
const phoneDemoPort = 5173;

async function runStep(label, scriptPath, args = []) {
  console.log(`\n[${workflow}] ${label}`);

  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: rootDir,
      env: {
        ...process.env,
        PATH: childPath,
      },
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${label} 被信号 ${signal} 终止`));
      } else {
        resolve(code ?? 1);
      }
    });
  });

  if (exitCode !== 0) {
    throw new Error(`${label} 失败，退出码 ${exitCode}`);
  }
}

async function build() {
  await runStep("构建", viteCli, ["build"]);
  await runStep("部署产物检查", validateDeploy);
}

async function checkFast() {
  await runStep("数据校验", validateData);
  await runStep("Vitest", vitestCli, ["run"]);
  await build();
  await runStep("文档检查", validateDocs);
}

async function checkPhone() {
  await build();
  await runStep("手机关键 Playwright", playwrightCli, [
    "test",
    "--grep",
    phoneTestPattern,
  ]);
}

async function checkFull() {
  await checkFast();
  await runStep("完整 Playwright", playwrightCli, ["test"]);
}

async function findPhoneDemoPids() {
  try {
    const { stdout } = await execFileAsync(
      "lsof",
      [
        "-nP",
        `-iTCP:${phoneDemoPort}`,
        "-sTCP:LISTEN",
        "-t",
      ],
      { cwd: rootDir, encoding: "utf8" },
    );
    return stdout
      .split(/\s+/)
      .filter(Boolean)
      .map(Number)
      .filter(Number.isInteger);
  } catch (error) {
    if (error.code === 1) {
      return [];
    }
    throw new Error(`无法检查 ${phoneDemoPort} 端口：${error.message}`);
  }
}

async function getProcessCwd(pid) {
  try {
    const { stdout } = await execFileAsync(
      "lsof",
      ["-a", "-p", String(pid), "-d", "cwd", "-Fn"],
      { cwd: rootDir, encoding: "utf8" },
    );
    return stdout
      .split("\n")
      .find((line) => line.startsWith("n"))
      ?.slice(1);
  } catch {
    return undefined;
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

async function stopPhoneDemo() {
  const listeningPids = await findPhoneDemoPids();
  if (listeningPids.length === 0) {
    console.log(`手机 Demo 已关闭；${phoneDemoPort} 端口没有监听进程。`);
    return;
  }

  const ownedPids = [];
  for (const pid of listeningPids) {
    const processCwd = await getProcessCwd(pid);
    if (processCwd && path.resolve(processCwd) === path.resolve(rootDir)) {
      ownedPids.push(pid);
    }
  }

  if (ownedPids.length === 0) {
    throw new Error(
      `${phoneDemoPort} 端口由其他目录的进程占用；为避免误杀，未停止任何进程。`,
    );
  }

  for (const pid of ownedPids) {
    process.kill(pid, "SIGTERM");
  }

  const deadline = Date.now() + 2_000;
  while (
    ownedPids.some(isProcessRunning)
    && Date.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const remainingPids = ownedPids.filter(isProcessRunning);
  if (remainingPids.length > 0) {
    throw new Error(
      `手机 Demo 未在 2 秒内停止；仍在运行的 PID：${remainingPids.join(", ")}`,
    );
  }

  console.log(
    `手机 Demo 已关闭；释放端口 ${phoneDemoPort}（PID ${ownedPids.join(", ")}）。`,
  );
}

async function main() {
  switch (workflow) {
    case "demo:phone":
      await runStep("手机 Demo", viteCli, [
        "--host",
        "0.0.0.0",
        "--port",
        String(phoneDemoPort),
        "--strictPort",
      ]);
      break;
    case "demo:stop":
      await stopPhoneDemo();
      break;
    case "check:fast":
      await checkFast();
      break;
    case "check:phone":
      await checkPhone();
      break;
    case "check:full":
      await checkFull();
      break;
    default:
      throw new Error(
        "用法：node scripts/run-workflow.mjs <demo:phone|demo:stop|check:fast|check:phone|check:full>",
      );
  }
}

try {
  await main();
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
}
