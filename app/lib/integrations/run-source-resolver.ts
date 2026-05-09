import { listIntegrationSources } from '@/lib/integrations/source-store';

const SOURCE_ENABLED_TOOLS = new Set([
  'quiz',
  'notes',
  'flashcards',
  'timeline',
  'wordweb',
  'mindmap',
  'presentation',
]);
const MAX_INTEGRATION_SOURCE_TEXT_CHARS = 40_000;
const INLINE_URL_REGEX = /\bhttps?:\/\/[^\s<>"')]+/gi;

function mergeSourceText(base: string, additions: string[]) {
  const cleanBase = (base || '').trim();
  const seen = new Set<string>();
  const cleanAdditions = additions
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((block) => {
      if (seen.has(block)) return false;
      seen.add(block);
      return true;
    });
  if (cleanAdditions.length === 0) return cleanBase;
  // Put extracted/imported sources first so generation is grounded in real materials.
  // Keep manual text at the end as optional hints.
  const merged = [...cleanAdditions, cleanBase].filter(Boolean).join('\n\n');
  return merged.slice(0, MAX_INTEGRATION_SOURCE_TEXT_CHARS);
}

function isLikelyImageSource(source: any) {
  const mime = String(source?.mime_type || '').toLowerCase();
  const name = String(source?.name || '').toLowerCase();
  return mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(name);
}

function stripInlineUrls(value: string) {
  return String(value || '').replace(INLINE_URL_REGEX, '').replace(/\s{2,}/g, ' ').trim();
}

export async function resolveSelectedSourcesForRun(
  supabase: any,
  input: {
    userId: string;
    toolId: string;
    baseInput: Record<string, any>;
  }
) {
  if (!SOURCE_ENABLED_TOOLS.has(input.toolId)) {
    return {
      input: input.baseInput,
      sourceRefs: [] as Array<{ provider: string; app: string; name: string; status: string; hasExtractedText: boolean }>,
      selectedSourcesRaw: [] as any[],
    };
  }

  const selectedSources = await listIntegrationSources(supabase, input.userId, {
    selectedOnly: true,
    limit: 50,
  }).catch(() => []);

  if (!Array.isArray(selectedSources) || selectedSources.length === 0) {
    return {
      input: input.baseInput,
      sourceRefs: [] as Array<{ provider: string; app: string; name: string; status: string; hasExtractedText: boolean }>,
      selectedSourcesRaw: [] as any[],
    };
  }

  const sourceRefs = selectedSources.map((source) => ({
    provider: source.provider,
    app: source.app,
    name: source.name,
    status: source.extraction_status,
    hasExtractedText: Boolean(source.extracted_text && source.extracted_text.trim()),
  }));

  const extractedBlocks = selectedSources
    .map((source, index) => {
      const text = stripInlineUrls(source.extracted_text || '');
      if (!text) return '';
      const sourceUrl = typeof source?.web_url === 'string' ? source.web_url.trim() : '';
      const sourceDomain = sourceUrl ? (() => {
        try {
          return new URL(sourceUrl).hostname;
        } catch {
          return '';
        }
      })() : '';
      const sourceLabel = sourceDomain || source.name || `Imported source ${index + 1}`;
      return `[LINK_SOURCE ${index + 1}: ${sourceLabel}${sourceUrl ? ` | ${sourceUrl}` : ''}]\n${text}`;
    })
    .filter(Boolean);

  const mediaBlocks = selectedSources
    .map((source) => {
      const previewUrl = typeof source?.metadata?.preview_url === 'string' ? source.metadata.preview_url : '';
      if (previewUrl) return previewUrl;
      if (isLikelyImageSource(source) && source.web_url) return String(source.web_url);
      return '';
    })
    .filter(Boolean)
    .map((url) => `{{media url=${url}}}`);

  const existingSourceText = typeof input.baseInput?.sourceText === 'string' ? input.baseInput.sourceText : '';
  const mergedSourceText = mergeSourceText(existingSourceText, [...mediaBlocks, ...extractedBlocks]);

  return {
    input: { ...input.baseInput, sourceText: mergedSourceText },
    sourceRefs,
    selectedSourcesRaw: selectedSources,
  };
}
