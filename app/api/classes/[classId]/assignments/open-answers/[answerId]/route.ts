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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string; answerId: string }> }
) {
  try {
    const { classId, answerId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authError = await requireTeacherForClass(supabase, classId, user.id);
    if (authError) return authError;

    const body = await request.json();
    const scoreRaw = body?.score;
    const feedback = typeof body?.feedback === 'string' ? body.feedback : null;
    const rubricScores = Array.isArray(body?.rubric_scores) ? body.rubric_scores : null;
    const forceIsCorrect = typeof body?.is_correct === 'boolean' ? body.is_correct : null;

    if (typeof scoreRaw !== 'number' || !Number.isFinite(scoreRaw) || scoreRaw < 0) {
      return NextResponse.json({ error: 'score must be a number >= 0' }, { status: 400 });
    }

    const { data: answer, error: answerError } = await supabase
      .from('student_answers')
      .select('id, student_id, block_id, assignment_id, answer_data, assignment_attempt_id')
      .eq('id', answerId)
      .single();
    if (answerError || !answer) return NextResponse.json({ error: 'Answer not found' }, { status: 404 });

    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('id, class_id, settings')
      .eq('id', answer.assignment_id)
      .single();
    if (assignmentError || !assignment || assignment.class_id !== classId) {
      return NextResponse.json({ error: 'Answer does not belong to this class' }, { status: 403 });
    }

    const { data: block, error: blockError } = await supabase
      .from('blocks')
      .select('id, type, data, settings')
      .eq('id', answer.block_id)
      .single();
    if (blockError || !block) return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    if (block.type !== 'open_question') {
      return NextResponse.json({ error: 'Only open question answers can be graded here' }, { status: 400 });
    }

    const blockSettings = normalizeBlockSettings((block as any).settings || (block as any).data?.settings || {});
    const maxPoints = Number(blockSettings.points || 1);
    if (scoreRaw > maxPoints) {
      return NextResponse.json({ error: `score cannot exceed max points (${maxPoints})` }, { status: 400 });
    }

    const mergedAnswerData = (() => {
      const base = (answer.answer_data && typeof answer.answer_data === 'object' && !Array.isArray(answer.answer_data))
        ? answer.answer_data
        : { value: answer.answer_data };
      if (!rubricScores) return base;
      return {
        ...base,
        rubric_scores: rubricScores,
      };
    })();

    const isCorrect = forceIsCorrect !== null ? forceIsCorrect : scoreRaw >= maxPoints * 0.7;
    const nowIso = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('student_answers')
      .update({
        score: scoreRaw,
        feedback,
        is_correct: isCorrect,
        graded_at: nowIso,
        graded_by_ai: false,
        answer_data: mergedAnswerData,
      })
      .eq('id', answerId)
      .select('*')
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await supabase
      .from('assignment_events')
      .insert({
        assignment_id: answer.assignment_id,
        attempt_id: answer.assignment_attempt_id || null,
        student_id: answer.student_id,
        event_type: 'manual_grade',
        event_payload: {
          answer_id: answerId,
          graded_by: user.id,
          score: scoreRaw,
          max_points: maxPoints,
        },
      })
      .then(() => undefined)
      .catch(() => undefined);

    if (answer.assignment_attempt_id) {
      const { data: attemptAnswers } = await supabase
        .from('student_answers')
        .select('score')
        .eq('assignment_attempt_id', answer.assignment_attempt_id);
      const scoreSum = (attemptAnswers || []).reduce((sum: number, row: any) => sum + Number(row.score || 0), 0);

      const { data: assignmentBlocks } = await supabase
        .from('blocks')
        .select('settings, data')
        .eq('assignment_id', answer.assignment_id);
      const maxSum = (assignmentBlocks || []).reduce((sum: number, row: any) => {
        const s = normalizeBlockSettings(row.settings || row.data?.settings || {});
        return sum + Number(s.points || 0);
      }, 0);

      await supabase
        .from('assignment_attempts')
        .update({
          score: scoreSum,
          max_score: maxSum,
          updated_at: nowIso,
        })
        .eq('id', answer.assignment_attempt_id)
        .then(() => undefined)
        .catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      answer: updated,
    });
  } catch (error) {
    console.error('[open-answers] grade failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

