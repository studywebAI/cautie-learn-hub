import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  analyzeSources,
  buildBlueprint,
  buildPreviewManifest,
  getDefaultConfig,
  resolveEffectiveConfig,
} from '@/lib/presentation/pipeline';
import { PresentationUiConfig } from '@/lib/presentation/types';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  sourceText: z.string().min(1),
  title: z.string().optional(),
  language: z.string().optional(),
  autoMode: z.boolean().optional(),
  uiConfig: z.custom<Partial<PresentationUiConfig>>().optional(),
  analysis: z.any().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }

    const baseConfig = getDefaultConfig();
    const analysis = parsed.data.analysis && typeof parsed.data.analysis === 'object'
      ? parsed.data.analysis
      : analyzeSources({
          sourceText: parsed.data.sourceText,
          currentConfig: parsed.data.uiConfig,
        });

    const effectiveConfig = resolveEffectiveConfig({
      analysis,
      userConfig: { ...baseConfig, ...(parsed.data.uiConfig || {}) },
      autoMode: parsed.data.autoMode,
    });

    const blueprint = buildBlueprint({
      sourceText: parsed.data.sourceText,
      title: parsed.data.title,
      language: parsed.data.language || 'en',
      config: effectiveConfig,
    });
    const previewManifest = buildPreviewManifest(blueprint);

    const estimatedPromptTokens = Math.ceil(parsed.data.sourceText.length / 4);
    const estimatedCompletionTokens = blueprint.slides.length * 120;

    return NextResponse.json({
      ok: true,
      prototype: {
        title: blueprint.presentation.title,
        platform: blueprint.presentation.platform,
        slideCount: blueprint.slides.length,
        analysis,
        effectiveConfig,
        blueprint,
        previewManifest,
        timeline: [
          { step: 'sources analyzed', status: 'done' },
          { step: 'adaptive config generated', status: 'done' },
          { step: 'presentation planned', status: 'done' },
          { step: 'slides written', status: 'done' },
          { step: 'preview rendered', status: 'done' },
        ],
        policy: {
          aiGeneratedImagesAllowed: false,
          speakerNotesOptional: true,
        },
        estimatedCostHint: {
          strategy: 'source-first adaptive pipeline',
          estimatedPromptTokens,
          estimatedCompletionTokens,
          note: 'No AI-generated images. Source visuals first, internet visuals optional.',
        },
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to build presentation prototype' }, { status: 500 });
  }
}
