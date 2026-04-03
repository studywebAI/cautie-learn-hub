import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';
import { getPresentationProject, listPresentationSources, updatePresentationProject } from '@/lib/presentation/store';
import { request1ConfigAndPlan } from '@/lib/presentation/two-step';
import { RelevantControlKey } from '@/lib/presentation/types';
import { buildSourceCorpus } from '@/lib/presentation/source-corpus';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  prompt: z.string().optional(),
  autoMode: z.boolean().optional(),
  uiConfig: z.record(z.any()).optional(),
  lockedControls: z.array(z.string()).optional(),
  slideSubjects: z.array(z.string()).optional(),
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
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    const sources = await listPresentationSources({ supabase, userId: user.id, projectId });
    const sourceText = buildSourceCorpus({
      prompt: payload.prompt || project.prompt,
      sources,
    });
    if (!sourceText.trim()) {
      return NextResponse.json({ error: 'No source material found for planning' }, { status: 400 });
    }

    const lockedControls = (payload.lockedControls || []).filter(Boolean) as RelevantControlKey[];
    const plan = request1ConfigAndPlan({
      sourceText,
      userConfig: {
        ...(project.ui_config || {}),
        ...(payload.uiConfig || {}),
        platform: project.selected_platform,
      },
      lockedControls,
      autoMode: payload.autoMode,
      preferredSubjects: payload.slideSubjects || project.workflow_state?.slideSubjects || [],
    });

    await updatePresentationProject({
      supabase,
      userId: user.id,
      projectId,
      patch: {
        ai_suggested_config: plan.analysis.recommendedSettings || {},
        effective_config: plan.effectiveConfig,
        workflow_state: {
          ...(project.workflow_state || {}),
          stage: 'subjects',
          updatedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      projectId,
      sourceText,
      plan,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to plan presentation' }, { status: 500 });
  }
}
