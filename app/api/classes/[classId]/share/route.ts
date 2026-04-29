import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getClassPermission } from '@/lib/auth/class-permissions';

export const dynamic = 'force-dynamic';

type ShareAudience = 'teacher' | 'all';

function parseShareContent(content: unknown): { text: string; attachmentLabel?: string; sourceType?: string; sourceId?: string; sourceHref?: string } {
  if (!content) return { text: '' };
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return {
          text: String((parsed as any).text || ''),
          attachmentLabel: (parsed as any).attachmentLabel ? String((parsed as any).attachmentLabel) : undefined,
          sourceType: (parsed as any).sourceType ? String((parsed as any).sourceType) : undefined,
          sourceId: (parsed as any).sourceId ? String((parsed as any).sourceId) : undefined,
          sourceHref: (parsed as any).sourceHref ? String((parsed as any).sourceHref) : undefined,
        };
      }
    } catch {}
    return { text: String(content) };
  }
  if (typeof content === 'object') {
    return {
      text: String((content as any).text || ''),
      attachmentLabel: (content as any).attachmentLabel ? String((content as any).attachmentLabel) : undefined,
      sourceType: (content as any).sourceType ? String((content as any).sourceType) : undefined,
      sourceId: (content as any).sourceId ? String((content as any).sourceId) : undefined,
      sourceHref: (content as any).sourceHref ? String((content as any).sourceHref) : undefined,
    };
  }
  return { text: '' };
}

function resolveProfileName(profile: any, fallbackEmail: string | null, fallbackId: string): string {
  const display = String(profile?.display_name || '').trim();
  if (display) return display;
  const fullName = String(profile?.full_name || '').trim();
  if (fullName) return fullName;
  if (fallbackEmail) return fallbackEmail.split('@')[0];
  return fallbackId.slice(0, 8);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const requestedAudience = (searchParams.get('audience') || 'teacher').toLowerCase() as ShareAudience;
    const audience: ShareAudience = requestedAudience === 'all' ? 'all' : 'teacher';

    let query = (supabase as any)
      .from('class_share_posts')
      .select('id, audience, body_text, attachment_label, source_type, source_ref_id, source_href, created_at, created_by')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (audience === 'all') query = query.eq('audience', 'all');
    if (audience === 'teacher' && !perm.isTeacher) query = query.eq('audience', 'all');
    if (audience === 'teacher' && perm.isTeacher) query = query.eq('audience', 'teacher');

    const { data, error } = await query;
    if (error) {
      // Backward-compatible fallback for environments where the migration has not run yet.
      const fallbackQuery = (supabase as any)
        .from('materials')
        .select('id, title, content, metadata, created_at, user_id, is_public')
        .eq('class_id', classId)
        .eq('type', 'share_post')
        .order('created_at', { ascending: false })
        .limit(200);

      const { data: fallbackData, error: fallbackError } = await (audience === 'all'
        ? fallbackQuery.eq('is_public', true)
        : (perm.isTeacher ? fallbackQuery.eq('is_public', false) : fallbackQuery.eq('is_public', true)));
      if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 });

      const fallbackRows = (fallbackData || []).map((row: any) => {
        const parsed = parseShareContent(row.content);
        const rowAudience: ShareAudience = row.is_public ? 'all' : 'teacher';
        return {
          id: row.id,
          createdAt: row.created_at,
          audience: rowAudience,
          text: parsed.text,
          attachmentLabel: parsed.attachmentLabel || row.title || undefined,
          sourceType: parsed.sourceType,
          sourceId: parsed.sourceId,
          sourceHref: parsed.sourceHref,
        };
      });
      return NextResponse.json({ rows: fallbackRows });
    }

    const authorIds = Array.from(new Set((data || []).map((row: any) => String(row.created_by || '')).filter(Boolean)));
    let profileMap = new Map<string, { name: string; email: string | null }>();
    if (authorIds.length > 0) {
      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, display_name, email')
        .in('id', authorIds);
      for (const profile of profiles || []) {
        const email = profile?.email ? String(profile.email) : null;
        profileMap.set(String(profile.id), {
          name: resolveProfileName(profile, email, String(profile.id)),
          email,
        });
      }
    }

    const rows = (data || []).map((row: any) => {
      const author = profileMap.get(String(row.created_by || ''));
      return {
        id: row.id,
        createdAt: row.created_at,
        audience: row.audience === 'all' ? 'all' : 'teacher',
        text: String(row.body_text || ''),
        authorName: author?.name || 'User',
        authorEmail: author?.email || null,
        attachmentLabel: row.attachment_label || undefined,
        sourceType: row.source_type || undefined,
        sourceId: row.source_ref_id || undefined,
        sourceHref: row.source_href || undefined,
      };
    });

    return NextResponse.json({ rows });
  } catch (error) {
    console.error('[class-share] GET failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const text = String(body?.text || '').trim();
    const attachmentLabel = String(body?.attachmentLabel || '').trim();
    const requestedAudience = String(body?.audience || 'all').toLowerCase() === 'teacher' ? 'teacher' : 'all';
    const audience: ShareAudience = requestedAudience === 'teacher' && perm.isTeacher ? 'teacher' : 'all';
    const source = body?.source && typeof body.source === 'object' ? body.source : null;

    if (!text && !attachmentLabel) {
      return NextResponse.json({ error: 'Message or attachment is required' }, { status: 400 });
    }

    const payload = {
      text,
      attachmentLabel: attachmentLabel || undefined,
      sourceType: source?.link_type ? String(source.link_type) : undefined,
      sourceId: source?.link_ref_id ? String(source.link_ref_id) : undefined,
      sourceHref: source?.metadata_json?.href ? String(source.metadata_json.href) : undefined,
    };

    const { data, error } = await (supabase as any)
      .from('class_share_posts')
      .insert({
        class_id: classId,
        created_by: user.id,
        audience,
        body_text: text,
        attachment_label: payload.attachmentLabel ?? null,
        source_type: payload.sourceType ?? null,
        source_ref_id: payload.sourceId ?? null,
        source_href: payload.sourceHref ?? null,
      })
      .select('id, audience, created_at')
      .single();

    if (error) {
      // Backward-compatible fallback for environments where the migration has not run yet.
      const { data: fallbackData, error: fallbackError } = await (supabase as any)
        .from('materials')
        .insert({
          class_id: classId,
          user_id: user.id,
          type: 'share_post',
          title: attachmentLabel || 'Shared update',
          content: payload,
          metadata: { source: 'class_share', audience },
          is_public: audience === 'all',
        })
        .select('id, created_at, is_public')
        .single();
      if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      return NextResponse.json({
        id: fallbackData.id,
        createdAt: fallbackData.created_at,
        audience: fallbackData.is_public ? 'all' : 'teacher',
        text,
        attachmentLabel: payload.attachmentLabel,
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        sourceHref: payload.sourceHref,
      });
    }

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, display_name, email')
      .eq('id', user.id)
      .maybeSingle();
    const authorEmail = profile?.email ? String(profile.email) : user.email || null;
    return NextResponse.json({
      id: data.id,
      createdAt: data.created_at,
      audience: data.audience === 'all' ? 'all' : 'teacher',
      text,
      authorName: resolveProfileName(profile || {}, authorEmail, user.id),
      authorEmail,
      attachmentLabel: payload.attachmentLabel,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      sourceHref: payload.sourceHref,
    });
  } catch (error) {
    console.error('[class-share] POST failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
