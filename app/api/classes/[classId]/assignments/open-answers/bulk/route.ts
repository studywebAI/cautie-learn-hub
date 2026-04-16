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

    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }
    if (items.length > 200) {
      return NextResponse.json({ error: 'max 200 items per bulk request' }, { status: 400 });
    }

    const answerIds = items
      .map((item: any) => String(item?.answer_id || '').trim())
      .filter(Boolean);
    if (answerIds.length === 0) {
      return NextResponse.json({ error: 'items.answer_id is required' }, { status: 400 });
    }

    const { data: answers, error: answersError } = await supabase
      .from('student_answers')
      .select('id, student_id, block_id, assignment_id, answer_data, assignment_attempt_id')
      .in('id', answerIds);
    if (answersError) return NextResponse.json({ error: answersError.message }, { status: 500 });

    const answersById = new Map((answers || []).map((a: any) => [a.id, a]));
    const assignmentIds = [...new Set((answers || []).map((a: any) => a.assignment_id).filter(Boolean))];
    const blockIds = [...new Set((answers || []).map((a: any) => a.block_id).filter(Boolean))];

    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id, class_id')
      .in('id', assignmentIds);
    if (assignmentsError) return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
    const assignmentById = new Map((assignments || []).map((a: any) => [a.id, a]));

    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('id, type, settings, data')
      .in('id', blockIds);
    if (blocksError) return NextResponse.json({ error: blocksError.message }, { status: 500 });
    const blockById = new Map((blocks || []).map((b: any) => [b.id, b]));

    const nowIso = new Date().toISOString();
    const updated: any[] = [];
    const failed: any[] = [];
    const touchedAttemptIds = new Set<string>();

    for (const raw of items) {
      const answerId = String(raw?.answer_id || '').trim();
      const scoreRaw = raw?.score;
      const feedback = typeof raw?.feedback === 'string' ? raw.feedback : null;
      const rubricScores = Array.isArray(raw?.rubric_scores) ? raw.rubric_scores : null;
      const forceIsCorrect = typeof raw?.is_correct === 'boolean' ? raw.is_correct : null;

      if (!answerId) {
        failed.push({ answer_id: answerId, error: 'missing answer_id' });
        continue;
      }
      if (typeof scoreRaw !== 'number' || !Number.isFinite(scoreRaw) || scoreRaw < 0) {
        failed.push({ answer_id: answerId, error: 'score must be a number >= 0' });
        continue;
      }

      const answer = answersById.get(answerId);
      if (!answer) {
        failed.push({ answer_id: answerId, error: 'answer not found' });
        continue;
      }
      const assignment = assignmentById.get(answer.assignment_id);
      if (!assignment || assignment.class_id !== classId) {
        failed.push({ answer_id: answerId, error: 'answer does not belong to this class' });
        continue;
      }
      const block = blockById.get(answer.block_id);
      if (!block || block.type !== 'open_question') {
        failed.push({ answer_id: answerId, error: 'not an open question answer' });
        continue;
      }

      const blockSettings = normalizeBlockSettings(block.settings || block.data?.settings || {});
      const maxPoints = Number(blockSettings.points || 1);
      if (scoreRaw > maxPoints) {
        failed.push({ answer_id: answerId, error: `score cannot exceed max points (${maxPoints})` });
        continue;
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

      const { data: row, error: updateError } = await supabase
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
        .select('id, score, feedback, graded_at')
        .single();

      if (updateError) {
        failed.push({ answer_id: answerId, error: updateError.message });
        continue;
      }

      updated.push(row);

      const { error: assignmentEventError } = await supabase
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
            bulk: true,
          },
        });
      if (assignmentEventError) {
        console.warn('[open-answers-bulk] failed to record assignment event', assignmentEventError);
      }

      if (answer.assignment_attempt_id) touchedAttemptIds.add(answer.assignment_attempt_id);
    }

    for (const attemptId of touchedAttemptIds) {
      const { data: attemptAnswers } = await supabase
        .from('student_answers')
        .select('score, assignment_id')
        .eq('assignment_attempt_id', attemptId);

      const assignmentId = attemptAnswers?.[0]?.assignment_id;
      const scoreSum = (attemptAnswers || []).reduce((sum: number, row: any) => sum + Number(row.score || 0), 0);

      let maxSum = 0;
      if (assignmentId) {
        const { data: assignmentBlocks } = await supabase
          .from('blocks')
          .select('settings, data')
          .eq('assignment_id', assignmentId);
        maxSum = (assignmentBlocks || []).reduce((sum: number, row: any) => {
          const s = normalizeBlockSettings(row.settings || row.data?.settings || {});
          return sum + Number(s.points || 0);
        }, 0);
      }

      const { error: attemptUpdateError } = await supabase
        .from('assignment_attempts')
        .update({
          score: scoreSum,
          max_score: maxSum,
          updated_at: nowIso,
        })
        .eq('id', attemptId);
      if (attemptUpdateError) {
        console.warn('[open-answers-bulk] failed to update assignment attempt score', attemptUpdateError);
      }
    }

    return NextResponse.json({
      success: true,
      updated_count: updated.length,
      failed_count: failed.length,
      updated,
      failed,
    });
  } catch (error) {
    console.error('[open-answers-bulk] grading failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
