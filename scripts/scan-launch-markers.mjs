import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_SCAN = path.join(ROOT, 'docs', 'launch', 'code-markers-scan.txt');
const OUTPUT_SUMMARY = path.join(ROOT, 'docs', 'launch', 'code-markers-summary.txt');

const SCAN_DIRS = ['app', 'docs', 'supabase', 'scripts'];
const ALLOWED_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.sql', '.css']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.vercel', 'dist', 'build']);
const MARKER = /\b(TODO|FIXME|placeholder|mock|hardcoded|temporary|debug)\b/gi;

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.DS_Store')) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(absolute, out);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) continue;
    out.push(absolute);
  }
  return out;
}

function normalize(p) {
  return p.replaceAll(path.sep, '/');
}

async function scanFile(file) {
  const text = await fs.readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const hits = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    MARKER.lastIndex = 0;
    if (!MARKER.test(line)) continue;
    hits.push({
      file: normalize(path.relative(ROOT, file)),
      line: i + 1,
      text: line.trim(),
    });
  }

  return hits;
}

async function main() {
  const files = [];
  for (const relativeDir of SCAN_DIRS) {
    const dir = path.join(ROOT, relativeDir);
    try {
      await fs.access(dir);
      await walk(dir, files);
    } catch {
      // Ignore missing dirs
    }
  }

  const allHits = [];
  for (const file of files) {
    const hits = await scanFile(file);
    allHits.push(...hits);
  }

  const byFile = new Map();
  for (const hit of allHits) {
    byFile.set(hit.file, (byFile.get(hit.file) || 0) + 1);
  }

  const sortedByFile = [...byFile.entries()].sort((a, b) => b[1] - a[1]);

  const scanBody = allHits
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
    .map((hit) => `${hit.file}:${hit.line}:${hit.text}`)
    .join('\n');

  const summaryLines = [
    `Total marker hits: ${allHits.length}`,
    'Top files by marker count:',
    ...sortedByFile.slice(0, 50).map(([file, count]) => `${count.toString().padStart(4, ' ')}  ${file}`),
    '',
    `Scanned files: ${files.length}`,
    `Scanned roots: ${SCAN_DIRS.join(', ')}`,
    'Marker pattern: TODO|FIXME|placeholder|mock|hardcoded|temporary|debug',
  ];

  await fs.writeFile(OUTPUT_SCAN, `${scanBody}\n`, 'utf8');
  await fs.writeFile(OUTPUT_SUMMARY, `${summaryLines.join('\n')}\n`, 'utf8');

  console.log(`Wrote ${OUTPUT_SCAN}`);
  console.log(`Wrote ${OUTPUT_SUMMARY}`);
  console.log(`Hits: ${allHits.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
