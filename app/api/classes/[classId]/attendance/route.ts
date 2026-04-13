import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getClassPermission } from '@/lib/auth/class-permissions'
import { logAuditEntry } from '@/lib/auth/class-permissions'

function logAttendance(...args: any[]) {
  console.log('[CLASS_ATTENDANCE]', ...args)
}

function displayName(fullName: string | null | undefined, email: string | null | undefined, userId: string) {
  if (fullName && fullName.trim()) return fullName
  if (email && email.includes('@')) return email.split('@')[0]
  return `user-${userId.slice(0, 8)}`
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

    const perm = await getClassPermission(supabase as any, classId, user.id)
    const canAccess = perm.isMember && perm.isTeacher
    
    if (!canAccess) {
      logAttendance('GET - Forbidden', { classId, userId: user.id, classRole: perm.classRole })
      return NextResponse.json({ error: 'Only teachers can view attendance' }, { status: 403 })
    }

    // Get all students in the class - use subscription_type from profiles (global role)
    // First get all class members
    const { data: classMembers, error: membersError } = await supabase
      .from('class_members')
      .select('user_id, role')
      .eq('class_id', classId)

    logAttendance('GET - Class members', { classId, count: classMembers?.length, membersError: membersError?.message })

    const memberRows = classMembers || []
    const memberUserIds = memberRows.map((m: any) => m.user_id)
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
    const studentIds = memberRows
      .filter((row: any) => {
        const role = String(row?.role || '').toLowerCase()
        if (!role) return true
        return role === 'student'
      })
      .map((row: any) => row.user_id)

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
        name: displayName(student?.full_name, student?.email, studentId),
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

    const perm = await getClassPermission(supabase as any, classId, user.id)
    const canAccess = perm.isMember && perm.isTeacher
    
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
      note,
      customMessage
    } = body

    const normalizedNote = typeof note === 'string' ? note.trim() : ''
    const normalizedCustomMessage = typeof customMessage === 'string' ? customMessage.trim() : ''
    const nextIsPresent = typeof isPresent === 'boolean' ? isPresent : true
    const nextHomeworkIncomplete = Boolean(hasHomeworkIncomplete)
    const nextWasSentOut = Boolean(wasSentOut)
    const nextWasTooLate = Boolean(wasTooLate)

    // Create new attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from('student_attendance')
      .insert({
        student_id: studentId,
        class_id: classId,
        is_present: nextIsPresent,
        has_homework_incomplete: nextHomeworkIncomplete,
        was_sent_out: nextWasSentOut,
        was_too_late: nextWasTooLate,
        note: normalizedNote || normalizedCustomMessage || null,
        noted_by: normalizedNote || normalizedCustomMessage ? user.id : null,
        created_by: user.id
      })
      .select()
      .single()

    if (attendanceError) {
      return NextResponse.json({ error: attendanceError.message }, { status: 500 })
    }

    const attendanceAction = nextIsPresent ? 'attendance_mark_present' : 'attendance_mark_absent'
    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: attendanceAction,
      entityType: 'attendance',
      entityId: attendance?.id,
      metadata: {
        student_id: studentId,
        created_by: user.id,
      },
    })

    if (nextHomeworkIncomplete) {
      await logAuditEntry(supabase as any, {
        userId: user.id,
        classId,
        action: 'attendance_event_homework_incomplete',
        entityType: 'attendance',
        entityId: attendance?.id,
        metadata: {
          student_id: studentId,
          created_by: user.id,
        },
      })
    }

    if (nextWasTooLate) {
      await logAuditEntry(supabase as any, {
        userId: user.id,
        classId,
        action: 'attendance_event_late',
        entityType: 'attendance',
        entityId: attendance?.id,
        metadata: {
          student_id: studentId,
          created_by: user.id,
        },
      })
    }

    if (normalizedCustomMessage) {
      await logAuditEntry(supabase as any, {
        userId: user.id,
        classId,
        action: 'attendance_event_custom',
        entityType: 'attendance',
        entityId: attendance?.id,
        metadata: {
          student_id: studentId,
          custom_message: normalizedCustomMessage,
          created_by: user.id,
        },
      })
    }

    if (normalizedNote) {
      await logAuditEntry(supabase as any, {
        userId: user.id,
        classId,
        action: 'attendance_note_saved',
        entityType: 'attendance_note',
        entityId: attendance?.id,
        metadata: {
          student_id: studentId,
          note: normalizedNote,
          created_by: user.id,
        },
      })
    }

    return NextResponse.json({ success: true, attendance })

  } catch (error) {
    console.error('Error updating attendance:', error)
    return NextResponse.json({ error: 'Internal server error: ' + String(error) }, { status: 500 })
  }
}
