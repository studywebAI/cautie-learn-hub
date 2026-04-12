import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { updateProgressSnapshot } from '@/lib/progress'
import {
  calculateMcqScore,
  canReleaseFeedback,
  getAssignmentAvailabilityState,
  normalizeAssignmentSettings,
  normalizeBlockSettings,
} from '@/lib/assignments/settings'
import { getOrCreateAttempt, isAttemptExpired } from '@/lib/assignments/attempts'

export const dynamic = 'force-dynamic'

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

    const attempt = await getOrCreateAttempt(supabase, resolvedParams.assignmentId, user.id, assignmentSettings);
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

    const blockSettings = normalizeBlockSettings((block as any).settings || (block as any).data?.settings || {});
    if (blockSettings.required && !answerData) {
      return NextResponse.json({ error: 'Answer is required' }, { status: 400 });
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

    // Insert student answer
    const { data: studentAnswer, error: insertError } = await supabase
      .from('student_answers')
      .insert({
        student_id: user.id,
        assignment_id: resolvedParams.assignmentId,
        block_id: resolvedParams.blockId,
        answer_data: answerData,
        is_correct: isCorrect,
        score,
        feedback,
        graded_by_ai: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting student answer:', insertError)
      return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 })
    }

    await supabase
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
      })
      .then(() => undefined)
      .catch(() => undefined);

    // If OpenQuestionBlock with AI grading, queue grading job
    if (block.type === 'open_question' && (block.data as any)?.ai_grading) {
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

    const hasSubmitted = false;
    const canShowFeedback = canReleaseFeedback(assignmentSettings, hasSubmitted);
    return NextResponse.json({
      message: 'Answer submitted successfully',
      answer: studentAnswer,
      feedback_visible: canShowFeedback,
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

    const { data: newData, settings } = await request.json()
    // Extract new fields if present
    const { locked, show_feedback, ai_grading_override } = newData;

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
        .select('user_id')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .maybeSingle();
      isTeacher = !!classMembership;
    } else {
      isTeacher = subjectData.user_id === user.id;
    }

    if (!isTeacher) {
      return NextResponse.json({ error: 'Access denied - only teachers can update blocks' }, { status: 403 })
    }

    // Update the block
    const normalizedSettings = normalizeBlockSettings(settings || (newData as any)?.settings || {});
    const updatePayload: any = { data: newData, settings: normalizedSettings };
    if (locked !== undefined) updatePayload.locked = locked;
    if (show_feedback !== undefined) updatePayload.show_feedback = show_feedback;
    if (ai_grading_override !== undefined) updatePayload.ai_grading_override = ai_grading_override;
    
    const { data: updatedBlock, error: updateError } = await supabase
      .from('blocks')
      .update(updatePayload)
      .eq('id', resolvedParams.blockId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating block:', updateError)
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
        .select('user_id')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .maybeSingle();
      isTeacher = !!classMembership;
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
