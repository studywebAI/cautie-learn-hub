import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { generateAssignmentContent } from '@/ai/flows/generate-assignment-content'
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
      subject,
      grade_level,
      topic,
      duration,
      assignment_type,
      learning_goals,
      include_quiz,
      include_materials,
      complexity,
      class_id,
      notify_students
    } = await request.json()

    // Generate assignment content using AI
    const assignmentContent = await generateAssignmentContent({
      subject,
      grade_level,
      topic,
      duration,
      assignment_type,
      learning_goals,
      include_quiz,
      include_materials,
      complexity,
    })

    // Create the assignment in database
    const { data: assignment, error: assignmentError } = await (supabase as any)
      .from('assignments')
      .insert({
        title: assignmentContent.title,
        description: assignmentContent.description,
        class_id,
        owner_id: user.id,
        due_date: null, // Can be set later
        content: {
          ai_generated: true,
          learning_objectives: assignmentContent.learning_objectives,
          materials: assignmentContent.materials,
          activities: assignmentContent.activities,
          assessment: assignmentContent.assessment,
        }
      })
      .select()
      .single()

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError)
      return NextResponse.json({ error: assignmentError.message }, { status: 500 })
    }

    // Create materials if requested
    if (include_materials && assignmentContent.materials.length > 0) {
      const materialsToCreate = assignmentContent.materials.map(material => ({
        title: material.title,
        content: {
          type: material.type,
          content: material.content,
          estimated_time: material.estimated_time,
        },
        class_id,
        owner_id: user.id,
        material_type: 'ai_generated',
      }))

      const { error: materialsError } = await (supabase as any)
        .from('materials')
        .insert(materialsToCreate)

      if (materialsError) {
        console.error('Error creating materials:', materialsError)
        // Don't fail the whole request for this
      }
    }

    // Notify students if requested
    if (notify_students) {
      try {
        await NotificationService.notifyClassMembers(
          class_id,
          NotificationTemplates.assignmentCreated(
            assignmentContent.title,
            'Generated automatically by AI'
          ),
          user.id
        )
      } catch (notifyError) {
        console.error('Error sending notifications:', notifyError)
      }
    }

    // Notify teacher that AI content was generated
    try {
      await NotificationService.createNotification(
        user.id,
        NotificationTemplates.aiContentGenerated('assignment')
      )
    } catch (notifyError) {
      console.error('Error sending completion notification:', notifyError)
    }

    return NextResponse.json({
      assignment,
      content: assignmentContent,
      message: 'Assignment generated successfully'
    })

  } catch (error) {
    console.error('Error generating assignment:', error)
    return NextResponse.json({
      error: 'Failed to generate assignment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}