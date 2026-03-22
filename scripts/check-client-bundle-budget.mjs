import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appChunksDir = path.join(root, '.next', 'static', 'chunks', 'app');

if (!fs.existsSync(appChunksDir)) {
  console.error('Bundle budget check failed: .next build output not found. Run `npm run build` first.');
  process.exit(1);
}

const toPosix = (value) => value.split(path.sep).join('/');

function collectJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = collectJsFiles(appChunksDir).map((filePath) => ({
  absolutePath: filePath,
  relativePath: toPosix(path.relative(root, filePath)),
  size: fs.statSync(filePath).size,
}));

const mainPageChunks = files.filter(
  (file) =>
    file.relativePath.includes('.next/static/chunks/app/(main)/') &&
    file.relativePath.includes('/page-')
);

const mainLayoutChunk = files.find((file) =>
  file.relativePath.includes('.next/static/chunks/app/(main)/layout-')
);

const largestMainPage = [...mainPageChunks].sort((a, b) => b.size - a.size)[0];
const top5MainPagesTotal = [...mainPageChunks]
  .sort((a, b) => b.size - a.size)
  .slice(0, 5)
  .reduce((total, file) => total + file.size, 0);

const budgets = [
  {
    name: 'Main layout chunk',
    actual: mainLayoutChunk?.size ?? 0,
    max: 30_000,
  },
  {
    name: 'Largest (main) page chunk',
    actual: largestMainPage?.size ?? 0,
    max: 180_000,
  },
  {
    name: 'Top 5 (main) page chunks total',
    actual: top5MainPagesTotal,
    max: 430_000,
  },
];

let hasFailure = false;
for (const budget of budgets) {
  if (budget.actual > budget.max) {
    hasFailure = true;
    console.error(
      `[BUDGET] FAIL ${budget.name}: ${budget.actual} bytes > ${budget.max} bytes`
    );
  } else {
    console.log(
      `[BUDGET] PASS ${budget.name}: ${budget.actual} bytes <= ${budget.max} bytes`
    );
  }
}

if (largestMainPage) {
  console.log(
    `[BUDGET] Largest main page file: ${largestMainPage.relativePath} (${largestMainPage.size} bytes)`
  );
}
if (mainLayoutChunk) {
  console.log(
    `[BUDGET] Main layout file: ${mainLayoutChunk.relativePath} (${mainLayoutChunk.size} bytes)`
  );
}

if (hasFailure) {
  process.exit(1);
}
