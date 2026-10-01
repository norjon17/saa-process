// Hosts the production build through a Cloudflare quick tunnel (https://<random>.trycloudflare.com, no account needed).
// `npm run tunnel:build` rebuilds client + server first; `npm run tunnel` reuses the last build.
// Steps: check build → Postgres up → migrate → start server (NODE_ENV=production) → wait for /api/health → open tunnel.
// Ctrl+C stops the tunnel and the server (Postgres keeps running; `npm run db:down` to stop it).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { bin, install, Tunnel } from 'cloudflared';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
const port = Number(process.env.PORT ?? 3000);
const local = `http://127.0.0.1:${port}`;

const log = (msg) => console.info(`[tunnel] ${msg}`);
const fail = (msg) => {
  console.error(`[tunnel] ${msg}`);
  process.exit(1);
};

async function healthy() {
  try {
    const res = await fetch(`${local}/api/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

function run(script) {
  log(`npm run ${script}`);
  const r = spawnSync('npm', ['run', script], { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) fail(`"npm run ${script}" failed (exit ${r.status})`);
}

// 1. The build must exist — this script never serves the Vite dev server.
if (!existsSync(path.join(root, 'client/dist/index.html')) || !existsSync(path.join(root, 'server/dist/server.js'))) {
  fail('No production build found. Run "npm run tunnel:build" (builds, then hosts).');
}
if (await healthy()) fail(`Port ${port} is already in use (another server running?). Stop it first.`);

// 2. Database.
run('db:up');
run('db:migrate');

// 3. Server. Environment variables override --env-file values in Node, so these win over .env.
log(`starting server on ${local}`);
const server = spawn(process.execPath, ['--env-file=../.env', 'dist/server.js'], {
  cwd: path.join(root, 'server'),
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production', COOKIE_SECURE: 'true', LOG_LEVEL: process.env.LOG_LEVEL ?? 'info' },
});

let tunnel;
let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  log('stopping…');
  tunnel?.stop();
  if (server.exitCode === null) server.kill();
  setTimeout(() => process.exit(code), 500);
};
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
server.on('exit', (code) => {
  if (!stopping) {
    console.error(`[tunnel] server exited (code ${code})`);
    stop(1);
  }
});

const deadline = Date.now() + 30_000;
while (!(await healthy())) {
  if (stopping) process.exit(1);
  if (Date.now() > deadline) {
    console.error('[tunnel] server did not become healthy within 30 s');
    stop(1);
  }
  await new Promise((r) => setTimeout(r, 400));
}

// 4. Tunnel. The npm "cloudflared" package downloads the binary on install; fetch it now if install scripts were skipped.
if (!existsSync(bin)) {
  log('downloading cloudflared binary…');
  await install(bin);
}
log('opening Cloudflare quick tunnel…');
tunnel = Tunnel.quick(local);
tunnel.once('url', (url) => {
  const line = '─'.repeat(url.length + 4);
  console.info(`\n  ┌${line}┐\n  │  ${url}  │\n  └${line}┘`);
  console.info('  Public URL — anyone with this link can reach the login page. Ctrl+C to stop.\n');
});
tunnel.once('connected', (c) => log(`connected via ${c.location} (${c.ip})`));
tunnel.on('error', (err) => {
  console.error('[tunnel] cloudflared error:', err.message);
  stop(1);
});
tunnel.on('exit', (code) => {
  if (!stopping) {
    console.error(`[tunnel] cloudflared exited (code ${code})`);
    stop(1);
  }
});
