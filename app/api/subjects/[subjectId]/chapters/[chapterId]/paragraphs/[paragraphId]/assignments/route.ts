import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { makeRequestId, subjectsError, subjectsLog, subjectsWarn } from '@/lib/subjects-log'
import { normalizeAssignmentSettings } from '@/lib/assignments/settings'

export const dynamic = 'force-dynamic'

// GET assignments for a paragraph
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  const requestId = makeRequestId('paragraph_assignments');
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;
    subjectsLog('paragraph-assignments', requestId, 'request.start', {
      subjectId: resolvedParams.subjectId,
      chapterId: resolvedParams.chapterId,
      paragraphId: resolvedParams.paragraphId,
    });

    const { data: { user } } = await supabase.auth.getUser()
    subjectsLog('paragraph-assignments', requestId, 'auth.state', {
      authenticated: Boolean(user),
      userId: user?.id || null,
    });

    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('paragraph_id', resolvedParams.paragraphId)
      .order('assignment_index', { ascending: true })

    if (error) {
      subjectsError('paragraph-assignments', requestId, 'assignments.query.error', {
        message: error.message,
      });
      return NextResponse.json([])
    }

    const safeAssignments = assignments || [];
    subjectsLog('paragraph-assignments', requestId, 'assignments.query.ok', {
      assignmentCount: safeAssignments.length,
    });

    const getLetterIndex = (index: number): string => {
      if (index < 26) return String.fromCharCode(97 + index);
      const first = Math.floor(index / 26) - 1;
      const second = index % 26;
      return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
    };

    const assignmentIds = safeAssignments.map((assignment) => assignment.id).filter(Boolean);
    let blocksByAssignment = new Map<string, number>();
    let answersByAssignment = new Map<string, { total: number; correct: number }>();

    if (assignmentIds.length > 0) {
      const { data: blockRows } = await supabase
        .from('blocks')
        .select('assignment_id')
        .in('assignment_id', assignmentIds);

      blocksByAssignment = (blockRows || []).reduce((acc: Map<string, number>, row: any) => {
        const assignmentId = row.assignment_id as string;
        if (!assignmentId) return acc;
        acc.set(assignmentId, (acc.get(assignmentId) || 0) + 1);
        return acc;
      }, new Map<string, number>());

      if (user) {
        const { data: answerRows } = await supabase
          .from('student_answers')
          .select('assignment_id, is_correct')
          .eq('student_id', user.id)
          .in('assignment_id', assignmentIds);

        answersByAssignment = (answerRows || []).reduce(
          (acc: Map<string, { total: number; correct: number }>, row: any) => {
            const assignmentId = row.assignment_id as string;
            if (!assignmentId) return acc;
            const previous = acc.get(assignmentId) || { total: 0, correct: 0 };
            acc.set(assignmentId, {
              total: previous.total + 1,
              correct: previous.correct + (row.is_correct === true ? 1 : 0),
            });
            return acc;
          },
          new Map<string, { total: number; correct: number }>()
        );
      }
    }
    subjectsLog('paragraph-assignments', requestId, 'metrics.computed', {
      assignmentCount: safeAssignments.length,
      withBlocks: blocksByAssignment.size,
      withAnswers: answersByAssignment.size,
    });

    const transformedAssignments = safeAssignments.map((assignment) => {
      const totalBlocks = blocksByAssignment.get(assignment.id) || 0;
      const answerStats = answersByAssignment.get(assignment.id) || { total: 0, correct: 0 };
      const progress_percent = totalBlocks > 0 ? Math.ceil((answerStats.total / totalBlocks) * 100) : 0;
      const correct_percent = totalBlocks > 0 ? Math.ceil((answerStats.correct / totalBlocks) * 100) : 0;

      return {
        ...assignment,
        letter_index: getLetterIndex(assignment.assignment_index),
        block_count: totalBlocks,
        progress_percent,
        correct_percent,
      };
    });

    subjectsLog('paragraph-assignments', requestId, 'response.ready', {
      assignmentCount: transformedAssignments.length,
    });
    return NextResponse.json(transformedAssignments)
  } catch (err) {
    subjectsError('paragraph-assignments', requestId, 'request.error', {
      message: (err as any)?.message || 'Unknown error',
      stack: (err as any)?.stack || null,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new assignment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;

    const {
      title,
      answers_enabled = false,
      type = 'homework',
      scheduled_start_at = null,
      scheduled_end_at = null,
      settings = null,
    } = await request.json()
    const normalizedTitle = typeof title === 'string' ? title.trim() : ''
    if (!normalizedTitle) {
      return NextResponse.json({ error: 'Assignment title is required' }, { status: 400 })
    }
    const normalizedType =
      type === 'homework' || type === 'small_test' || type === 'big_test' || type === 'other'
        ? type
        : 'homework';

    const toIsoOrNull = (value: unknown): string | null => {
      if (!value) return null;
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) return null;
      return date.toISOString();
    };

    const normalizedSettings = normalizeAssignmentSettings(
      settings || {
        time: {
          startAt: toIsoOrNull(scheduled_start_at),
          endAt: toIsoOrNull(scheduled_end_at),
        },
      }
    );

    // Get max assignment index for this paragraph
    const { data: existingAssignments } = await supabase
      .from('assignments')
      .select('assignment_index')
      .eq('paragraph_id', resolvedParams.paragraphId)
      .order('assignment_index', { ascending: false })
      .limit(1)

    const nextIndex = existingAssignments && existingAssignments.length > 0 
      ? (existingAssignments[0].assignment_index ?? -1) + 1 
      : 0;

    const { data: paragraphContext } = await (supabase as any)
      .from('paragraphs')
      .select('id, chapters!inner(id, subject_id, subjects!inner(id, class_id))')
      .eq('id', resolvedParams.paragraphId)
      .maybeSingle();

    const classId = paragraphContext?.chapters?.subjects?.class_id || null;

    const { data: assignment, error: insertError } = await (supabase
      .from('assignments') as any)
      .insert({
        paragraph_id: resolvedParams.paragraphId,
        assignment_index: nextIndex,
        title: normalizedTitle,
        answers_enabled: answers_enabled ?? false,
        type: normalizedType,
        class_id: classId,
        settings: normalizedSettings,
        scheduled_start_at: normalizedSettings.time.startAt,
        scheduled_end_at: normalizedSettings.time.endAt,
        scheduled_answer_release_at: normalizedSettings.time.endAt,
        access_code: normalizedSettings.access.accessCode,
        timer_mode: normalizedSettings.time.timerMode,
        duration_minutes: normalizedSettings.time.durationMinutes,
        auto_submit_on_timeout: normalizedSettings.time.autoSubmitOnTimeout,
        max_attempts: normalizedSettings.attempts.maxAttempts,
        attempt_score_mode: normalizedSettings.attempts.scoreMode,
        cooldown_minutes: normalizedSettings.attempts.cooldownMinutes,
        show_correct_answers: normalizedSettings.grading.showCorrectAnswers,
        show_points: normalizedSettings.grading.showPoints,
        total_points: normalizedSettings.grading.totalPoints,
        assignment_weight: normalizedSettings.grading.weight,
        grade_display_mode: normalizedSettings.grading.gradeDisplayMode,
        rounding_decimals: normalizedSettings.grading.roundingDecimals,
        require_fullscreen: normalizedSettings.antiCheat.requireFullscreen,
        detect_tab_switch: normalizedSettings.antiCheat.detectTabSwitch,
        per_question_time_limit_seconds: normalizedSettings.antiCheat.perQuestionTimeLimitSeconds,
        restrict_ip_or_device: normalizedSettings.antiCheat.restrictIpOrDevice,
        shuffle_questions: normalizedSettings.access.shuffleQuestions,
        shuffle_answers: normalizedSettings.access.shuffleAnswers,
        shuffle_questions_per_student: normalizedSettings.access.shuffleQuestionsPerStudent,
        autosave_enabled: normalizedSettings.delivery.autosave,
        allow_resume: normalizedSettings.delivery.allowResume,
        instruction_text: normalizedSettings.delivery.instructionText,
        show_timer: normalizedSettings.time.showTimer,
        question_pool_size: normalizedSettings.advanced.questionPoolSize,
        adaptive_enabled: normalizedSettings.advanced.adaptiveEnabled,
        adaptive_rules: normalizedSettings.advanced.adaptiveRules,
        review_mode_enabled: normalizedSettings.advanced.reviewModeEnabled,
        reflection_enabled: normalizedSettings.advanced.reflectionEnabled,
        improvement_attempt_enabled: normalizedSettings.advanced.improvementAttemptEnabled,
        allowed_class_ids: normalizedSettings.access.allowedClassIds,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const getLetterIndex = (index: number): string => {
      if (index < 26) return String.fromCharCode(97 + index);
      const first = Math.floor(index / 26) - 1;
      const second = index % 26;
      return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
    };

    return NextResponse.json({
      ...assignment,
      letter_index: getLetterIndex(assignment.assignment_index),
      block_count: 0,
      progress_percent: 0,
      correct_percent: 0,
    })
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
