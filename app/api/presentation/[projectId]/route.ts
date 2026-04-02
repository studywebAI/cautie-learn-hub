import { NextResponse } from 'next/server';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';
import { getLatestProjectVersion, getPresentationProject, listPresentationSources } from '@/lib/presentation/store';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { supabase, user } = await getAuthedToolboxContext();

    const project = await getPresentationProject({ supabase, userId: user.id, projectId });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const sources = await listPresentationSources({ supabase, userId: user.id, projectId });
    const latestVersion = await getLatestProjectVersion({ supabase, userId: user.id, projectId });

    return NextResponse.json({
      ok: true,
      project,
      sources,
      latestVersion,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to load project' }, { status: 500 });
  }
}
