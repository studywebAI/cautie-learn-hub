import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';
import { createPresentationShareSnapshot, getLatestProjectVersion, getPresentationProject } from '@/lib/presentation/store';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  expiresInHours: z.number().min(1).max(720).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const payload = RequestSchema.parse(await request.json().catch(() => ({})));
    const { supabase, user } = await getAuthedToolboxContext();

    const project = await getPresentationProject({ supabase, userId: user.id, projectId });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const version = await getLatestProjectVersion({ supabase, userId: user.id, projectId });
    if (!version) {
      return NextResponse.json({ error: 'No generated version found for this project' }, { status: 404 });
    }

    const snapshot = await createPresentationShareSnapshot({
      supabase,
      userId: user.id,
      projectId,
      versionId: version.id,
      title: project.title,
      previewManifest: version.preview_manifest_json as any,
      expiresInHours: payload.expiresInHours,
    });

    const baseUrl = request.nextUrl.origin;
    return NextResponse.json({
      ok: true,
      token: snapshot.public_token,
      shareUrl: `${baseUrl}/p/${snapshot.public_token}`,
      expiresAt: snapshot.expires_at || null,
      projectId,
      versionId: version.id,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to publish preview' }, { status: 500 });
  }
}
