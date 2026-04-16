import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { updateProgressSnapshot } from '@/lib/progress'
import {
  resolveAdaptiveNextBlockId,
  calculateMcqScore,
  calculateFillInBlankScore,
  calculateOrderingScore,
  calculateDragDropScore,
  calculateNumericScore,
  canReleaseFeedback,
  getAssignmentAvailabilityState,
  normalizeAssignmentSettings,
  normalizeBlockSettings,
} from '@/lib/assignments/settings'
import { getOrCreateAttempt, isAttemptExpired } from '@/lib/assignments/attempts'

export const dynamic = 'force-dynamic'

const MISSING_COLUMN_PATTERN = /column .* does not exist/i;

function isMissingColumnError(error: any): boolean {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return MISSING_COLUMN_PATTERN.test(text);
}

// POST - Submit student answer for a block
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string; blockId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const answerData = body.answerData ?? body.answer_data
    const providedAccessCode = typeof body.access_code === 'string' ? body.access_code.trim() : ''

    // Verify the block belongs to this assignment
    const { data: block, error: blockError } = await supabase
      .from('blocks')
      .select('assignment_id, type, data, settings')
      .eq('id', resolvedParams.blockId)
      .single()

    if (blockError || !block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    if (block.assignment_id !== resolvedParams.assignmentId) {
      return NextResponse.json({ error: 'Block does not belong to this assignment' }, { status: 403 })
    }

    // Verify assignment access
    const { data: assignment, error: assignmentError } = await (supabase as any)
      .from('assignments')
      .select(`
        *,
        paragraphs!inner(
          chapter_id,
          chapters!inner(
            subject_id,
            subjects!inner(class_id)
          )
        )
      `)
      .eq('id', resolvedParams.assignmentId)
      .eq('paragraphs.chapter_id', resolvedParams.chapterId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const assignmentSettings = normalizeAssignmentSettings((assignment as any).settings || {});
    const availability = getAssignmentAvailabilityState(assignmentSettings);
    if (!availability.available) {
      return NextResponse.json(
        { error: availability.reason === 'not_started' ? 'Assignment not started yet' : 'Assignment is closed' },
        { status: 403 }
      );
    }

    const clientMeta = {
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: request.headers.get('user-agent') || null,
    };
    const attempt = await getOrCreateAttempt(supabase, resolvedParams.assignmentId, user.id, assignmentSettings, clientMeta);
    if ((attempt as any)?.blocked) {
      return NextResponse.json({ error: (attempt as any).reason, details: attempt }, { status: 429 });
    }
    if (await isAttemptExpired(attempt)) {
      await supabase
        .from('assignment_attempts')
        .update({ status: assignmentSettings.time.autoSubmitOnTimeout ? 'auto_submitted' : 'expired' })
        .eq('id', (attempt as any).id);
      return NextResponse.json({ error: 'Attempt expired' }, { status: 403 });
    }

    let classId = assignment.paragraphs.chapters.subjects.class_id as string | null;
    if (!classId) {
      const { data: linkRow } = await (supabase as any)
        .from('class_subjects')
        .select('class_id')
        .eq('subject_id', resolvedParams.subjectId)
        .limit(1)
        .maybeSingle();
      classId = linkRow?.class_id || null;
    }

    if (!classId) {
      return NextResponse.json({ error: 'Assignment not associated with a class' }, { status: 400 });
    }

    // Check if user is member of the class
    const { data: membership, error: memberError } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Access denied - not a class member' }, { status: 403 })
    }

    if (assignmentSettings.access.allowedClassIds.length > 0 && !assignmentSettings.access.allowedClassIds.includes(classId)) {
      return NextResponse.json({ error: 'Assignment not available for this class' }, { status: 403 });
    }
    if (assignmentSettings.access.accessCode && assignmentSettings.access.accessCode.trim() !== providedAccessCode) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 403 });
    }

    const blockSettings = normalizeBlockSettings((block as any).settings || (block as any).data?.settings || {});
    if (assignmentSettings.antiCheat.requireFullscreen && answerData?.fullscreen_active !== true) {
      return NextResponse.json({ error: 'Fullscreen is required for this assignment' }, { status: 403 });
    }
    if (blockSettings.required && !answerData) {
      return NextResponse.json({ error: 'Answer is required' }, { status: 400 });
    }
    if (!blockSettings.openQuestion.allowFileUpload) {
      const hasFilePayload = !!(answerData?.file || answerData?.files || answerData?.attachment);
      if (hasFilePayload) {
        return NextResponse.json({ error: 'File upload is not allowed for this question' }, { status: 400 });
      }
    }
    if (blockSettings.openQuestion.maxChars && typeof answerData?.text === 'string' && answerData.text.length > blockSettings.openQuestion.maxChars) {
      return NextResponse.json({ error: 'Answer exceeds max characters' }, { status: 400 });
    }
    if (blockSettings.openQuestion.maxWords && typeof answerData?.text === 'string') {
      const words = answerData.text.trim().split(/\s+/).filter(Boolean).length;
      if (words > blockSettings.openQuestion.maxWords) {
        return NextResponse.json({ error: 'Answer exceeds max words' }, { status: 400 });
      }
    }
    const perQuestionLimit = blockSettings.timeLimitSeconds || assignmentSettings.antiCheat.perQuestionTimeLimitSeconds;
    if (perQuestionLimit && typeof answerData?.started_at === 'string') {
      const started = new Date(answerData.started_at).getTime();
      if (Number.isFinite(started)) {
        const elapsedSec = (Date.now() - started) / 1000;
        if (elapsedSec > perQuestionLimit) {
          return NextResponse.json({ error: 'Question time limit exceeded' }, { status: 403 });
        }
      }
    }

    if (blockSettings.matching.maxAttemptsInQuestion && blockSettings.matching.maxAttemptsInQuestion > 0) {
      const { count } = await supabase
        .from('assignment_events')
        .select('id', { head: true, count: 'exact' })
        .eq('assignment_id', resolvedParams.assignmentId)
        .eq('attempt_id', (attempt as any).id)
        .eq('student_id', user.id)
        .eq('event_type', 'answer_saved')
        .filter('event_payload->>block_id', 'eq', resolvedParams.blockId);

      if ((count || 0) >= blockSettings.matching.maxAttemptsInQuestion) {
        return NextResponse.json({ error: 'Max attempts reached for this question' }, { status: 403 });
      }
    }

    let score: number | null = null;
    let isCorrect: boolean | null = null;
    let feedback: string | null = null;
    if (block.type === 'multiple_choice') {
      const selected = answerData?.selected_answers || answerData?.selectedAnswers || [];
      const options = (block as any).data?.options || [];
      const result = calculateMcqScore(Array.isArray(selected) ? selected : [], options, blockSettings);
      score = result.score;
      isCorrect = result.isCorrect;
      feedback = blockSettings.feedbackText || null;
    }
    if (block.type === 'fill_in_blank') {
      const result = calculateFillInBlankScore(
        answerData?.answers || [],
        (block as any).data?.answers || [],
        !!(block as any).data?.case_sensitive,
        blockSettings,
      );
      score = result.score;
      isCorrect = result.isCorrect;
      feedback = blockSettings.feedbackText || null;
    }
    if (block.type === 'ordering') {
      const result = calculateOrderingScore(
        answerData?.order || [],
        (block as any).data?.correct_order || [],
        blockSettings,
      );
      score = result.score;
      isCorrect = result.isCorrect;
      feedback = blockSettings.feedbackText || null;
    }
    if (block.type === 'drag_drop' || block.type === 'matching') {
      const result = calculateDragDropScore(
        answerData?.pairs || [],
        (block as any).data?.pairs || [],
        blockSettings,
      );
      score = result.score;
      isCorrect = result.isCorrect;
      feedback = blockSettings.feedbackText || null;
    }
    if (block.type === 'numeric_question') {
      const expected = (block as any).data?.correct_answer ?? (block as any).data?.answer ?? (block as any).data?.value;
      const expectedText = String(expected ?? '').trim().toLowerCase();
      const answerText = String(answerData?.value ?? '').trim().toLowerCase();
      const alternateMatch = blockSettings.numeric.alternateAnswers
        .map((v) => String(v).trim().toLowerCase())
        .includes(answerText);
      const result = alternateMatch
        ? { score: blockSettings.points, isCorrect: true }
        : calculateNumericScore(answerData?.value, expected, blockSettings);
      score = result.score;
      isCorrect = result.isCorrect;
      feedback = blockSettings.feedbackText || null;
      if (blockSettings.numeric.requiredUnit) {
        const requiredUnit = String(blockSettings.numeric.requiredUnit).trim().toLowerCase();
        const unit = String(answerData?.unit || '').trim().toLowerCase();
        if (!unit || unit !== requiredUnit) {
          return NextResponse.json({ error: `Required unit: ${blockSettings.numeric.requiredUnit}` }, { status: 400 });
        }
      }
    }

    const existingAnswerRes = await supabase
      .from('student_answers')
      .select('id')
      .eq('student_id', user.id)
      .eq('assignment_id', resolvedParams.assignmentId)
      .eq('block_id', resolvedParams.blockId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const answerPayload: any = {
      student_id: user.id,
      assignment_id: resolvedParams.assignmentId,
      block_id: resolvedParams.blockId,
      answer_data: answerData,
      is_correct: isCorrect,
      score,
      feedback,
      graded_by_ai: false,
      submitted_at: new Date().toISOString(),
      assignment_attempt_id: (attempt as any).id,
    };

    let studentAnswer: any = null;
    let insertError: any = null;

    if (existingAnswerRes.data?.id) {
      const updateRes = await supabase
        .from('student_answers')
        .update(answerPayload)
        .eq('id', existingAnswerRes.data.id)
        .select()
        .single();
      studentAnswer = updateRes.data;
      insertError = updateRes.error;
    } else {
      const insertRes = await supabase
        .from('student_answers')
        .insert(answerPayload)
        .select()
        .single();
      if (insertRes.error && String(insertRes.error.message || '').toLowerCase().includes('assignment_attempt_id')) {
        delete answerPayload.assignment_attempt_id;
        const fallbackRes = await supabase
          .from('student_answers')
          .insert(answerPayload)
          .select()
          .single();
        studentAnswer = fallbackRes.data;
        insertError = fallbackRes.error;
      } else {
        studentAnswer = insertRes.data;
        insertError = insertRes.error;
      }
    }

    if (insertError) {
      console.error('Error inserting student answer:', insertError)
      return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 })
    }

    const { error: assignmentEventError } = await supabase
      .from('assignment_events')
      .insert({
        assignment_id: resolvedParams.assignmentId,
        attempt_id: (attempt as any).id,
        student_id: user.id,
        event_type: 'answer_saved',
        event_payload: {
          block_id: resolvedParams.blockId,
          assignment_id: resolvedParams.assignmentId,
        },
      });
    if (assignmentEventError) {
      console.warn('Failed to insert assignment event after answer submit', assignmentEventError);
    }

    // Queue AI grading only when both block + assignment grading settings allow it.
    if (
      block.type === 'open_question' &&
      (block.data as any)?.ai_grading &&
      assignmentSettings.grading.autoGrade &&
      assignmentSettings.grading.manualReviewOpenQuestions
    ) {
      const { error: jobError } = await (supabase as any)
        .from('ai_grading_queue')
        .insert({
          answer_id: studentAnswer.id
        })

      if (jobError) {
        console.error('Error creating grading job:', jobError)
        // Don't fail the submission, just log
      }
    }

    // Update progress_snapshots
    await updateProgressSnapshot(resolvedParams.paragraphId, user.id)

    const hasSubmitted = (attempt as any).status !== 'in_progress';
    const canShowFeedback = canReleaseFeedback(assignmentSettings, hasSubmitted);
    let adaptiveNextBlockId: string | null = null;
    if (assignmentSettings.advanced.adaptiveEnabled && isCorrect === false) {
      const { data: allBlocks } = await supabase
        .from('blocks')
        .select('id, position, settings')
        .eq('assignment_id', resolvedParams.assignmentId)
        .order('position', { ascending: true });
      const { data: answeredRows } = await supabase
        .from('student_answers')
        .select('block_id')
        .eq('student_id', user.id)
        .eq('assignment_id', resolvedParams.assignmentId);
      const answered = new Set((answeredRows || []).map((r: any) => r.block_id));
      const unresolvedBlocks = (allBlocks || []).filter((candidate: any) => !answered.has(candidate.id));
      const ruleMatch = resolveAdaptiveNextBlockId(
        assignmentSettings.advanced.adaptiveRules || [],
        {
          blockId: resolvedParams.blockId,
          isCorrect,
          score,
        },
        unresolvedBlocks.map((b: any) => ({ id: b.id, settings: b.settings })),
      );
      if (ruleMatch) {
        adaptiveNextBlockId = ruleMatch;
      } else {
        const remedial = unresolvedBlocks.find((candidate: any) => {
          const candidateSettings = normalizeBlockSettings(candidate.settings || {});
          return candidateSettings.tags.includes('remedial');
        });
        adaptiveNextBlockId = remedial?.id || null;
      }
    }

    return NextResponse.json({
      message: 'Answer submitted successfully',
      answer: studentAnswer,
      feedback_visible: canShowFeedback,
      adaptive_next_block_id: adaptiveNextBlockId,
    })

  } catch (error) {
    console.error('Unexpected error in block POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a specific block
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string; blockId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const newData = body?.data ?? body ?? {}
    const settings = body?.settings
    const locked = body?.locked ?? newData?.locked
    const show_feedback = body?.show_feedback ?? newData?.show_feedback
    const ai_grading_override = body?.ai_grading_override ?? newData?.ai_grading_override
    const nextType = body?.type ?? newData?.type
    const nextPosition = body?.position ?? newData?.position

    // Verify the block belongs to this assignment and user has access
    const { data: block, error: blockError } = await supabase
      .from('blocks')
      .select('assignment_id')
      .eq('id', resolvedParams.blockId)
      .single()

    if (blockError || !block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    if (block.assignment_id !== resolvedParams.assignmentId) {
      return NextResponse.json({ error: 'Block does not belong to this assignment' }, { status: 403 })
    }

    // Verify access to the assignment
    const { data: assignment, error: assignmentError } = await (supabase as any)
      .from('assignments')
      .select(`
        *,
        paragraphs!inner(
          chapter_id,
          chapters!inner(
            subject_id,
            subjects!inner(class_id, user_id)
          )
        )
      `)
      .eq('id', resolvedParams.assignmentId)
      .eq('paragraphs.chapter_id', resolvedParams.chapterId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const subjectData = assignment.paragraphs.chapters.subjects as any
    const classId = subjectData.class_id

    // Check if user is teacher/owner
    let isTeacher = false;
    if (classId) {
      const { data: classMembership } = await supabase
        .from('class_members')
        .select('role')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .maybeSingle();
      const role = String(classMembership?.role || '').toLowerCase();
      isTeacher = role === 'teacher' || role === 'owner' || role === 'admin' || role === 'creator';
    } else {
      isTeacher = subjectData.user_id === user.id;
    }

    if (!isTeacher) {
      return NextResponse.json({ error: 'Access denied - only teachers can update blocks' }, { status: 403 })
    }

    // Update the block
    const normalizedSettings = normalizeBlockSettings(settings || (newData as any)?.settings || {});
    const fullPayload: any = { data: newData, settings: normalizedSettings };
    const fallbackPayload: any = { data: newData };
    if (typeof nextType === 'string') {
      fullPayload.type = nextType;
      fallbackPayload.type = nextType;
    }
    if (typeof nextPosition === 'number' && Number.isFinite(nextPosition)) {
      fullPayload.position = nextPosition;
      fallbackPayload.position = nextPosition;
    }
    if (locked !== undefined) fullPayload.locked = locked;
    if (show_feedback !== undefined) fullPayload.show_feedback = show_feedback;
    if (ai_grading_override !== undefined) fullPayload.ai_grading_override = ai_grading_override;

    const updateWith = async (client: any, payload: Record<string, any>) =>
      client
        .from('blocks')
        .update(payload)
        .eq('id', resolvedParams.blockId)
        .select()
        .single();

    let { data: updatedBlock, error: updateError } = await updateWith(supabase as any, fullPayload);
    if (updateError && isMissingColumnError(updateError)) {
      ({ data: updatedBlock, error: updateError } = await updateWith(supabase as any, fallbackPayload));
    }
    if (updateError) {
      const admin = createAdminClient();
      ({ data: updatedBlock, error: updateError } = await updateWith(admin as any, fullPayload));
      if (updateError && isMissingColumnError(updateError)) {
        ({ data: updatedBlock, error: updateError } = await updateWith(admin as any, fallbackPayload));
      }
    }

    if (updateError) {
      console.error('Error updating block:', {
        message: (updateError as any)?.message,
        details: (updateError as any)?.details,
        hint: (updateError as any)?.hint,
        code: (updateError as any)?.code,
      })
      return NextResponse.json({ error: 'Failed to update block' }, { status: 500 })
    }

    return NextResponse.json(updatedBlock)
  } catch (error) {
    console.error('Unexpected error in block PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE a specific block
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string; blockId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the block belongs to this assignment and user has access
    const { data: block, error: blockError } = await supabase
      .from('blocks')
      .select('assignment_id')
      .eq('id', resolvedParams.blockId)
      .single()

    if (blockError || !block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    if (block.assignment_id !== resolvedParams.assignmentId) {
      return NextResponse.json({ error: 'Block does not belong to this assignment' }, { status: 403 })
    }

    // Verify access to the assignment
    const { data: assignment, error: assignmentError } = await (supabase as any)
      .from('assignments')
      .select(`
        *,
        paragraphs!inner(
          chapter_id,
          chapters!inner(
            subject_id,
            subjects!inner(class_id, user_id)
          )
        )
      `)
      .eq('id', resolvedParams.assignmentId)
      .eq('paragraphs.chapter_id', resolvedParams.chapterId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const subjectData = assignment.paragraphs.chapters.subjects as any
    const classId = subjectData.class_id

    // Check if user is teacher/owner
    let isTeacher = false;
    if (classId) {
      const { data: classMembership } = await supabase
        .from('class_members')
        .select('role')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .maybeSingle();
      const role = String(classMembership?.role || '').toLowerCase();
      isTeacher = role === 'teacher' || role === 'owner' || role === 'admin' || role === 'creator';
    } else {
      isTeacher = subjectData.user_id === user.id;
    }

    if (!isTeacher) {
      return NextResponse.json({ error: 'Access denied - only teachers can delete blocks' }, { status: 403 })
    }

    // Delete the block
    const { error: deleteError } = await supabase
      .from('blocks')
      .delete()
      .eq('id', resolvedParams.blockId)

    if (deleteError) {
      console.error('Error deleting block:', deleteError)
      return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Block deleted successfully' })
  } catch (error) {
    console.error('Unexpected error in block DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
