import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const excludedFile = path.join(root, 'docs', 'launch', 'sql-launch-excluded.txt');
const runOrderFile = path.join(root, 'docs', 'launch', 'sql-launch-run-order.txt');

const blockedPatterns = [/debug/i, /temp(orary)?/i, /emergency/i];

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const [hasExcluded, hasRunOrder] = await Promise.all([exists(excludedFile), exists(runOrderFile)]);
  if (!hasExcluded || !hasRunOrder) {
    throw new Error('Launch SQL artifacts missing. Run `npm run launch:sql-runbook` first.');
  }

  const migrationNames = (await fs.readdir(migrationsDir)).filter((name) => name.endsWith('.sql'));
  const excludedText = await fs.readFile(excludedFile, 'utf8');
  const runOrderText = await fs.readFile(runOrderFile, 'utf8');

  const violations = [];

  for (const name of migrationNames) {
    const isBlockedByName = blockedPatterns.some((pattern) => pattern.test(name));
    if (!isBlockedByName) continue;

    const inExcluded = excludedText.includes(`supabase/migrations/${name}`);
    const inRunOrder = runOrderText.split(/\r?\n/).includes(name);

    if (!inExcluded || inRunOrder) {
      violations.push(`Blocked migration policy mismatch: ${name} (inExcluded=${inExcluded}, inRunOrder=${inRunOrder})`);
    }
  }

  if (violations.length > 0) {
    throw new Error(violations.join('\n'));
  }

  console.log(`Launch SQL integrity check passed. migrations=${migrationNames.length}`);
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exitCode = 1;
});
