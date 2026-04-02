import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  sourceText: z.string().min(1),
  title: z.string().optional(),
  platform: z.enum(['powerpoint', 'google-slides', 'keynote']).default('powerpoint'),
  slideCount: z.number().int().min(3).max(30).default(8),
  options: z.object({
    tone: z.enum(['academic', 'professional', 'simple', 'persuasive']).optional(),
    density: z.enum(['light', 'balanced', 'dense']).optional(),
    includeAgenda: z.boolean().optional(),
    includeSummary: z.boolean().optional(),
    includeQnA: z.boolean().optional(),
    imageRichness: z.number().min(0).max(100).optional(),
  }).optional(),
});

const clean = (line: string) => line.replace(/\s+/g, ' ').trim();

const stripTags = (input: string): string =>
  input
    .replace(/\{[^}]+\}/g, ' ')
    .replace(/\[(?:file|type|text|header|bullet|font|image|link|link-count|slide)\s*[^\]]*\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sentenceSplit = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+/g)
    .map((s) => clean(s))
    .filter(Boolean);

const truncateWords = (value: string, maxWords: number): string => {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(' ')}...`;
};

const toTitle = (value: string): string => {
  const stripped = value
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[:;,.\-\s]+$/, '')
    .trim();
  return truncateWords(stripped || 'Slide', 8);
};

export async function POST(req: NextRequest) {
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const { sourceText, title, slideCount, platform, options } = parsed.data;
    const normalized = stripTags(sourceText);
    const sentences = sentenceSplit(normalized);
    const effectiveSentences = sentences.length > 0 ? sentences : [clean(normalized)];

    const density = options?.density || 'balanced';
    const bulletsPerSlide = density === 'light' ? 3 : density === 'dense' ? 6 : 4;

    const generatedSlides: Array<{ index: number; heading: string; bullets: string[]; imageHints: string[] }> = [];
    for (let i = 0; i < slideCount; i += 1) {
      const start = i * bulletsPerSlide;
      const chunk = effectiveSentences.slice(start, start + bulletsPerSlide + 1);
      if (chunk.length === 0) break;

      const heading = toTitle(chunk[0]);
      const bullets = (chunk.slice(1).length > 0 ? chunk.slice(1) : chunk)
        .map((line) => truncateWords(clean(line), 18))
        .filter(Boolean)
        .slice(0, bulletsPerSlide);

      generatedSlides.push({
        index: generatedSlides.length + 1,
        heading,
        bullets,
        imageHints: [
          `${heading} visual`,
          `${heading} chart`,
        ],
      });
    }

    if (options?.includeAgenda) {
      generatedSlides.unshift({
        index: 1,
        heading: 'Agenda',
        bullets: ['Context', 'Core points', 'Examples', 'Wrap-up'],
        imageHints: ['agenda timeline'],
      });
    }

    if (options?.includeSummary) {
      generatedSlides.push({
        index: generatedSlides.length + 1,
        heading: 'Summary',
        bullets: ['Key takeaways', 'Main definitions', 'What to remember'],
        imageHints: ['summary board'],
      });
    }

    if (options?.includeQnA) {
      generatedSlides.push({
        index: generatedSlides.length + 1,
        heading: 'Q and A',
        bullets: ['Open questions', 'Clarifications', 'Next steps'],
        imageHints: ['questions icon'],
      });
    }

    const slides = generatedSlides.slice(0, 40).map((slide, idx) => ({ ...slide, index: idx + 1 }));

    const deckTitle = truncateWords(
      clean(title?.trim() || toTitle(effectiveSentences[0] || 'Presentation')),
      10
    );

    const estimatedTokens = Math.ceil(sourceText.length / 4);
    const estimatedCostHint = {
      strategy: 'single-pass outline + deterministic slide mapper',
      estimatedPromptTokens: estimatedTokens,
      estimatedCompletionTokens: slides.length * 100,
      note: 'Low-cost mode: one outline pass, deterministic rendering and export.',
    };

    return NextResponse.json({
      ok: true,
      prototype: {
        platform,
        title: deckTitle,
        slideCount: slides.length,
        slides,
        estimatedCostHint,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to build presentation prototype' }, { status: 500 });
  }
}
