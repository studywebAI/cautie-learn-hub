import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { updateProgressSnapshot } from '@/lib/progress'

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

    const { answerData } = await request.json()

    // Verify the block belongs to this assignment
    const { data: block, error: blockError } = await supabase
      .from('blocks')
      .select('assignment_id, type, data')
      .eq('id', resolvedParams.blockId)
      .single()

    if (blockError || !block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    if (block.assignment_id !== resolvedParams.assignmentId) {
      return NextResponse.json({ error: 'Block does not belong to this assignment' }, { status: 403 })
    }

    // Verify assignment access
    const { data: assignment, error: assignmentError } = await supabase
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

    const classId = assignment.paragraphs.chapters.subjects.class_id

    if (!classId) {
      return NextResponse.json({ error: 'Assignment not associated with a class' }, { status: 400 })
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

    // Insert student answer
    const { data: studentAnswer, error: insertError } = await supabase
      .from('student_answers')
      .insert({
        student_id: user.id,
        block_id: resolvedParams.blockId,
        answer_data: answerData,
        is_correct: null, // Will be set by grading
        graded_by_ai: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting student answer:', insertError)
      return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 })
    }

    // If OpenQuestionBlock with AI grading, queue grading job
    if (block.type === 'open_question' && (block.data as any)?.ai_grading) {
      const { error: jobError } = await supabase
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

    return NextResponse.json({
      message: 'Answer submitted successfully',
      answer: studentAnswer
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

    const { data: newData } = await request.json()

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
    const { data: assignment, error: assignmentError } = await supabase
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
    let isTeacher = false
    if (classId) {
      // Subject associated with class
      const { data: classAccess, error: classError } = await supabase
        .from('classes')
        .select('owner_id')
        .eq('id', classId)
        .single()

      if (classError || !classAccess) {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 })
      }

      isTeacher = classAccess.owner_id === user.id
    } else {
      // Global subject
      isTeacher = subjectData.user_id === user.id
    }

    if (!isTeacher) {
      return NextResponse.json({ error: 'Access denied - only teachers can update blocks' }, { status: 403 })
    }

    // Update the block
    const { data: updatedBlock, error: updateError } = await supabase
      .from('blocks')
      .update({ data: newData })
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
    const { data: assignment, error: assignmentError } = await supabase
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
    let isTeacher = false
    if (classId) {
      // Subject associated with class
      const { data: classAccess, error: classError } = await supabase
        .from('classes')
        .select('owner_id')
        .eq('id', classId)
        .single()

      if (classError || !classAccess) {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 })
      }

      isTeacher = classAccess.owner_id === user.id
    } else {
      // Global subject
      isTeacher = subjectData.user_id === user.id
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
