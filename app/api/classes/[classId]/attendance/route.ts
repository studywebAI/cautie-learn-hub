import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions'

function logAttendance(...args: any[]) {
  console.log('[CLASS_ATTENDANCE]', ...args)
}

function studentDisplayName(
  classAlias: string | null | undefined,
  profileDisplayName: string | null | undefined,
  fullName: string | null | undefined,
) {
  const alias = String(classAlias || '').trim()
  if (alias) return alias
  const displayName = String(profileDisplayName || '').trim()
  if (displayName) return displayName
  const name = String(fullName || '').trim()
  if (name) return name
  return 'Unnamed student'
}

function actorDisplayName(
  profileDisplayName: string | null | undefined,
  fullName: string | null | undefined,
  email: string | null | undefined,
  userId: string,
) {
  const displayName = String(profileDisplayName || '').trim()
  if (displayName) return displayName
  const name = String(fullName || '').trim()
  if (name) return name
  const emailValue = String(email || '').trim()
  if (emailValue) return emailValue
  return `user-${userId.slice(0, 8)}`
}

function mapRecentActivity(logs: any[]) {
  return (logs || []).map((log: any) => ({
    id: log.id,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    details: log.metadata || {},
    createdAt: log.created_at,
  }))
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

    const { data: classMembers, error: membersError } = await supabase
      .from('class_members')
      .select('user_id, role, display_name')
      .eq('class_id', classId)

    logAttendance('GET - Class members', { classId, count: classMembers?.length, membersError: membersError?.message })

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    const memberRows = classMembers || []
    const memberUserIds = memberRows.map((m: any) => m.user_id)
    let profilesData: any[] = []
    if (memberUserIds.length > 0) {
      const { data: profiles, error: profilesFetchError } = await supabase
        .from('profiles')
        .select('id, display_name, full_name, avatar_url, email, subscription_type')
        .in('id', memberUserIds)

      if (profilesFetchError) {
        logAttendance('GET - Members profile fetch failed', { classId, profilesFetchError: profilesFetchError.message })
        return NextResponse.json({ error: profilesFetchError.message }, { status: 500 })
      }
      profilesData = profiles || []
    }

    const profileById = new Map(profilesData.map((p: any) => [p.id, p]))
    const memberById = new Map(memberRows.map((m: any) => [m.user_id, m]))
    const teacherRoles = new Set(['teacher', 'owner', 'admin', 'creator', 'ta'])

    const studentIds = memberRows
      .filter((row: any) => {
        const role = String(row?.role || '').toLowerCase()
        if (role) return role === 'student'
        const profileRole = String(profileById.get(row.user_id)?.subscription_type || '').toLowerCase()
        return profileRole !== 'teacher'
      })
      .map((row: any) => row.user_id)

    let auditLogs: any[] = []
    if (studentIds.length > 0) {
      const studentOrFilters = studentIds
        .flatMap((studentId: string) => [`user_id.eq.${studentId}`, `metadata->>student_id.eq.${studentId}`])
        .join(',')
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('id, user_id, action, entity_type, entity_id, metadata, created_at')
        .eq('class_id', classId)
        .or(studentOrFilters)
        .order('created_at', { ascending: false })
        .limit(300)
      if (logsError) {
        logAttendance('GET - audit logs failed (non-fatal)', { classId, logsError: logsError.message })
      } else {
        auditLogs = logsData || []
      }
    }

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

    const studentsWithAttendance = studentIds.map((studentId: string) => {
      const student = profileById.get(studentId)
      const classMember = memberById.get(studentId)
      const studentRecords = attendanceRecords.filter((r: any) => r.student_id === studentId)

      const absentCount = studentRecords.filter((r: any) => r.is_present === false).length
      const homeworkIncompleteCount = studentRecords.filter((r: any) => r.has_homework_incomplete === true).length
      const tooLateCount = studentRecords.filter((r: any) => r.was_too_late === true).length

      const latestRecord = studentRecords.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]

      const recentActivity = mapRecentActivity(
        auditLogs
          .filter((log: any) => {
            const actorId = String(log?.user_id || '')
            const targetId = String(log?.metadata?.student_id || '')
            return actorId === studentId || targetId === studentId
          })
          .slice(0, 8)
          .map((log: any) => {
            const actorProfile = profileById.get(String(log.user_id || ''))
            return {
              ...log,
              metadata: {
                ...(log.metadata || {}),
                actor_name: actorDisplayName(
                  actorProfile?.display_name,
                  actorProfile?.full_name,
                  actorProfile?.email,
                  String(log.user_id || ''),
                ),
              },
            }
          })
      )

      return {
        id: studentId,
        name: studentDisplayName(classMember?.display_name, student?.display_name, student?.full_name),
        email: student?.email || null,
        avatarUrl: student?.avatar_url || null,
        isPresent: latestRecord?.is_present ?? null,
        hasHomeworkIncomplete: latestRecord?.has_homework_incomplete ?? false,
        wasTooLate: latestRecord?.was_too_late ?? false,
        recentActivity,
        stats: {
          totalAbsent: absentCount,
          totalHomeworkIncomplete: homeworkIncompleteCount,
          totalTooLate: tooLateCount,
        },
      }
    }).sort((a: any, b: any) => a.name.localeCompare(b.name))

    return NextResponse.json({
      classId,
      students: studentsWithAttendance,
      totalStudents: studentsWithAttendance.length,
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
      wasTooLate,
      customMessage,
    } = body

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }

    const normalizedCustomMessage = typeof customMessage === 'string' ? customMessage.trim() : ''
    const nextIsPresent = typeof isPresent === 'boolean' ? isPresent : true
    const nextHomeworkIncomplete = Boolean(hasHomeworkIncomplete)
    const nextWasTooLate = Boolean(wasTooLate)

    const { data: attendance, error: attendanceError } = await supabase
      .from('student_attendance')
      .insert({
        student_id: studentId,
        class_id: classId,
        is_present: nextIsPresent,
        has_homework_incomplete: nextHomeworkIncomplete,
        was_sent_out: false,
        was_too_late: nextWasTooLate,
        created_by: user.id,
      })
      .select()
      .single()

    if (attendanceError) {
      return NextResponse.json({ error: attendanceError.message }, { status: 500 })
    }

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: 'attendance_state_changed',
      entityType: 'attendance',
      entityId: attendance?.id,
      metadata: {
        student_id: studentId,
        is_present: nextIsPresent,
        has_homework_incomplete: nextHomeworkIncomplete,
        was_too_late: nextWasTooLate,
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
          active: true,
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
          active: true,
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

    return NextResponse.json({ success: true, attendance })
  } catch (error) {
    console.error('Error updating attendance:', error)
    return NextResponse.json({ error: 'Internal server error: ' + String(error) }, { status: 500 })
  }
}
