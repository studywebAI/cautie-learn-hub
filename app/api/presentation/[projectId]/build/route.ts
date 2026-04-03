import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';
import {
  createPresentationVersion,
  getNextProjectVersionNumber,
  getPresentationProject,
  listPresentationSources,
  updatePresentationProject,
} from '@/lib/presentation/store';
import { request1ConfigAndPlan, request2BuildPresentation } from '@/lib/presentation/two-step';
import { RelevantControlKey } from '@/lib/presentation/types';
import { buildSourceCorpus } from '@/lib/presentation/source-corpus';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  title: z.string().optional(),
  prompt: z.string().optional(),
  language: z.string().optional(),
  autoMode: z.boolean().optional(),
  uiConfig: z.record(z.any()).optional(),
  lockedControls: z.array(z.string()).optional(),
  plan: z.any().optional(),
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

function buildGenerationDirectives(input: {
  sourceText: string;
  slideSubjects?: string[];
  setupPreset?: {
    title?: string;
    themePreset?: string;
    fontPreset?: string;
    layoutPreset?: string;
    bulletPreset?: string;
  };
}) {
  const subjects = (input.slideSubjects || [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 60);
  const styleLines = [
    input.setupPreset?.title ? `Preset title: ${input.setupPreset.title}` : null,
    input.setupPreset?.themePreset ? `Theme preset: ${input.setupPreset.themePreset}` : null,
    input.setupPreset?.fontPreset ? `Font preset: ${input.setupPreset.fontPreset}` : null,
    input.setupPreset?.layoutPreset ? `Layout preset: ${input.setupPreset.layoutPreset}` : null,
    input.setupPreset?.bulletPreset ? `Bullet preset: ${input.setupPreset.bulletPreset}` : null,
  ].filter(Boolean);

  if (subjects.length === 0 && styleLines.length === 0) return input.sourceText;

  const directives: string[] = [];
  if (subjects.length > 0) {
    directives.push(
      'Slide subjects (must guide structure and order):',
      ...subjects.map((subject, idx) => `${idx + 1}. ${subject}`)
    );
  }
  if (styleLines.length > 0) {
    directives.push('Style directives:', ...styleLines.map((line) => String(line)));
  }

  return `${input.sourceText}\n\n[GENERATION_DIRECTIVES]\n${directives.join('\n')}`;
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
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    await updatePresentationProject({
      supabase,
      userId: user.id,
      projectId,
      patch: {
        status: 'processing',
        workflow_state: {
          ...(project.workflow_state || {}),
          stage: 'building',
          slideSubjects: payload.slideSubjects || project.workflow_state?.slideSubjects || [],
          setupPreset: payload.setupPreset || project.workflow_state?.setupPreset || {},
          updatedAt: new Date().toISOString(),
        },
      },
    });

    const sources = await listPresentationSources({ supabase, userId: user.id, projectId });
    const sourceTextBase = buildSourceCorpus({
      prompt: payload.prompt || project.prompt,
      sources,
    });
    if (!sourceTextBase.trim()) {
      return NextResponse.json({ error: 'No source material found for generation' }, { status: 400 });
    }
    const sourceText = buildGenerationDirectives({
      sourceText: sourceTextBase,
      slideSubjects: payload.slideSubjects,
      setupPreset: payload.setupPreset,
    });

    const lockedControls = (payload.lockedControls || []).filter(Boolean) as RelevantControlKey[];
    const plan = payload.plan && typeof payload.plan === 'object'
      ? payload.plan
      : request1ConfigAndPlan({
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

    const built = request2BuildPresentation({
      sourceText,
      title: payload.title || project.title,
      language: payload.language || project.language || 'en',
      plan,
      overrides: payload.uiConfig || {},
      lockedControls,
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
      generationSummary: `Generated ${built.previewManifest.slideCount} slides from ${sources.length} source(s) with 2-step pipeline.`,
    });

    await updatePresentationProject({
      supabase,
      userId: user.id,
      projectId,
      patch: {
        workflow_state: {
          ...(project.workflow_state || {}),
          stage: 'result',
          slideSubjects: payload.slideSubjects || project.workflow_state?.slideSubjects || [],
          setupPreset: payload.setupPreset || project.workflow_state?.setupPreset || {},
          updatedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      projectId,
      versionId: version.id,
      versionNumber: version.version_number,
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
    return NextResponse.json({ error: error?.message || 'Failed to build presentation' }, { status: 500 });
  }
}
