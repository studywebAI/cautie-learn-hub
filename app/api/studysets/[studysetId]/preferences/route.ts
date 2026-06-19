import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFERENCES = {
  random_order: false,
  daily_reminders: true,
  daily_task_limit: null as number | null,
  theme: 'auto' as 'auto' | 'light' | 'dark',
  pinned: false,
  folder: null as string | null,
  tags: [] as string[],
};

async function assertOwnership(supabase: any, studysetId: string, userId: string) {
  const { data: studyset, error } = await supabase
    .from('studysets')
    .select('id')
    .eq('id', studysetId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(studyset);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ studysetId: string }> }
) {
  try {
    const { studysetId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const owns = await assertOwnership(supabase as any, studysetId, user.id).catch(() => false);
    if (!owns) return NextResponse.json({ error: 'Studyset not found' }, { status: 404 });

    const { data, error } = await (supabase as any)
      .from('studyset_user_preferences')
      .select('random_order, daily_reminders, daily_task_limit, theme, pinned, folder, tags')
      .eq('studyset_id', studysetId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ preferences: DEFAULT_PREFERENCES });
    }

    return NextResponse.json({ preferences: data || DEFAULT_PREFERENCES });
  } catch {
    return NextResponse.json({ preferences: DEFAULT_PREFERENCES });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studysetId: string }> }
) {
  try {
    const { studysetId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const owns = await assertOwnership(supabase as any, studysetId, user.id).catch(() => false);
    if (!owns) return NextResponse.json({ error: 'Studyset not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const update: Record<string, any> = {
      user_id: user.id,
      studyset_id: studysetId,
      updated_at: new Date().toISOString(),
    };

    if (typeof body?.random_order === 'boolean') update.random_order = body.random_order;
    if (typeof body?.daily_reminders === 'boolean') update.daily_reminders = body.daily_reminders;
    if (typeof body?.pinned === 'boolean') update.pinned = body.pinned;
    if (body?.daily_task_limit === null) update.daily_task_limit = null;
    else if (typeof body?.daily_task_limit === 'number' && Number.isFinite(body.daily_task_limit)) {
      update.daily_task_limit = Math.max(1, Math.min(50, Math.round(body.daily_task_limit)));
    }
    if (typeof body?.theme === 'string' && ['auto', 'light', 'dark'].includes(body.theme)) update.theme = body.theme;
    if (body?.folder === null) update.folder = null;
    else if (typeof body?.folder === 'string') update.folder = body.folder.trim().slice(0, 80) || null;
    if (Array.isArray(body?.tags)) update.tags = body.tags.map((tag: unknown) => String(tag || '').trim().slice(0, 40)).filter(Boolean).slice(0, 20);

    const { data: saved, error } = await (supabase as any)
      .from('studyset_user_preferences')
      .upsert(update, { onConflict: 'studyset_id,user_id' })
      .select('random_order, daily_reminders, daily_task_limit, theme, pinned, folder, tags')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, preferences: saved || DEFAULT_PREFERENCES });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
