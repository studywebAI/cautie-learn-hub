import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assignmentIds = searchParams.get('assignmentIds')?.split(',') || []

    if (assignmentIds.length === 0) {
      return NextResponse.json([])
    }

    const { data: submissions, error } = await (supabase as any)
      .from('submissions')
      .select('*')
      .in('assignment_id', assignmentIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(submissions || [])
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assignmentId, content, files, status } = await request.json()

    if (!assignmentId) {
      return NextResponse.json({ error: 'Missing assignmentId' }, { status: 400 })
    }

    const { data: submission, error } = await (supabase as any)
      .from('submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        content: content || '',
        files: files || [],
        status: status || 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error('Error creating submission:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}