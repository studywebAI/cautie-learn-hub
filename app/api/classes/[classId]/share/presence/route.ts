import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions';

export const dynamic = 'force-dynamic';

const TYPING_WINDOW_MS = 8000;

export async function GET(_: Request, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const { classId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const since = new Date(Date.now() - TYPING_WINDOW_MS).toISOString();
    const { data: typingRows } = await (supabase as any)
      .from('audit_logs')
      .select('user_id, created_at, metadata')
      .eq('class_id', classId)
      .eq('entity_type', 'class_share_presence')
      .eq('action', 'typing')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: readRows } = await (supabase as any)
      .from('audit_logs')
      .select('user_id, created_at, metadata')
      .eq('class_id', classId)
      .eq('entity_type', 'class_share_presence')
      .eq('action', 'read')
      .order('created_at', { ascending: false })
      .limit(200);

    const typingSet = new Set<string>();
    for (const row of typingRows || []) {
      const uid = String(row?.user_id || '');
      if (!uid || uid === user.id) continue;
      typingSet.add(uid);
    }

    const readByUser: Record<string, string> = {};
    for (const row of readRows || []) {
      const uid = String(row?.user_id || '');
      if (!uid || readByUser[uid]) continue;
      const lastSeenMessageId = String((row?.metadata as any)?.lastSeenMessageId || '');
      if (lastSeenMessageId) readByUser[uid] = lastSeenMessageId;
    }

    return NextResponse.json({
      typingUserIds: Array.from(typingSet),
      readByUser,
      viewerUserId: user.id,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const { classId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const event = String(body?.event || '').trim();
    const lastSeenMessageId = String(body?.lastSeenMessageId || '').trim();
    if (event !== 'typing' && event !== 'read') {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: event,
      entityType: 'class_share_presence',
      entityId: classId,
      metadata: {
        lastSeenMessageId: event === 'read' ? lastSeenMessageId || null : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

