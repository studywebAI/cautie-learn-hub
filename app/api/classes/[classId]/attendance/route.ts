import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function logAttendance(...args: any[]) {
  console.log('[CLASS_ATTENDANCE]', ...args)
}

// GET - Fetch all students with their attendance records for a class
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const resolvedParams = await params
    const { classId } = resolvedParams
    logAttendance('GET - Start', { classId })
    
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    logAttendance('GET - User', { userId: user?.id, authError: authError?.message })

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a teacher via class_members + subscription_type
    // (owner_id column was removed - all teachers are now equal via class_members)
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .single()

    if (profileError) {
      logAttendance('GET - User profile failed', { classId, userId: user.id, profileError: profileError.message })
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const isTeacher = userProfile?.subscription_type === 'teacher'
    
    // Also check if user is a member of this class
    const { data: classMember, error: memberCheckError } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle()

    // Teachers who are members of the class can access
    const canAccess = isTeacher && classMember
    
    if (!canAccess) {
      logAttendance('GET - Forbidden', { classId, userId: user.id, memberCheckError: memberCheckError?.message })
      return NextResponse.json({ error: 'Only teachers can view attendance' }, { status: 403 })
    }

    // Get all students in the class - use subscription_type from profiles (global role)
    // First get all class members
    const { data: classMembers, error: membersError } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)

    logAttendance('GET - Class members', { classId, count: classMembers?.length, membersError: membersError?.message })

    const memberUserIds = (classMembers || []).map(m => m.user_id)
    let profilesData: any[] = []
    if (memberUserIds.length > 0) {
      const { data: profiles, error: profilesFetchError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, subscription_type')
        .in('id', memberUserIds)

      if (profilesFetchError) {
        logAttendance('GET - Members profile fetch failed', { classId, profilesFetchError: profilesFetchError.message })
        return NextResponse.json({ error: profilesFetchError.message }, { status: 500 })
      }
      profilesData = profiles || []
    }

    if (membersError) {
      logAttendance('GET - Error fetching class members', { classId, membersError: membersError.message })
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    const profileById = new Map(profilesData.map((p: any) => [p.id, p]))
    // Treat unknown profile role as student so missing profiles don't hide members.
    const studentIds = memberUserIds.filter((id: string) => profileById.get(id)?.subscription_type !== 'teacher')

    // Get attendance records for all students
    let attendanceRecords = []
    if (studentIds.length > 0) {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('class_id', classId)
        .in('student_id', studentIds)
      
      if (attendanceError) {
        logAttendance('GET - Attendance records failed', { classId, attendanceError: attendanceError.message })
        return NextResponse.json({ error: attendanceError.message }, { status: 500 })
      }
      attendanceRecords = attendanceData || []
    }

    // Calculate stats per student
    const studentsWithAttendance = studentIds.map((studentId: string) => {
      const student = profileById.get(studentId)
      const studentRecords = attendanceRecords.filter((r: any) => r.student_id === studentId)
      
      const absentCount = studentRecords.filter((r: any) => r.is_present === false).length
      const homeworkIncompleteCount = studentRecords.filter((r: any) => r.has_homework_incomplete === true).length
      const sentOutCount = studentRecords.filter((r: any) => r.was_sent_out === true).length
      const tooLateCount = studentRecords.filter((r: any) => r.was_too_late === true).length
      
      // Get the latest record
      const latestRecord = studentRecords.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]

      return {
        id: studentId,
        name: student?.full_name || 'Unknown Student',
        email: student?.email || null,
        avatarUrl: student?.avatar_url || null,
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
    }).sort((a: any, b: any) => a.name.localeCompare(b.name))

    return NextResponse.json({
      classId,
      students: studentsWithAttendance,
      totalStudents: studentsWithAttendance.length
    })

  } catch (error) {
    logAttendance('GET - Unexpected error', { error: String(error) })
    return NextResponse.json({ error: 'Internal server error: ' + String(error) }, { status: 500 })
  }
}

// POST - Update attendance for a student
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { classId } = resolvedParams

    // Check if user is a teacher via class_members + subscription_type
    // (owner_id column was removed - all teachers are now equal via class_members)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .single()

    const isTeacher = userProfile?.subscription_type === 'teacher'
    
    // Also check if user is a member of this class
    const { data: classMember } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle()

    // Teachers who are members of the class can access
    const canAccess = isTeacher && classMember
    
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
