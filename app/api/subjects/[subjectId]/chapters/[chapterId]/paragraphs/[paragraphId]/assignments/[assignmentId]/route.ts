import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { normalizeAssignmentSettings } from '@/lib/assignments/settings'

export const dynamic = 'force-dynamic'

async function userHasSubjectAccess(supabase: any, userId: string, subjectId: string): Promise<boolean> {
  const { data: subject } = await (supabase as any)
    .from('subjects')
    .select('id, user_id, class_id')
    .eq('id', subjectId)
    .maybeSingle();

  if (!subject) return false;
  if (subject.user_id === userId) return true;

  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('user_id', userId);
  const classIds = (memberships || []).map((m: any) => m.class_id).filter(Boolean);
  if (classIds.length === 0) return false;
  if (subject.class_id && classIds.includes(subject.class_id)) return true;

  const { data: links } = await (supabase as any)
    .from('class_subjects')
    .select('subject_id')
    .eq('subject_id', subjectId)
    .in('class_id', classIds)
    .limit(1);
  return !!(links && links.length > 0);
}

// GET assignment details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  try {
    const cookieStore = cookies()
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
      const isTeacher = profile?.subscription_type === 'teacher';
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
      console.log('Assignment fetch error:', error);
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
    const isTeacher = profile?.subscription_type === 'teacher';
    if (!isTeacher && normalizedSettings.access.accessCode) {
      normalizedSettings.access.accessCode = '__required__';
    }

    return NextResponse.json({
      ...assignment,
      settings: normalizedSettings,
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
