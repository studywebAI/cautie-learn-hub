import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { classId } = params

    // Verify user has access to this class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found or access denied' }, { status: 404 })
    }

    // Get attendance sessions
    const { data: sessions, error: sessionsError } = await (supabase as any)
      .from('attendance_sessions')
      .select(`
        *,
        attendance_records (
          id,
          user_id,
          status,
          marked_at,
          notes,
          profiles:user_id (
            full_name,
            avatar_url
          )
        )
      `)
      .eq('class_id', classId)
      .order('date', { ascending: false })

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    // Get class members for reference
    const { data: members, error: membersError } = await supabase
      .from('class_members')
      .select(`
        user_id,
        role,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('class_id', classId)
      .eq('role', 'student')

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    return NextResponse.json({
      className: classData.name,
      sessions: sessions || [],
      students: members || []
    })

  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { classId } = params
    const { title, date, startTime, endTime } = await request.json()

    // Verify user owns the class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('owner_id', user.id)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create attendance session
    const { data: session, error: sessionError } = await (supabase as any)
      .from('attendance_sessions')
      .insert({
        class_id: classId,
        title,
        date,
        start_time: startTime,
        end_time: endTime,
        is_active: true
      })
      .select()
      .single()

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    return NextResponse.json(session)

  } catch (error) {
    console.error('Error creating attendance session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}