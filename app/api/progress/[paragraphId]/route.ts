import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Get progress analytics for a paragraph (teacher view)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ paragraphId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params

    // Verify teacher access
    const { data: paragraph, error: paraError } = await supabase
      .from('paragraphs')
      .select(`
        chapters (
          subjects (
            class_id
          )
        )
      `)
      .eq('id', resolvedParams.paragraphId)
      .single()

    if (paraError || !paragraph) {
      return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 })
    }

    const classId = (paragraph.chapters as any).subjects.class_id

    const { data: classOwner } = await supabase
      .from('classes')
      .select('owner_id')
      .eq('id', classId)
      .single()

    if (classOwner?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Access denied - only class owner can view progress' }, { status: 403 })
    }

    // Get progress snapshots
    const { data: progressData, error: progressError } = await supabase
      .from('progress_snapshots')
      .select(`
        *,
        profiles:user_id (
          full_name
        )
      `)
      .eq('paragraph_id', resolvedParams.paragraphId)

    if (progressError) {
      console.error('Error fetching progress:', progressError)
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
    }

    // Get session logs for time tracking
    const { data: sessions, error: sessionError } = await supabase
      .from('session_logs')
      .select(`
        student_id,
        started_at,
        finished_at
      `)
      .eq('paragraph_id', resolvedParams.paragraphId)

    // Aggregate data
    const analytics = {
      total_students: progressData?.length || 0,
      average_completion: progressData ? Math.round(progressData.reduce((sum, p) => sum + p.completion_percent, 0) / progressData.length) : 0,
      student_progress: progressData?.map(p => ({
        student_id: p.student_id,
        student_name: (p.profiles as any)?.full_name || 'Unknown',
        completion_percent: p.completion_percent,
        last_updated: p.updated_at
      })),
      session_summary: sessions ? {
        total_sessions: sessions.length,
        total_time_spent: sessions.reduce((total, s) => {
          if (s.started_at && s.finished_at) {
            return total + (new Date(s.finished_at).getTime() - new Date(s.started_at).getTime())
          }
          return total
        }, 0) / 1000 / 60 // in minutes
      } : null
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Unexpected error in progress GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}