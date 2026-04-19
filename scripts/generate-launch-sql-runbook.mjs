import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const OUTPUT_RUNBOOK = path.join(ROOT, 'docs', 'launch', 'sql-launch-runbook.md');
const OUTPUT_ORDER = path.join(ROOT, 'docs', 'launch', 'sql-launch-run-order.txt');
const OUTPUT_EXCLUDED = path.join(ROOT, 'docs', 'launch', 'sql-launch-excluded.txt');

const EXCLUDE_PATTERNS = [
  { pattern: /(^|_)debug(_|\\.|$)/i, reason: 'Debug migration not allowed in launch pipeline' },
  { pattern: /(^|_)temp(orary)?(_|\\.|$)/i, reason: 'Temporary migration not allowed in launch pipeline' },
  { pattern: /emergency/i, reason: 'Emergency patch not allowed in launch pipeline' },
  { pattern: /restore_class_members/i, reason: 'One-off recovery migration excluded from clean launch setup' },
];

function relative(p) {
  return p.replaceAll(path.sep, '/').replace(`${ROOT.replaceAll(path.sep, '/')}/`, '');
}

function classifyMigration(name) {
  for (const rule of EXCLUDE_PATTERNS) {
    if (rule.pattern.test(name)) {
      return { include: false, reason: rule.reason };
    }
  }
  return { include: true, reason: '' };
}

async function listRootSqlFiles() {
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function main() {
  const migrationEntries = (await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const included = [];
  const excluded = [];

  for (const name of migrationEntries) {
    const classification = classifyMigration(name);
    if (classification.include) {
      included.push(name);
    } else {
      excluded.push({ name, reason: classification.reason });
    }
  }

  const rootSqlFiles = await listRootSqlFiles();

  const runbook = [
    '# Launch SQL Runbook',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Canonical Launch Migration Source',
    '- Only `supabase/migrations/*.sql` is allowed for launch DB rollout.',
    '- Root-level `*.sql` files are explicitly excluded from launch execution.',
    '',
    '## Ordered Launch Migration Run List',
    ...included.map((name, idx) => `${idx + 1}. \`${name}\``),
    '',
    '## Excluded Migration Files (supabase/migrations)',
    ...(excluded.length === 0
      ? ['- None']
      : excluded.map((entry) => `- \`${entry.name}\`: ${entry.reason}`)),
    '',
    '## Excluded Root-Level SQL Files (manual/archive only)',
    ...(rootSqlFiles.length === 0 ? ['- None'] : rootSqlFiles.map((name) => `- \`${name}\``)),
    '',
    '## Verification Checklist (run after apply)',
    '- [ ] `student_attendance` write/read works for all attendance action types.',
    '- [ ] `audit_logs` writes log code + category for attendance/rename/class events.',
    '- [ ] RLS is enabled on `classes`, `class_members`, `subjects`, `assignments`.',
    '- [ ] Class alias (`class_members.display_name`) is readable in group + attendance + logs.',
    '- [ ] `npm run typecheck` passes against current schema assumptions.',
  ].join('\n');

  await fs.writeFile(OUTPUT_RUNBOOK, `${runbook}\n`, 'utf8');
  await fs.writeFile(OUTPUT_ORDER, `${included.join('\n')}\n`, 'utf8');

  const excludedTxt = [
    ...excluded.map((entry) => `supabase/migrations/${entry.name} :: ${entry.reason}`),
    ...rootSqlFiles.map((name) => `${name} :: Root-level SQL excluded from launch pipeline`),
  ].join('\n');

  await fs.writeFile(OUTPUT_EXCLUDED, `${excludedTxt}\n`, 'utf8');

  console.log(`Included migrations: ${included.length}`);
  console.log(`Excluded migrations: ${excluded.length}`);
  console.log(`Excluded root SQL files: ${rootSqlFiles.length}`);
  console.log(`Wrote ${relative(OUTPUT_RUNBOOK)}`);
  console.log(`Wrote ${relative(OUTPUT_ORDER)}`);
  console.log(`Wrote ${relative(OUTPUT_EXCLUDED)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
