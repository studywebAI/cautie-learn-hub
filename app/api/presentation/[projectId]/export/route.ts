import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';
import { getLatestProjectVersion, getPresentationProject } from '@/lib/presentation/store';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  destination: z
    .object({
      kind: z.enum(['download', 'microsoft', 'google']),
      targetApp: z.enum(['powerpoint', 'sharepoint', 'google-slides']).optional(),
    })
    .optional(),
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

    const internalResponse = await fetch(new URL('/api/tools/presentation/export', request.nextUrl.origin), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        title: project.title,
        slides: ((version.blueprint_json as any)?.slides || []).map((slide: any, idx: number) => ({
          index: Number(slide?.index || idx + 1),
          heading: String(slide?.heading || slide?.title || `Slide ${idx + 1}`),
          bullets: Array.isArray(slide?.bullets) ? slide.bullets.map((b: any) => String(b)) : [],
          speakerNotes: typeof slide?.speakerNotes === 'string' ? slide.speakerNotes : undefined,
        })),
        includeSpeakerNotes: Boolean((version.blueprint_json as any)?.settings?.includeSpeakerNotes),
        destination: payload.destination || { kind: 'download' },
      }),
    });

    if (!internalResponse.ok) {
      const err = await internalResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.error || `Export failed (${internalResponse.status})`, fallback: err?.fallback || 'download' },
        { status: internalResponse.status }
      );
    }

    if ((payload.destination?.kind || 'download') === 'download') {
      const blob = await internalResponse.arrayBuffer();
      return new NextResponse(blob, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': `attachment; filename="${project.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') || 'presentation'}.pptx"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const json = await internalResponse.json();
    return NextResponse.json({ ok: true, projectId, versionId: version.id, ...json });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to export project' }, { status: 500 });
  }
}
