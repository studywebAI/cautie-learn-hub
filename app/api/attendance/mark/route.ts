import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, studentId, status, notes } = await request.json()

    // For students marking their own attendance, verify the session is active
    // For teachers, allow marking any student's attendance

    const { data: session, error: sessionError } = await (supabase as any)
      .from('attendance_sessions')
      .select('id, class_id, is_active')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if user is a teacher for this class or the student themselves
    const { data: membership, error: membershipError } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', session.class_id)
      .eq('user_id', user.id)
      .single()

    let isTeacher = membership?.role === 'teacher'

    if (!isTeacher) {
      const { data: classOwner } = await supabase
        .from('classes')
        .select('owner_id')
        .eq('id', session.class_id)
        .eq('owner_id', user.id)
        .maybeSingle()

      isTeacher = !!classOwner
    }

    const isSelf = user.id === studentId

    if (!isTeacher && !isSelf) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (isSelf && !session.is_active) {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 })
    }

    // Mark attendance
    const { data: record, error: recordError } = await (supabase as any)
      .from('attendance_records')
      .upsert({
        session_id: sessionId,
        user_id: studentId,
        status,
        notes,
        marked_by: isTeacher ? user.id : null
      }, {
        onConflict: 'session_id,user_id'
      })
      .select()
      .single()

    if (recordError) {
      return NextResponse.json({ error: recordError.message }, { status: 500 })
    }

    return NextResponse.json(record)

  } catch (error) {
    console.error('Error marking attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}