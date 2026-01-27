import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { aiGradingAssistant } from '@/ai/flows/ai-grading-assistant'
import { NotificationService, NotificationTemplates } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const {
      submission_id,
      use_ai_assistance = true,
      teacher_override = false
    } = await request.json()

    // Get submission details
    const { data: submission, error: submissionError } = await (supabase as any)
      .from('submissions')
      .select(`
        *,
        assignments (
          id,
          title,
          description,
          content,
          class_id,
          rubrics (
            id,
            name,
            rubric_items (
              id,
              criterion,
              description,
              max_score,
              weight
            )
          )
        )
      `)
      .eq('id', submission_id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check permissions - teacher must own the class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('owner_id')
      .eq('id', submission.assignments.class_id)
      .single()

    if (classError || classData.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let gradingResult = null
    let aiAnalysis = null

    if (use_ai_assistance) {
      // Get assignment rubric
      const rubric = submission.assignments.rubrics?.rubric_items || []

      // Prepare AI grading input
      const gradingInput = {
        assignment_description: submission.assignments.description || '',
        rubric: rubric.map((item: any) => ({
          criterion: item.criterion,
          description: item.description,
          max_score: item.max_score,
          weight: item.weight,
        })),
        student_submission: typeof submission.content === 'string'
          ? submission.content
          : JSON.stringify(submission.content),
        submission_type: 'text' as const,
        grade_level: 'high_school',
        subject: submission.assignments.content?.subject || 'General',
        additional_context: submission.assignments.content?.context || '',
      }

      // Get AI grading analysis
      aiAnalysis = await aiGradingAssistant(gradingInput)

      if (!teacher_override) {
        // Auto-apply AI grading if confidence is high
        gradingResult = {
          grade: aiAnalysis.overall_score,
          feedback: aiAnalysis.general_feedback,
          rubric_scores: aiAnalysis.breakdown.map(item => ({
            criterion: item.criterion,
            score: item.score,
            feedback: item.feedback,
          })),
          ai_graded: true,
          ai_confidence: aiAnalysis.confidence_level,
        }
      }
    }

    if (gradingResult) {
      // Apply the grade
      const updateData: any = {
        grade: gradingResult.grade,
        feedback: gradingResult.feedback,
        status: 'graded',
        graded_at: new Date().toISOString(),
        graded_by: user.id,
        graded_by_ai: gradingResult.ai_graded,
      }

      const { error: updateError } = await (supabase as any)
        .from('submissions')
        .update(updateData)
        .eq('id', submission_id)

      if (updateError) {
        console.error('Error updating submission:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Store AI analysis in submission metadata
      if (aiAnalysis) {
        const { error: metadataError } = await (supabase as any)
          .from('submission_metadata')
          .upsert({
            submission_id,
            ai_analysis: aiAnalysis,
            created_at: new Date().toISOString(),
          })

        if (metadataError) {
          console.error('Error storing AI analysis:', metadataError)
        }
      }

      // Notify student
      try {
        await NotificationService.createNotification(
          submission.user_id,
          NotificationTemplates.submissionGraded(gradingResult.grade)
        )
      } catch (notifyError) {
        console.error('Error sending grade notification:', notifyError)
      }
    }

    // Notify teacher that AI grading is complete
    if (aiAnalysis) {
      try {
        await NotificationService.createNotification(
          user.id,
          NotificationTemplates.aiGradingCompleted()
        )
      } catch (notifyError) {
        console.error('Error sending AI completion notification:', notifyError)
      }
    }

    return NextResponse.json({
      success: true,
      ai_analysis: aiAnalysis,
      applied_grading: gradingResult,
      message: aiAnalysis ? 'AI grading analysis completed' : 'Grading processed'
    })

  } catch (error) {
    console.error('Error in AI grading:', error)
    return NextResponse.json({
      error: 'Failed to process grading',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}