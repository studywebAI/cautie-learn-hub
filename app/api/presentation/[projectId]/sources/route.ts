import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';
import { addPresentationSources, getPresentationProject } from '@/lib/presentation/store';

export const dynamic = 'force-dynamic';

const SourceSchema = z.object({
  sourceType: z.enum([
    'text',
    'file',
    'image',
    'cloud_file',
    'link',
    'internal_note',
    'internal_flashcards',
    'internal_quiz',
  ]),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  externalProvider: z.enum(['onedrive', 'sharepoint', 'google_drive', 'dropbox']).optional(),
  externalFileId: z.string().optional(),
  content: z.string().optional(),
  extractedText: z.string().optional(),
  parsedMetadata: z.record(z.any()).optional(),
  thumbnailUrl: z.string().optional(),
});

const RequestSchema = z.object({
  replaceExistingTextSources: z.boolean().optional(),
  replaceExistingNonTextSources: z.boolean().optional(),
  sources: z.array(SourceSchema).min(1),
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

    const sources = await addPresentationSources({
      supabase,
      userId: user.id,
      projectId,
      replaceTextSources: payload.replaceExistingTextSources,
      replaceNonTextSources: payload.replaceExistingNonTextSources,
      sources: payload.sources,
    });

    return NextResponse.json({ ok: true, projectId, added: sources.length, sources });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to add sources' }, { status: 500 });
  }
}
