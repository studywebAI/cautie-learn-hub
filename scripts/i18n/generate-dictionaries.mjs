import fs from 'fs/promises';
import path from 'path';

const DICT_DIR = path.join(process.cwd(), 'app', 'lib', 'dictionaries');
const sourceLocale = 'en';
const targetLocales = ['nl', 'es', 'ru', 'zh', 'de', 'pl', 'fr', 'ar', 'hi', 'bn', 'pt', 'ur', 'it', 'tr', 'id'];
const CONCURRENCY = 3;
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 400;

function flattenObject(obj, prefix = '', out = {}) {
  if (typeof obj === 'string') {
    out[prefix] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((value, index) => {
      flattenObject(value, `${prefix}[${index}]`, out);
    });
    return out;
  }
  if (obj && typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenObject(value, nextPrefix, out);
    });
  }
  return out;
}

function setByPath(target, rawPath, value) {
  const tokens = [];
  rawPath.split('.').forEach((segment) => {
    const regex = /([^\[\]]+)|\[(\d+)\]/g;
    let match;
    while ((match = regex.exec(segment)) !== null) {
      if (match[1]) tokens.push(match[1]);
      if (match[2]) tokens.push(Number(match[2]));
    }
  });

  let current = target;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];
    const isLast = i === tokens.length - 1;

    if (isLast) {
      current[token] = value;
      return;
    }

    if (current[token] === undefined) {
      current[token] = typeof nextToken === 'number' ? [] : {};
    }
    current = current[token];
  }
}

function unflattenObject(flatMap) {
  const result = {};
  Object.entries(flatMap).forEach(([key, value]) => {
    setByPath(result, key, value);
  });
  return result;
}

function shouldSkipTranslation(text) {
  if (!text || !text.trim()) return true;
  if (/^\s+$/.test(text)) return true;
  return false;
}

async function translateText(text, locale, attempt = 0) {
  if (shouldSkipTranslation(text) || locale === sourceLocale) return text;

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLocale}&tl=${locale}&dt=t&q=${encodeURIComponent(text)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const segments = Array.isArray(payload?.[0]) ? payload[0] : [];
    const translated = segments.map((segment) => segment?.[0] || '').join('');
    return translated || text;
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      console.warn(`[i18n] fallback to source for locale=${locale}:`, text);
      return text;
    }
    const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return translateText(text, locale, attempt + 1);
  }
}

async function mapWithConcurrency(items, worker, concurrency = 3) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

async function main() {
  const sourcePath = path.join(DICT_DIR, `${sourceLocale}.json`);
  const sourceRaw = await fs.readFile(sourcePath, 'utf8');
  const sourceJson = JSON.parse(sourceRaw);
  const sourceFlat = flattenObject(sourceJson);
  const entries = Object.entries(sourceFlat);

  console.log(`[i18n] source keys: ${entries.length}`);

  for (const locale of targetLocales) {
    console.log(`[i18n] generating ${locale}...`);
    const cache = new Map();

    const translatedEntries = await mapWithConcurrency(
      entries,
      async ([key, value], idx) => {
        if (cache.has(value)) {
          return [key, cache.get(value)];
        }
        const translated = await translateText(value, locale);
        cache.set(value, translated);
        if ((idx + 1) % 40 === 0) {
          console.log(`[i18n] ${locale}: ${idx + 1}/${entries.length}`);
        }
        return [key, translated];
      },
      CONCURRENCY,
    );

    const translatedFlat = Object.fromEntries(translatedEntries);
    const translatedJson = unflattenObject(translatedFlat);
    const outPath = path.join(DICT_DIR, `${locale}.json`);
    await fs.writeFile(outPath, `${JSON.stringify(translatedJson, null, 2)}\n`, 'utf8');
    console.log(`[i18n] wrote ${outPath}`);
  }

  console.log('[i18n] done');
}

main().catch((error) => {
  console.error('[i18n] failed', error);
  process.exit(1);
});
