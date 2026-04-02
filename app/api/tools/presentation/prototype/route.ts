import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  sourceText: z.string().min(1),
  title: z.string().optional(),
  platform: z.enum(['powerpoint', 'google-slides', 'keynote']).default('powerpoint'),
  slideCount: z.number().int().min(3).max(30).default(8),
});

const cleanLine = (line: string) => line.replace(/\s+/g, ' ').trim();

const stripLayoutTags = (input: string): string => {
  return input
    .replace(/\{[^}]+\}/g, ' ')
    .replace(/\[(?:file|type|text|header|bullet|font|image|link|link-count|slide)\s*[^\]]*\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const splitIntoSections = (text: string): string[] => {
  const normalizedText = stripLayoutTags(text);
  const blocks = normalizedText
    .split(/\n{2,}/g)
    .map((part) => cleanLine(part))
    .filter(Boolean);
  if (blocks.length > 0) return blocks;
  return normalizedText
    .split(/[.!?]\s+/g)
    .map((part) => cleanLine(part))
    .filter(Boolean);
};

export async function POST(req: NextRequest) {
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const { sourceText, title, slideCount, platform } = parsed.data;
    const sections = splitIntoSections(sourceText);
    const picked = sections.slice(0, slideCount);
    const deckTitle = title?.trim() || cleanLine(sections[0] || 'Presentation');

    const slides = picked.map((section, idx) => {
      const lines = section
        .split(/(?<=[.!?])\s+/g)
        .map((line) => cleanLine(line))
        .filter(Boolean)
        .slice(0, 5);
      const heading = lines[0]?.slice(0, 80) || `Slide ${idx + 1}`;
      const bullets = lines.slice(1).map((line) => line.replace(/^[\-*]\s*/, ''));
      return {
        index: idx + 1,
        heading,
        bullets: bullets.length > 0 ? bullets : ['Add supporting detail.'],
        imageHints: [`${heading} diagram`, `${heading} key visual`],
      };
    });

    const estimatedTokens = Math.ceil(sourceText.length / 4);
    const estimatedCostHint = {
      strategy: 'single-pass outline + deterministic slide mapper',
      estimatedPromptTokens: estimatedTokens,
      estimatedCompletionTokens: slides.length * 140,
      note: 'Use one low-cost model pass for outline only; render slides deterministically in backend.',
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
