import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';
import { getPresentationProject, updatePresentationProject } from '@/lib/presentation/store';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  stage: z.enum(['upload', 'subjects', 'style', 'building', 'result']).optional(),
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
  uiConfig: z.record(z.any()).optional(),
  title: z.string().optional(),
  platform: z.enum(['powerpoint', 'google-slides', 'keynote']).optional(),
  prompt: z.string().optional(),
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

    const mergedWorkflow = {
      ...(project.workflow_state || {}),
      ...(typeof payload.stage === 'string' ? { stage: payload.stage } : {}),
      ...(Array.isArray(payload.slideSubjects) ? { slideSubjects: payload.slideSubjects } : {}),
      ...(payload.setupPreset ? { setupPreset: payload.setupPreset } : {}),
      updatedAt: new Date().toISOString(),
    };

    const updated = await updatePresentationProject({
      supabase,
      userId: user.id,
      projectId,
      patch: {
        title: payload.title || project.title,
        prompt: typeof payload.prompt === 'string' ? payload.prompt : project.prompt,
        selected_platform: payload.platform || project.selected_platform,
        ui_config: payload.uiConfig ? { ...(project.ui_config || {}), ...(payload.uiConfig || {}) } : project.ui_config,
        workflow_state: mergedWorkflow,
      },
    });

    return NextResponse.json({ ok: true, project: updated });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to persist workflow' }, { status: 500 });
  }
}

