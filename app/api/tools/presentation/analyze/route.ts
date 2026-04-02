import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeSources, getDefaultConfig, resolveEffectiveConfig } from '@/lib/presentation/pipeline';
import { PresentationUiConfig } from '@/lib/presentation/types';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  sourceText: z.string().min(1),
  currentConfig: z.custom<Partial<PresentationUiConfig>>().optional(),
  autoMode: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }

    const analysis = analyzeSources({
      sourceText: parsed.data.sourceText,
      currentConfig: parsed.data.currentConfig,
    });

    const effectiveConfig = resolveEffectiveConfig({
      analysis,
      userConfig: { ...getDefaultConfig(), ...(parsed.data.currentConfig || {}) },
      autoMode: parsed.data.autoMode,
    });

    return NextResponse.json({
      ok: true,
      analysis,
      suggestedSetup: {
        recommendedSettings: analysis.recommendedSettings,
        relevantControls: analysis.relevantControls,
        reasons: analysis.reasons,
      },
      effectiveConfig,
      policy: {
        aiGeneratedImagesAllowed: false,
        visualPriority: [
          'user_uploaded',
          'extracted_from_docs',
          'cloud_visuals',
          'internet_visuals',
          'icons_shapes_charts',
        ],
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to analyze sources' }, { status: 500 });
  }
}
