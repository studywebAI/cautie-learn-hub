import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Start a new session
export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paragraph_id, started_at } = await request.json()

    // Verify access to paragraph
    const { data: paragraph, error: paraError } = await supabase
      .from('paragraphs')
      .select(`
        chapters (
          subjects (
            class_id
          )
        )
      `)
      .eq('id', paragraph_id)
      .single()

    if (paraError || !paragraph) {
      return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 })
    }

    const classId = (paragraph.chapters as any).subjects.class_id

    // Check membership
    const { data: membership } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('session_logs')
      .insert({
        student_id: user.id,
        paragraph_id,
        started_at: started_at || new Date().toISOString()
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
    }

    return NextResponse.json(session)

  } catch (error) {
    console.error('Unexpected error in sessions POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Stop a session
export async function PUT(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { session_id, finished_at } = await request.json()

    // Update session (only if owned by user)
    const { data: session, error: updateError } = await supabase
      .from('session_logs')
      .update({
        finished_at: finished_at || new Date().toISOString()
      })
      .eq('id', session_id)
      .eq('student_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session:', updateError)
      return NextResponse.json({ error: 'Failed to stop session' }, { status: 500 })
    }

    return NextResponse.json(session)

  } catch (error) {
    console.error('Unexpected error in sessions PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}