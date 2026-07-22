import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { normalizeAssignmentSettings } from '@/lib/assignments/settings'
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions'

export const dynamic = 'force-dynamic'

// GET assignment details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasSubjectAccess = await userHasSubjectAccess(supabase, user.id, resolvedParams.subjectId);
    if (!hasSubjectAccess) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const { data: assignment, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', resolvedParams.assignmentId)
      .eq('paragraph_id', resolvedParams.paragraphId)
      .maybeSingle();

    if (!assignment) {
      const { data: fallbackAssignment } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', resolvedParams.assignmentId)
        .maybeSingle();

      if (!fallbackAssignment) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_type')
        .eq('id', user.id)
        .maybeSingle();
      const isTeacher = ['teacher', 'owner', 'admin', 'creator'].includes(String(profile?.subscription_type || '').toLowerCase());
      if (!isTeacher && (fallbackAssignment as any).is_visible === false) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }
      const fallbackSettings = normalizeAssignmentSettings((fallbackAssignment as any).settings || {});
      if (!isTeacher && fallbackSettings.access.accessCode) {
        fallbackSettings.access.accessCode = '__required__';
      }

      return NextResponse.json({
        ...fallbackAssignment,
        settings: fallbackSettings,
      });
    }

    if (error) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const normalizedSettings = normalizeAssignmentSettings(assignment?.settings || {
      time: {
        startAt: assignment?.scheduled_start_at ?? null,
        endAt: assignment?.scheduled_end_at ?? null,
        timerMode: assignment?.timer_mode ?? 'deadline',
        durationMinutes: assignment?.duration_minutes ?? null,
        autoSubmitOnTimeout: assignment?.auto_submit_on_timeout ?? true,
        showTimer: assignment?.show_timer ?? true,
      },
      attempts: {
        maxAttempts: assignment?.max_attempts ?? 1,
        scoreMode: assignment?.attempt_score_mode ?? 'best',
        cooldownMinutes: assignment?.cooldown_minutes ?? 0,
      },
      access: {
        accessCode: assignment?.access_code ?? null,
        allowedClassIds: assignment?.allowed_class_ids ?? [],
        shuffleQuestions: assignment?.shuffle_questions ?? false,
        shuffleAnswers: assignment?.shuffle_answers ?? false,
        shuffleQuestionsPerStudent: assignment?.shuffle_questions_per_student ?? false,
      },
      grading: {
        showCorrectAnswers: assignment?.show_correct_answers ?? true,
        showPoints: assignment?.show_points ?? true,
        totalPoints: assignment?.total_points ?? 100,
        weight: assignment?.assignment_weight ?? 1,
        gradeDisplayMode: assignment?.grade_display_mode ?? 'score',
        roundingDecimals: assignment?.rounding_decimals ?? 1,
      },
      antiCheat: {
        requireFullscreen: assignment?.require_fullscreen ?? false,
        detectTabSwitch: assignment?.detect_tab_switch ?? false,
        perQuestionTimeLimitSeconds: assignment?.per_question_time_limit_seconds ?? null,
        restrictIpOrDevice: assignment?.restrict_ip_or_device ?? false,
      },
      delivery: {
        autosave: assignment?.autosave_enabled ?? true,
        allowResume: assignment?.allow_resume ?? true,
        instructionText: assignment?.instruction_text ?? assignment?.description ?? '',
      },
      advanced: {
        questionPoolSize: assignment?.question_pool_size ?? null,
        adaptiveEnabled: assignment?.adaptive_enabled ?? false,
        adaptiveRules: assignment?.adaptive_rules ?? [],
        reviewModeEnabled: assignment?.review_mode_enabled ?? true,
        reflectionEnabled: assignment?.reflection_enabled ?? false,
        improvementAttemptEnabled: assignment?.improvement_attempt_enabled ?? false,
      },
    });

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle();
    const isTeacher = ['teacher', 'owner', 'admin', 'creator'].includes(String(profile?.subscription_type || '').toLowerCase());

    // Hidden/unpublished assignments (esp. tests before they're scheduled)
    // must not be fetchable by non-teachers even via a direct/guessed URL.
    if (!isTeacher && assignment?.is_visible === false) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    if (!isTeacher && normalizedSettings.access.accessCode) {
      normalizedSettings.access.accessCode = '__required__';
    }

    return NextResponse.json({
      ...assignment,
      settings: normalizedSettings,
    });

  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
