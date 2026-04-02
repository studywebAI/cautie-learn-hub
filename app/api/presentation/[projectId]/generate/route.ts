import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  analyzeSources,
  buildBlueprint,
  buildPreviewManifest,
  getDefaultConfig,
  resolveEffectiveConfig,
} from '@/lib/presentation/pipeline';
import { scoreBlueprint } from '@/lib/presentation/quality';
import {
  createPresentationVersion,
  getNextProjectVersionNumber,
  getPresentationProject,
  listPresentationSources,
} from '@/lib/presentation/store';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  title: z.string().optional(),
  prompt: z.string().optional(),
  language: z.string().optional(),
  autoMode: z.boolean().optional(),
  uiConfig: z.record(z.any()).optional(),
});

function buildSourceCorpus(input: {
  prompt?: string;
  sources: Array<{ extracted_text?: string | null; content?: string | null; file_name?: string | null }>;
}) {
  const chunks: string[] = [];
  if (input.prompt?.trim()) chunks.push(input.prompt.trim());
  for (const source of input.sources) {
    const text = String(source.extracted_text || source.content || '').trim();
    if (!text) continue;
    const label = source.file_name ? `[${source.file_name}]` : '[source]';
    chunks.push(`${label}\n${text}`);
  }
  return chunks.join('\n\n').trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const payload = RequestSchema.parse(await request.json());
    const { supabase, user } = await getAuthedToolboxContext();

    const project = await getPresentationProject({ supabase, userId: user.id, projectId });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await supabase
      .from('presentation_projects')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', user.id);

    const sources = await listPresentationSources({ supabase, userId: user.id, projectId });
    const sourceText = buildSourceCorpus({
      prompt: payload.prompt || project.prompt,
      sources,
    });
    if (!sourceText.trim()) {
      return NextResponse.json({ error: 'No source material found for generation' }, { status: 400 });
    }

    const analysis = analyzeSources({
      sourceText,
      currentConfig: payload.uiConfig as any,
    });

    const effectiveConfig = resolveEffectiveConfig({
      analysis,
      userConfig: {
        ...getDefaultConfig(),
        ...(project.ui_config || {}),
        ...(payload.uiConfig || {}),
        platform: project.selected_platform,
      } as any,
      autoMode: payload.autoMode,
    });

    const blueprint = buildBlueprint({
      sourceText,
      title: payload.title || project.title,
      language: payload.language || project.language || 'en',
      config: effectiveConfig,
    });
    const previewManifest = buildPreviewManifest(blueprint);
    const quality = scoreBlueprint(blueprint);

    const versionNumber = await getNextProjectVersionNumber({ supabase, projectId });
    const version = await createPresentationVersion({
      supabase,
      userId: user.id,
      projectId,
      versionNumber,
      blueprint,
      analysis,
      quality,
      previewManifest,
      generationSummary: `Generated ${previewManifest.slideCount} slides from ${sources.length} source(s).`,
    });

    return NextResponse.json({
      ok: true,
      projectId,
      versionId: version.id,
      versionNumber: version.version_number,
      analysis,
      effectiveConfig,
      blueprint,
      previewManifest,
      quality,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to generate presentation' }, { status: 500 });
  }
}
