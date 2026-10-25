// Runs the production build the way the container does: `output: 'standalone'` emits
// .next/standalone/server.js, which needs the static assets copied next to it.
import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const standalone = '.next/standalone';
if (!existsSync(`${standalone}/server.js`)) {
  console.error('No standalone build found. Run `pnpm build` first.');
  process.exit(1);
}
cpSync('.next/static', `${standalone}/.next/static`, { recursive: true });
if (existsSync('public'))
  cpSync('public', `${standalone}/public`, { recursive: true });

const server = spawn(process.execPath, [`${standalone}/server.js`], {
  stdio: 'inherit',
  env: { PORT: '3000', ...process.env },
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', (code) => process.exit(code ?? 0));
