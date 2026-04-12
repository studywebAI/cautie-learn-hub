import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { normalizeAssignmentSettings } from '@/lib/assignments/settings'
import { getClassPermission } from '@/lib/auth/class-permissions'

import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

// DELETE an assignment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const resolvedParams = await params;
  const { assignmentId } = resolvedParams;
  const { searchParams } = new URL(request.url);
  const guestId = searchParams.get('guestId');

  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !guestId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check ownership
  let query = (supabase as any)
    .from('assignments')
    .select('class_id')
    .eq('id', assignmentId)
    .single();

  const { data: assignment, error: fetchError } = await query;
  if (fetchError || !assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const classId = (assignment as any).class_id;

  if (user) {
    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Forbidden. You are not authorized to manage this assignment.' }, { status: 403 });
    }
  } else if (guestId) {
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('guest_id')
      .eq('id', classId)
      .eq('owner_type', 'guest')
      .single();

    if (classError || !classData || classData.guest_id !== guestId) {
      return NextResponse.json({ error: 'Forbidden. You are not the owner of this class.' }, { status: 403 });
    }
  }

  // Delete the assignment
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH to update assignment visibility/answers settings
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const resolvedParams = await params;
  const { assignmentId } = resolvedParams;
  const body = await request.json();
  const {
    is_visible,
    answers_enabled,
    is_locked,
    answer_mode,
    ai_grading_enabled,
    settings,
  } = body;

  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: assignmentOwnerCheck, error: ownerFetchError } = await (supabase as any)
    .from('assignments')
    .select('class_id')
    .eq('id', assignmentId)
    .maybeSingle();
  if (ownerFetchError || !assignmentOwnerCheck) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const classId = assignmentOwnerCheck.class_id;
  const perm = await getClassPermission(supabase as any, classId, user.id);
  if (!perm.isMember || !perm.isTeacher) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Build update object with only provided fields
  const updateData: Record<string, any> = {};
  if (typeof is_visible === 'boolean') updateData.is_visible = is_visible;
  if (typeof answers_enabled === 'boolean') updateData.answers_enabled = answers_enabled;
  if (typeof is_locked === 'boolean') updateData.is_locked = is_locked;
  if (typeof answer_mode === 'string') updateData.answer_mode = answer_mode;
  if (typeof ai_grading_enabled === 'boolean') updateData.ai_grading_enabled = ai_grading_enabled;
  if (settings !== undefined) {
    const normalized = normalizeAssignmentSettings(settings);
    updateData.settings = normalized as any;
    updateData.access_code = normalized.access.accessCode;
    updateData.timer_mode = normalized.time.timerMode;
    updateData.duration_minutes = normalized.time.durationMinutes;
    updateData.auto_submit_on_timeout = normalized.time.autoSubmitOnTimeout;
    updateData.max_attempts = normalized.attempts.maxAttempts;
    updateData.attempt_score_mode = normalized.attempts.scoreMode;
    updateData.cooldown_minutes = normalized.attempts.cooldownMinutes;
    updateData.show_correct_answers = normalized.grading.showCorrectAnswers;
    updateData.show_points = normalized.grading.showPoints;
    updateData.total_points = normalized.grading.totalPoints;
    updateData.assignment_weight = normalized.grading.weight;
    updateData.grade_display_mode = normalized.grading.gradeDisplayMode;
    updateData.rounding_decimals = normalized.grading.roundingDecimals;
    updateData.require_fullscreen = normalized.antiCheat.requireFullscreen;
    updateData.detect_tab_switch = normalized.antiCheat.detectTabSwitch;
    updateData.per_question_time_limit_seconds = normalized.antiCheat.perQuestionTimeLimitSeconds;
    updateData.restrict_ip_or_device = normalized.antiCheat.restrictIpOrDevice;
    updateData.shuffle_questions = normalized.access.shuffleQuestions;
    updateData.shuffle_answers = normalized.access.shuffleAnswers;
    updateData.shuffle_questions_per_student = normalized.access.shuffleQuestionsPerStudent;
    updateData.autosave_enabled = normalized.delivery.autosave;
    updateData.allow_resume = normalized.delivery.allowResume;
    updateData.instruction_text = normalized.delivery.instructionText;
    updateData.show_timer = normalized.time.showTimer;
    updateData.question_pool_size = normalized.advanced.questionPoolSize;
    updateData.adaptive_enabled = normalized.advanced.adaptiveEnabled;
    updateData.adaptive_rules = normalized.advanced.adaptiveRules as any;
    updateData.review_mode_enabled = normalized.advanced.reviewModeEnabled;
    updateData.reflection_enabled = normalized.advanced.reflectionEnabled;
    updateData.improvement_attempt_enabled = normalized.advanced.improvementAttemptEnabled;
    updateData.allowed_class_ids = normalized.access.allowedClassIds as any;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('assignments')
    .update(updateData)
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PUT to update an assignment
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const resolvedParams = await params;
  const { assignmentId } = resolvedParams;
  const { title, due_date, chapter_id, block_id, guestId, type, content, files, is_visible, answers_enabled, is_locked, answer_mode, ai_grading_enabled } = await request.json();
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !guestId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check ownership
  let query = (supabase as any)
    .from('assignments')
    .select('class_id')
    .eq('id', assignmentId)
    .single();

  const { data: assignment, error: fetchError } = await query;
  if (fetchError || !assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const classId = (assignment as any).class_id;

  if (user) {
    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Forbidden. You are not authorized to manage this assignment.' }, { status: 403 });
    }
  } else if (guestId) {
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('guest_id')
      .eq('id', classId)
      .eq('owner_type', 'guest')
      .single();

    if (classError || !classData || classData.guest_id !== guestId) {
      return NextResponse.json({ error: 'Forbidden. You are not the owner of this class.' }, { status: 403 });
    }
  }

  // Validate chapter_id if provided
  if (chapter_id) {
    const { data: chapter, error: chapterError } = await (supabase as any)
      .from('chapters')
      .select('subject_id, subjects(class_id)')
      .eq('id', chapter_id)
      .single();

    if (chapterError || !chapter || chapter.subjects?.class_id !== classId) {
      return NextResponse.json({ error: 'Invalid chapter_id' }, { status: 400 });
    }
  }

  // Validate block_id if provided
  if (block_id) {
    const { data: block, error: blockError } = await (supabase as any)
      .from('blocks')
      .select('chapter_id')
      .eq('id', block_id)
      .single();

    if (blockError || !block || block.chapter_id !== chapter_id) {
      return NextResponse.json({ error: 'Invalid block_id' }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from('assignments')
    .update({
      title,
      due_date,
      chapter_id,
      block_id,
      type,
      content,
      files,
      is_visible,
      answers_enabled,
      is_locked,
      answer_mode,
      ai_grading_enabled,
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
