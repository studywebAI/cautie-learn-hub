import { NextResponse } from 'next/server';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';
import { getLatestProjectVersion } from '@/lib/presentation/store';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { supabase, user } = await getAuthedToolboxContext();
    const version = await getLatestProjectVersion({ supabase, userId: user.id, projectId });
    if (!version) {
      return NextResponse.json({ error: 'No generated version found for this project' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      projectId,
      versionId: version.id,
      versionNumber: version.version_number,
      slideCount: version.slide_count,
      previewManifest: version.preview_manifest_json,
      quality: version.quality_json || {},
      analysis: version.analysis_json || {},
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to load preview' }, { status: 500 });
  }
}
