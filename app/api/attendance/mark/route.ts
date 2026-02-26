import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'

import { markAttendanceSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateBody(request, markAttendanceSchema);
    if ('error' in validation) {
      return validation.error;
    }
    const { sessionId, studentId, status, notes } = validation.data;

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    // (owner_id column was removed - all teachers are equal via class_members)
    
    // First check global subscription_type
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .single()

    let isTeacher = userProfile?.subscription_type === 'teacher'

    // Also check if user is a member of this class (for class-specific teacher role)
    const { data: membership, error: membershipError } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', session.class_id)
      .eq('user_id', user.id)
      .single()

    // Override with class-specific role if present
    if (membership) {
      isTeacher = true
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