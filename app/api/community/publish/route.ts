import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';

const PublishSchema = z.object({
  artifactId: z.string().uuid(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(1200).optional().default(''),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  subject: z.string().trim().max(120).optional().default(''),
  difficulty: z.string().trim().max(50).optional().default(''),
  language: z.string().trim().max(20).optional().default(''),
});

const normalizeTags = (tags: string[]) =>
  Array.from(new Set(tags.map((tag) => tag.toLowerCase().trim()).filter(Boolean))).slice(0, 12);

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedToolboxContext();
    const payload = PublishSchema.parse(await request.json());

    const { data: artifact, error: artifactError } = await supabase
      .from('artifacts')
      .select('id, user_id, tool_id, title, metadata, latest_version')
      .eq('id', payload.artifactId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (artifactError) {
      return NextResponse.json({ error: artifactError.message }, { status: 500 });
    }
    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const tags = normalizeTags(payload.tags);
    const cleanSubject = payload.subject.trim();
    const cleanDifficulty = payload.difficulty.trim();
    const cleanLanguage = payload.language.trim();

    const upsertRow = {
      user_id: user.id,
      artifact_id: artifact.id,
      tool_id: String((artifact as any).tool_id || 'unknown'),
      title: payload.title.trim(),
      description: payload.description.trim(),
      tags,
      subject: cleanSubject || null,
      difficulty: cleanDifficulty || null,
      language: cleanLanguage || null,
      visibility: 'public',
      status: 'published',
      published_at: nowIso,
      updated_at: nowIso,
      metadata: {
        ...(artifact as any).metadata,
        source: 'tool_publish_button',
      },
    };

    const { data: upserted, error: upsertError } = await supabase
      .from('community_posts')
      .upsert(upsertRow, { onConflict: 'user_id,artifact_id' })
      .select('*')
      .single();

    if (upsertError || !upserted) {
      return NextResponse.json({ error: upsertError?.message || 'Failed to publish' }, { status: 500 });
    }

    return NextResponse.json({
      post: upserted,
      message: 'Published to community',
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to publish to community' }, { status: 500 });
  }
}
