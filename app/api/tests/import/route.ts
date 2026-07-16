import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { normalizeAssignmentSettings, normalizeBlockSettings } from '@/lib/assignments/settings'
import { getClassPermission } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

const MISSING_COLUMN_PATTERN = /column .* does not exist/i;

function isMissingColumnError(error: any): boolean {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return MISSING_COLUMN_PATTERN.test(text);
}

function sanitizeCode(input: unknown): string {
  return typeof input === 'string' ? input.trim().toUpperCase() : '';
}

function getLetterIndex(index: number): string {
  if (index < 26) return String.fromCharCode(97 + index);
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
}

// Looks up an assignment by its G3 share code (settings.sharing.code).
// Originally test-only, extended to any assignment type in section H.
// Tries the JSONB path filter first (cleaner, index-friendly if a functional
// index ever gets added); falls back to a client-side scan over candidate
// rows if the DB-level path filter misbehaves for any reason.
async function findAssignmentByShareCode(supabase: any, code: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .filter('settings->sharing->>code', 'eq', code)
    .maybeSingle();

  if (!error && data) return data;

  const { data: candidates } = await supabase
    .from('assignments')
    .select('*')
    .not('settings', 'is', null);

  const match = (candidates || []).find((row: any) => {
    const settings = normalizeAssignmentSettings(row.settings || {});
    return settings.sharing.code === code;
  });
  return match || null;
}

// POST — import a shared test as a fully independent copy (G3, docs/subjects-feature-brainstorm.md).
// Body: { code: string, targetParagraphId: string }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = sanitizeCode(body?.code);
    const targetParagraphId = typeof body?.targetParagraphId === 'string' ? body.targetParagraphId : '';

    if (!code) {
      return NextResponse.json({ error: 'Share code is required' }, { status: 400 });
    }
    if (!targetParagraphId) {
      return NextResponse.json({ error: 'targetParagraphId is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.subscription_type !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sourceAssignment = await findAssignmentByShareCode(supabase, code);
    if (!sourceAssignment) {
      return NextResponse.json({ error: 'No test found for this code' }, { status: 404 });
    }

    // Resolve target location + verify the requester is a teacher on that class.
    const { data: paragraphContext } = await (supabase as any)
      .from('paragraphs')
      .select('id, chapters!inner(id, subject_id, subjects!inner(id, class_id))')
      .eq('id', targetParagraphId)
      .maybeSingle();

    if (!paragraphContext) {
      return NextResponse.json({ error: 'Target paragraph not found' }, { status: 404 });
    }

    const targetChapterId = paragraphContext.chapters?.id || null;
    const targetSubjectId = paragraphContext.chapters?.subjects?.id || null;
    const targetClassId = paragraphContext.chapters?.subjects?.class_id || null;

    const perm = await getClassPermission(supabase as any, targetClassId, user.id);
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Strip everything that doesn't make sense to carry over to a brand-new,
    // unpublished, unscheduled copy: the share code itself (the copy isn't
    // pre-shared) and all schedule-specific fields.
    const copiedSettings = normalizeAssignmentSettings({
      ...(sourceAssignment.settings || {}),
      sharing: { code: null },
      time: {
        ...(sourceAssignment.settings?.time || {}),
        startAt: null,
        endAt: null,
      },
    });

    const { data: existingAssignments } = await supabase
      .from('assignments')
      .select('assignment_index')
      .eq('paragraph_id', targetParagraphId)
      .order('assignment_index', { ascending: false })
      .limit(1);

    const nextIndex = existingAssignments && existingAssignments.length > 0
      ? (existingAssignments[0].assignment_index ?? -1) + 1
      : 0;

    const { data: newAssignment, error: insertError } = await (supabase.from('assignments') as any)
      .insert({
        paragraph_id: targetParagraphId,
        assignment_index: nextIndex,
        title: sourceAssignment.title,
        answers_enabled: sourceAssignment.answers_enabled ?? false,
        type: sourceAssignment.type,
        // Same rule as any newly created test (G1): hidden until the importing
        // teacher explicitly publishes/schedules their own copy.
        is_visible: false,
        class_id: targetClassId,
        settings: copiedSettings as any,
        scheduled_start_at: null,
        scheduled_end_at: null,
        scheduled_answer_release_at: null,
        access_code: copiedSettings.access.accessCode,
        timer_mode: copiedSettings.time.timerMode,
        duration_minutes: copiedSettings.time.durationMinutes,
        auto_submit_on_timeout: copiedSettings.time.autoSubmitOnTimeout,
        max_attempts: copiedSettings.attempts.maxAttempts,
        attempt_score_mode: copiedSettings.attempts.scoreMode,
        cooldown_minutes: copiedSettings.attempts.cooldownMinutes,
        show_correct_answers: copiedSettings.grading.showCorrectAnswers,
        show_points: copiedSettings.grading.showPoints,
        total_points: copiedSettings.grading.totalPoints,
        assignment_weight: copiedSettings.grading.weight,
        grade_display_mode: copiedSettings.grading.gradeDisplayMode,
        rounding_decimals: copiedSettings.grading.roundingDecimals,
        require_fullscreen: copiedSettings.antiCheat.requireFullscreen,
        detect_tab_switch: copiedSettings.antiCheat.detectTabSwitch,
        per_question_time_limit_seconds: copiedSettings.antiCheat.perQuestionTimeLimitSeconds,
        restrict_ip_or_device: copiedSettings.antiCheat.restrictIpOrDevice,
        shuffle_questions: copiedSettings.access.shuffleQuestions,
        shuffle_answers: copiedSettings.access.shuffleAnswers,
        shuffle_questions_per_student: copiedSettings.access.shuffleQuestionsPerStudent,
        autosave_enabled: copiedSettings.delivery.autosave,
        allow_resume: copiedSettings.delivery.allowResume,
        instruction_text: copiedSettings.delivery.instructionText,
        show_timer: copiedSettings.time.showTimer,
        question_pool_size: copiedSettings.advanced.questionPoolSize,
        adaptive_enabled: copiedSettings.advanced.adaptiveEnabled,
        adaptive_rules: copiedSettings.advanced.adaptiveRules,
        review_mode_enabled: copiedSettings.advanced.reviewModeEnabled,
        reflection_enabled: copiedSettings.advanced.reflectionEnabled,
        improvement_attempt_enabled: copiedSettings.advanced.improvementAttemptEnabled,
        allowed_class_ids: copiedSettings.access.allowedClassIds,
      })
      .select()
      .single();

    if (insertError || !newAssignment) {
      return NextResponse.json({ error: insertError?.message || 'Failed to import test' }, { status: 500 });
    }

    // Copy blocks into the new assignment. Best-effort per row so one bad
    // block doesn't abort the whole import (mirrors the defensive
    // missing-column fallback used by the regular block-create endpoint).
    const { data: sourceBlocks } = await supabase
      .from('blocks')
      .select('*')
      .eq('assignment_id', sourceAssignment.id)
      .order('position', { ascending: true });

    const insertWith = async (client: any, payload: Record<string, any>) =>
      client.from('blocks').insert(payload).select().single();

    for (const block of sourceBlocks || []) {
      const extendedInsert = {
        assignment_id: newAssignment.id,
        type: block.type,
        position: block.position,
        data: block.data,
        settings: normalizeBlockSettings(block.settings || block.data?.settings || {}),
        locked: block.locked || false,
        show_feedback: block.show_feedback || false,
        ai_grading_override: block.ai_grading_override || null,
      };
      const baseInsert = {
        assignment_id: newAssignment.id,
        type: block.type,
        position: block.position,
        data: block.data,
      };

      let { error: blockInsertError } = await insertWith(supabase as any, extendedInsert);
      if (blockInsertError && isMissingColumnError(blockInsertError)) {
        ({ error: blockInsertError } = await insertWith(supabase as any, baseInsert));
      }
      if (blockInsertError) {
        const admin = createAdminClient();
        ({ error: blockInsertError } = await insertWith(admin as any, extendedInsert));
        if (blockInsertError && isMissingColumnError(blockInsertError)) {
          await insertWith(admin as any, baseInsert);
        }
      }
    }

    return NextResponse.json({
      ...newAssignment,
      letter_index: getLetterIndex(newAssignment.assignment_index),
      subjectId: targetSubjectId,
      chapterId: targetChapterId,
      paragraphId: targetParagraphId,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
