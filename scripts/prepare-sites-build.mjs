import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const projectDir = fileURLToPath(new URL('../', import.meta.url));
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const stageDir = fileURLToPath(new URL('../.sites-stage/', import.meta.url));
const clientDir = fileURLToPath(new URL('../.sites-stage/dist/client/', import.meta.url));
const serverDir = fileURLToPath(new URL('../.sites-stage/dist/server/', import.meta.url));
const hostingDir = fileURLToPath(new URL('../.sites-stage/.openai/', import.meta.url));
const hostingSource = fileURLToPath(new URL('../.openai/hosting.json', import.meta.url));

const workerSource = `const worker = {
  async fetch(request, env) {
    if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
      return new Response('Static asset binding unavailable.', { status: 500 });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const url = new URL(request.url);
    url.pathname = '/index.html';
    return env.ASSETS.fetch(new Request(url, request));
  }
};

export default worker;
`;

await rm(stageDir, { recursive: true, force: true });
await mkdir(clientDir, { recursive: true });
await mkdir(serverDir, { recursive: true });
await mkdir(hostingDir, { recursive: true });
await cp(distDir, clientDir, { recursive: true });
await writeFile(`${serverDir}/index.js`, workerSource, 'utf8');
await writeFile(`${hostingDir}/hosting.json`, await readFile(hostingSource));

console.log(`Sites 运行包已准备：${projectDir}.sites-stage/`);
