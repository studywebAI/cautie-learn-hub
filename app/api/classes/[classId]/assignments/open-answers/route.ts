import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { normalizeBlockSettings } from '@/lib/assignments/settings';

export const dynamic = 'force-dynamic';

async function requireTeacherForClass(supabase: any, classId: string, userId: string) {
  const { data: membership } = await supabase
    .from('class_members')
    .select('role')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .maybeSingle();

  const role = String(membership?.role || '').toLowerCase();
  const isTeacherRole = role === 'teacher' || role === 'owner' || role === 'admin' || role === 'creator';
  if (!isTeacherRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
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

    const authError = await requireTeacherForClass(supabase, classId, user.id);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'pending').toLowerCase();

    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title')
      .eq('class_id', classId);

    const assignmentIds = (assignments || []).map((a: any) => a.id);
    if (assignmentIds.length === 0) return NextResponse.json([]);
    const assignmentById = new Map((assignments || []).map((a: any) => [a.id, a]));

    const { data: blocks } = await supabase
      .from('blocks')
      .select('id, assignment_id, data, settings, type')
      .in('assignment_id', assignmentIds)
      .eq('type', 'open_question');

    const openBlocks = blocks || [];
    const openBlockIds = openBlocks.map((b: any) => b.id);
    if (openBlockIds.length === 0) return NextResponse.json([]);
    const blockById = new Map(openBlocks.map((b: any) => [b.id, b]));

    let answersQuery = supabase
      .from('student_answers')
      .select('id, student_id, block_id, answer_data, score, feedback, submitted_at, graded_by_ai, graded_at, assignment_attempt_id')
      .in('block_id', openBlockIds)
      .order('submitted_at', { ascending: false });

    if (status === 'pending') {
      answersQuery = answersQuery.is('score', null);
    }

    const { data: answers, error: answersError } = await answersQuery;
    if (answersError) return NextResponse.json({ error: answersError.message }, { status: 500 });

    const studentIds = [...new Set((answers || []).map((a: any) => a.student_id))];
    const { data: profiles } = studentIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, email').in('id', studentIds)
      : { data: [] as any[] };
    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

    return NextResponse.json(
      (answers || []).map((answer: any) => {
        const block = blockById.get(answer.block_id);
        const assignment = assignmentById.get(block?.assignment_id);
        const profile = profileById.get(answer.student_id);
        const blockSettings = normalizeBlockSettings(block?.settings || block?.data?.settings || {});
        return {
          id: answer.id,
          assignment_id: block?.assignment_id || null,
          assignment_title: assignment?.title || 'Assignment',
          block_id: answer.block_id,
          question: block?.data?.question || '',
          max_points: blockSettings.points,
          rubric: blockSettings.openQuestion.rubric || [],
          student_id: answer.student_id,
          student_name: profile?.full_name || profile?.email || 'Unknown student',
          student_email: profile?.email || null,
          answer_data: answer.answer_data,
          score: answer.score,
          feedback: answer.feedback,
          graded_at: answer.graded_at,
          graded_by_ai: !!answer.graded_by_ai,
          submitted_at: answer.submitted_at,
          assignment_attempt_id: answer.assignment_attempt_id || null,
        };
      })
    );
  } catch (error) {
    console.error('[open-answers] list failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

