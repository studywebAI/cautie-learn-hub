import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'app/(main)/agenda/page.tsx',
    mustInclude: ['PageSection', '<PageSection'],
    mustNotInclude: ['agenda-clean h-full p-4 md:p-5'],
  },
  {
    file: 'app/(main)/tools/studyset/page.tsx',
    mustInclude: ['PageSection', '<PageSection variant="tool">'],
    mustNotInclude: ['mx-auto flex min-h-full w-full max-w-[1180px]'],
  },
  {
    file: 'app/(main)/tools/studyset/[studysetId]/page.tsx',
    mustInclude: ['PageSection', '<PageSection variant="tool">'],
    mustNotInclude: ['<div className="h-full overflow-auto">'],
  },
];

const failures = [];

for (const check of checks) {
  const abs = path.join(root, check.file);
  if (!fs.existsSync(abs)) {
    failures.push(`${check.file}: file not found`);
    continue;
  }

  const text = fs.readFileSync(abs, 'utf8');

  for (const token of check.mustInclude) {
    if (!text.includes(token)) {
      failures.push(`${check.file}: missing required token "${token}"`);
    }
  }

  for (const token of check.mustNotInclude) {
    if (text.includes(token)) {
      failures.push(`${check.file}: forbidden token found "${token}"`);
    }
  }
}

if (failures.length > 0) {
  console.error('Layout spacing guard failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Layout spacing guard passed.');

