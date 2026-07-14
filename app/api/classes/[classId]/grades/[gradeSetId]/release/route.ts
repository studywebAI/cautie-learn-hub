import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getClassPermission } from '@/lib/auth/class-permissions';

export const dynamic = 'force-dynamic';

// POST /api/classes/[classId]/grades/[gradeSetId]/release
// Body: { type: 'answers' | 'grade' }
// Two separate, independent release actions — see
// docs/grades-feature-brainstorm.md section H point 4/9. Releasing the
// grade also flips status to 'published' so it shows up via the existing
// /api/student/grades route (which already filters on status='published').
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string; gradeSetId: string }> }
) {
  try {
    const { classId, gradeSetId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const type = body?.type === 'answers' ? 'answers' : body?.type === 'grade' ? 'grade' : null;
    if (!type) return NextResponse.json({ error: 'type must be "answers" or "grade"' }, { status: 400 });

    const nowIso = new Date().toISOString();
    const update: Record<string, any> = { updated_at: nowIso };
    if (type === 'answers') {
      update.answers_released_at = nowIso;
    } else {
      update.grade_released_at = nowIso;
      update.status = 'published';
      update.release_date = nowIso;
    }

    const { data: updated, error } = await supabase
      .from('grade_sets')
      .update(update)
      .eq('id', gradeSetId)
      .eq('class_id', classId)
      .select('id, answers_released_at, grade_released_at, status')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ grade_set: updated });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
