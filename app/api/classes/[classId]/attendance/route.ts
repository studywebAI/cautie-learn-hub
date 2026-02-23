import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET - Fetch all students with their attendance records for a class
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const resolvedParams = await params
    const { classId } = resolvedParams
    console.log(`\n🌐 [ATTENDANCE_GET] Fetching attendance for class: ${classId}`)
    
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
          remove(name: string, options: any) { cookieStore.set(name, '', { ...options, maxAge: 0 }) }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    console.log('[ATTENDANCE_GET] User:', user?.id)

    if (!user) {
      console.log('[ATTENDANCE_GET] ❌ No user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or teacher
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('owner_id')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const isOwner = classData.owner_id === user.id
    
    // Get user's subscription_type to check if they're a teacher
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .single()

    const isTeacher = userProfile?.subscription_type === 'teacher'
    
    // Owner can always view/update, teachers can view/update
    const canAccess = isOwner || isTeacher
    
    if (!canAccess) {
      return NextResponse.json({ error: 'Only teachers can view attendance' }, { status: 403 })
    }

    // Get all students in the class using profiles.subscription_type
    // First get all class member user IDs
    const { data: classMembers, error: membersError } = await supabase
      .from('class_members')
      .select('user_id, joined_at')
      .eq('class_id', classId)

    const memberUserIds = (classMembers || []).map(m => m.user_id)
    
    // Then filter by subscription_type = 'student'
    let studentIds: string[] = []
    if (memberUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .in('id', memberUserIds)
        .eq('subscription_type', 'student')
      
      studentIds = (profiles || []).map(p => p.id)
    }

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    // Get profiles for students
    let students: any[] = []
    if (studentIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', studentIds)
      
      if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 500 })
      }
      students = profilesData || []
    }

    // Get attendance records for all students
    let attendanceRecords = []
    if (studentIds.length > 0) {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('class_id', classId)
        .in('student_id', studentIds)
      
      if (attendanceError) {
        return NextResponse.json({ error: attendanceError.message }, { status: 500 })
      }
      attendanceRecords = attendanceData || []
    }

    // Calculate stats per student
    const studentsWithAttendance = students.map((student: any) => {
      const studentRecords = attendanceRecords.filter((r: any) => r.student_id === student.id)
      
      const absentCount = studentRecords.filter((r: any) => r.is_present === false).length
      const homeworkIncompleteCount = studentRecords.filter((r: any) => r.has_homework_incomplete === true).length
      const sentOutCount = studentRecords.filter((r: any) => r.was_sent_out === true).length
      const tooLateCount = studentRecords.filter((r: any) => r.was_too_late === true).length
      
      // Get the latest record
      const latestRecord = studentRecords.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]

      return {
        id: student.id,
        name: student.full_name || 'Unknown Student',
        avatarUrl: student.avatar_url,
        isPresent: latestRecord?.is_present ?? null,
        hasHomeworkIncomplete: latestRecord?.has_homework_incomplete ?? false,
        wasSentOut: latestRecord?.was_sent_out ?? false,
        wasTooLate: latestRecord?.was_too_late ?? false,
        note: latestRecord?.note,
        noteCreatedAt: latestRecord?.created_at,
        notedBy: latestRecord?.noted_by,
        stats: {
          totalAbsent: absentCount,
          totalHomeworkIncomplete: homeworkIncompleteCount,
          totalSentOut: sentOutCount,
          totalTooLate: tooLateCount
        }
      }
    })

    return NextResponse.json({
      classId,
      students: studentsWithAttendance,
      totalStudents: studentsWithAttendance.length
    })

  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json({ error: 'Internal server error: ' + String(error) }, { status: 500 })
  }
}

// POST - Update attendance for a student
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
          remove(name: string, options: any) { cookieStore.set(name, '', { ...options, maxAge: 0 }) }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { classId } = resolvedParams

    // Check if user is owner or teacher
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('owner_id')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const isOwner = classData.owner_id === user.id
    
    // Get user's subscription_type to check if they're a teacher
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .single()

    const isTeacher = userProfile?.subscription_type === 'teacher'
    
    // Owner can always view/update, teachers can view/update
    const canAccess = isOwner || isTeacher
    
    if (!canAccess) {
      return NextResponse.json({ error: 'Only teachers can update attendance' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      studentId, 
      isPresent, 
      hasHomeworkIncomplete, 
      wasSentOut, 
      wasTooLate,
      note 
    } = body

    // Create new attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from('student_attendance')
      .insert({
        student_id: studentId,
        class_id: classId,
        is_present: isPresent,
        has_homework_incomplete: hasHomeworkIncomplete || false,
        was_sent_out: wasSentOut || false,
        was_too_late: wasTooLate || false,
        note: note || null,
        noted_by: note ? user.id : null,
        created_by: user.id
      })
      .select()
      .single()

    if (attendanceError) {
      return NextResponse.json({ error: attendanceError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, attendance })

  } catch (error) {
    console.error('Error updating attendance:', error)
    return NextResponse.json({ error: 'Internal server error: ' + String(error) }, { status: 500 })
  }
}
