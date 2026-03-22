import { spawnSync } from 'node:child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const result = spawnSync(npmCmd, ['run', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    ANALYZE: 'true',
  },
});

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
