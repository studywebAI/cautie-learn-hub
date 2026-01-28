import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET grading queue status and pending jobs
export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get grading queue status
    const { data: queueStatus, error: queueError } = await (supabase as any)
      .from('ai_grading_queue')
      .select('status')
      .order('created_at')

    if (queueError) {
      console.error('Error fetching queue status:', queueError)
      return NextResponse.json({ error: 'Failed to fetch queue status' }, { status: 500 })
    }

    // Count by status
    const statusCounts = queueStatus?.reduce((acc: any, job: any) => {
      acc[job.status] = (acc[job.status] || 0) + 1
      return acc
    }, {}) || {}

    // Get recent completed jobs for teacher overview
    const { data: recentJobs, error: recentError } = await (supabase as any)
      .from('ai_grading_queue')
      .select(`
        *,
        student_answers (
          block_id,
          assignments (
            title,
            paragraph_id,
            paragraphs (
              title,
              chapter_id,
              chapters (
                title,
                subject_id,
                subjects (title)
              )
            )
          )
        )
      `)
      .eq('status', 'completed')
      .order('processed_at', { ascending: false })
      .limit(10)

    const response = {
      queue_status: {
        total: queueStatus?.length || 0,
        pending: statusCounts.pending || 0,
        processing: statusCounts.processing || 0,
        completed: statusCounts.completed || 0,
        failed: statusCounts.failed || 0
      },
      recent_gradings: recentJobs?.map((job: any) => ({
        id: job.id,
        processed_at: job.processed_at,
        assignment_title: job.student_answers?.assignments?.title,
        paragraph_title: job.student_answers?.assignments?.paragraphs?.title,
        chapter_title: job.student_answers?.assignments?.paragraphs?.chapters?.title,
        subject_title: job.student_answers?.assignments?.paragraphs?.chapters?.subjects?.title,
      })) || []
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Unexpected error in grading status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}