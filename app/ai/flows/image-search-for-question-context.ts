'use server';

import { z } from 'genkit';

const ImageSearchForQuestionContextInputSchema = z.object({
  sourceText: z.string(),
  query: z.string().optional(),
  limit: z.number().optional().default(6),
});

const ImageResultSchema = z.object({
  title: z.string(),
  imageUrl: z.string(),
  pageUrl: z.string(),
  source: z.string(),
});

const ImageSearchForQuestionContextOutputSchema = z.object({
  query: z.string(),
  results: z.array(ImageResultSchema),
});

const buildQuery = (sourceText: string, explicitQuery?: string) => {
  const raw = String(explicitQuery || '').trim();
  if (raw) return raw;
  const cleaned = String(sourceText || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'history event';
  return cleaned.split(' ').slice(0, 12).join(' ');
};

async function searchWithTavily(query: string, limit: number) {
  const apiKey = String(process.env.TAVILY_API_KEY || '').trim();
  if (!apiKey) return [] as Array<{ title: string; imageUrl: string; pageUrl: string; source: string }>;

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    cache: 'no-store',
    body: JSON.stringify({
      query,
      max_results: Math.max(limit, 5),
      search_depth: 'basic',
      include_images: true,
      include_image_descriptions: false,
      include_answer: false,
      include_raw_content: false,
      topic: 'general',
    }),
  });

  if (!response.ok) return [] as Array<{ title: string; imageUrl: string; pageUrl: string; source: string }>;
  const payload = await response.json().catch(() => ({} as any));
  const globalImages = Array.isArray(payload?.images) ? payload.images : [];
  const results = Array.isArray(payload?.results) ? payload.results : [];

  const fromGlobal = globalImages
    .map((entry: any, idx: number) => {
      const url = typeof entry === 'string' ? entry : String(entry?.url || '');
      const title = typeof entry?.description === 'string' && entry.description.trim() ? entry.description.trim() : `Internet image ${idx + 1}`;
      if (!url) return null;
      return {
        title,
        imageUrl: url,
        pageUrl: '',
        source: 'tavily-image-search',
      };
    })
    .filter(Boolean) as Array<{ title: string; imageUrl: string; pageUrl: string; source: string }>;

  const fromResults = results
    .flatMap((result: any) => {
      const pageUrl = String(result?.url || '');
      const pageTitle = String(result?.title || 'Internet image');
      const images = Array.isArray(result?.images) ? result.images : [];
      return images.map((img: any) => ({
        title: pageTitle,
        imageUrl: typeof img === 'string' ? img : String(img?.url || ''),
        pageUrl,
        source: 'tavily-page-images',
      }));
    })
    .filter((entry: any) => Boolean(entry.imageUrl));

  const merged = [...fromGlobal, ...fromResults];
  const seen = new Set<string>();
  const unique = merged.filter((entry) => {
    if (!entry.imageUrl) return false;
    if (seen.has(entry.imageUrl)) return false;
    seen.add(entry.imageUrl);
    return true;
  });
  return unique.slice(0, limit);
}

export async function imageSearchForQuestionContext(input: z.infer<typeof ImageSearchForQuestionContextInputSchema>) {
  const parsed = ImageSearchForQuestionContextInputSchema.parse(input);
  const query = buildQuery(parsed.sourceText, parsed.query);
  const limit = Math.max(1, Math.min(12, Number(parsed.limit || 6)));

  const tavilyResults = await searchWithTavily(query, limit);
  if (tavilyResults.length > 0) {
    return ImageSearchForQuestionContextOutputSchema.parse({
      query,
      results: tavilyResults,
    });
  }

  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    return ImageSearchForQuestionContextOutputSchema.parse({ query, results: [] });
  }
  const payload = await response.json().catch(() => ({}));
  const pages = payload?.query?.pages && typeof payload.query.pages === 'object' ? Object.values(payload.query.pages) : [];

  const results = (pages as any[])
    .map((page) => {
      const info = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null;
      const imageUrl = String(info?.url || '');
      const pageUrl = String(info?.descriptionurl || '');
      if (!imageUrl || !pageUrl) return null;
      return {
        title: String(page?.title || 'Image'),
        imageUrl,
        pageUrl,
        source: 'wikimedia-commons',
      };
    })
    .filter(Boolean) as Array<{ title: string; imageUrl: string; pageUrl: string; source: string }>;

  return ImageSearchForQuestionContextOutputSchema.parse({
    query,
    results: results.slice(0, limit),
  });
}
