import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createStudysetShareToken } from '@/lib/studysets/share-token';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ studysetId: string }> }
) {
  try {
    const { studysetId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: studyset, error } = await (supabase as any)
      .from('studysets')
      .select('id, user_id, name')
      .eq('id', studysetId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!studyset) return NextResponse.json({ error: 'Studyset not found' }, { status: 404 });

    const { data: days } = await (supabase as any)
      .from('studyset_plan_days')
      .select('id')
      .eq('studyset_id', studyset.id);
    const dayIds = (Array.isArray(days) ? days : []).map((row: any) => String(row.id)).filter(Boolean);
    let taskCount = 0;
    if (dayIds.length > 0) {
      const { data: tasks } = await (supabase as any)
        .from('studyset_plan_tasks')
        .select('id')
        .in('studyset_day_id', dayIds);
      taskCount = (Array.isArray(tasks) ? tasks : []).length;
    }

    const token = createStudysetShareToken({
      studysetId: studyset.id,
      ownerUserId: user.id,
      ttlSeconds: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      token,
      preview: {
        name: studyset.name,
        day_count: dayIds.length,
        task_count: taskCount,
      },
    });
  } catch (error) {
    console.error('studyset share POST failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
