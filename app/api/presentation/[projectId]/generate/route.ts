import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { request1ConfigAndPlan, request2BuildPresentation } from '@/lib/presentation/two-step';
import {
  createPresentationVersion,
  getNextProjectVersionNumber,
  getPresentationProject,
  listPresentationSources,
} from '@/lib/presentation/store';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';
import { buildSourceCorpus } from '@/lib/presentation/source-corpus';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  title: z.string().optional(),
  prompt: z.string().optional(),
  language: z.string().optional(),
  autoMode: z.boolean().optional(),
  uiConfig: z.record(z.any()).optional(),
  slideSubjects: z.array(z.string()).optional(),
  setupPreset: z
    .object({
      title: z.string().optional(),
      themePreset: z.string().optional(),
      fontPreset: z.string().optional(),
      layoutPreset: z.string().optional(),
      bulletPreset: z.string().optional(),
    })
    .optional(),
});

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

    const plan = request1ConfigAndPlan({
      sourceText,
      userConfig: {
        ...(project.ui_config || {}),
        ...(payload.uiConfig || {}),
        platform: project.selected_platform,
      } as any,
      autoMode: payload.autoMode,
      lockedControls: [],
      preferredSubjects: payload.slideSubjects || project.workflow_state?.slideSubjects || [],
    });
    const built = request2BuildPresentation({
      sourceText,
      title: payload.title || project.title,
      language: payload.language || project.language || 'en',
      plan,
      overrides: payload.uiConfig || {},
      lockedControls: [],
      slideSubjects: payload.slideSubjects || project.workflow_state?.slideSubjects || [],
      setupPreset: payload.setupPreset || project.workflow_state?.setupPreset || {},
    });

    const versionNumber = await getNextProjectVersionNumber({ supabase, projectId });
    const version = await createPresentationVersion({
      supabase,
      userId: user.id,
      projectId,
      versionNumber,
      blueprint: built.blueprint,
      analysis: plan.analysis,
      quality: built.quality,
      previewManifest: built.previewManifest,
      generationSummary: `Generated ${built.previewManifest.slideCount} slides from ${sources.length} source(s).`,
    });

    return NextResponse.json({
      ok: true,
      projectId,
      versionId: version.id,
      versionNumber: version.version_number,
      analysis: plan.analysis,
      effectiveConfig: plan.effectiveConfig,
      plan,
      blueprint: built.blueprint,
      previewManifest: built.previewManifest,
      quality: built.quality,
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
