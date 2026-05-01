import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions';

const defaultSettings = {
  allChatEnabled: true,
  teacherChatEnabled: true,
  mutedUsers: [] as Array<{ userId: string; until: string }>,
};

export async function GET(_: Request, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const { classId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data } = await (supabase as any)
      .from('audit_logs')
      .select('changes, created_at')
      .eq('class_id', classId)
      .eq('entity_type', 'class_share_settings')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ settings: { ...defaultSettings, ...((data?.changes as any) || {}) } });
  } catch (error) {
    console.error('[class-share-settings] GET failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const { classId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isTeacher) return NextResponse.json({ error: 'Only teachers can update share settings' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const next = {
      allChatEnabled: body?.allChatEnabled !== false,
      teacherChatEnabled: body?.teacherChatEnabled !== false,
      mutedUsers: Array.isArray(body?.mutedUsers)
        ? body.mutedUsers
            .map((entry: any) => ({
              userId: String(entry?.userId || ''),
              until: String(entry?.until || ''),
            }))
            .filter((entry: any) => entry.userId && entry.until)
        : [],
    };

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: 'update_share_settings',
      entityType: 'class_share_settings',
      entityId: classId,
      changes: next,
    });
    return NextResponse.json({ settings: next });
  } catch (error) {
    console.error('[class-share-settings] PATCH failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
