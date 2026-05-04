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

export async function imageSearchForQuestionContext(input: z.infer<typeof ImageSearchForQuestionContextInputSchema>) {
  const parsed = ImageSearchForQuestionContextInputSchema.parse(input);
  const query = buildQuery(parsed.sourceText, parsed.query);
  const limit = Math.max(1, Math.min(12, Number(parsed.limit || 6)));

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

