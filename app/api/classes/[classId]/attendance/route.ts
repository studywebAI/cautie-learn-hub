import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

function isAttendanceTimelineAction(log: any) {
  const action = String(log?.action || '')
  if (action === 'attendance_state_changed') return true
  if (action === 'attendance_event_homework_incomplete') return true
  if (action === 'attendance_event_late') return true
  if (action === 'attendance_event_custom') return true
  const logCategory = String(log?.metadata?.log_category || '').toLowerCase()
  if (logCategory === 'events' || logCategory === 'custom_events') return true
  return false
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

    let dataClient: any = supabase
    try {
      dataClient = createAdminClient()
    } catch {
      dataClient = supabase
    }

    const { data: classMembers, error: membersError } = await dataClient
      .from('class_members')
      .select('user_id, role, display_name')
      .eq('class_id', classId)

    logAttendance('GET - Class members', { classId, count: classMembers?.length, membersError: membersError?.message })

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    const memberRows = classMembers || []
    const memberUserIds = memberRows
      .map((member: any) => String(member?.user_id || '').trim())
      .filter((id: string) => id.length > 0)
    let profilesData: any[] = []
    if (memberUserIds.length > 0) {
      const { data: profiles, error: profilesFetchError } = await dataClient
        .from('profiles')
        .select('id, display_name, full_name, email, subscription_type')
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
        if (role) return !teacherRoles.has(role)
        const profileRole = String(profileById.get(row.user_id)?.subscription_type || '').toLowerCase()
        return profileRole !== 'teacher'
      })
      .map((row: any) => row.user_id)

    let auditLogs: any[] = []
    if (studentIds.length > 0) {
      const studentSet = new Set(studentIds)
      const { data: logsData, error: logsError } = await dataClient
        .from('audit_logs')
        .select('id, user_id, action, entity_type, entity_id, metadata, created_at')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(250)
      if (logsError) {
        logAttendance('GET - audit logs failed (non-fatal)', { classId, logsError: logsError.message })
      } else {
        auditLogs = (logsData || []).filter((log: any) => {
          const actorId = String(log?.user_id || '')
          const targetId = String(log?.metadata?.student_id || '')
          return studentSet.has(actorId) || studentSet.has(targetId)
        })
      }
    }

    let attendanceRecords: any[] = []
    if (studentIds.length > 0) {
      const { data: attendanceData, error: attendanceError } = await dataClient
        .from('student_attendance')
        .select('id, student_id, is_present, has_homework_incomplete, was_too_late, created_at')
        .eq('class_id', classId)
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(Math.max(studentIds.length * 6, 300))

      if (attendanceError) {
        logAttendance('GET - Attendance records failed', { classId, attendanceError: attendanceError.message })
        return NextResponse.json({ error: attendanceError.message }, { status: 500 })
      }
      attendanceRecords = attendanceData || []
    }

    const attendanceSummaryByStudentId = new Map<string, {
      latestRecord: any | null
      totalAbsent: number
      totalHomeworkIncomplete: number
      totalTooLate: number
    }>()
    for (const studentId of studentIds) {
      attendanceSummaryByStudentId.set(studentId, {
        latestRecord: null,
        totalAbsent: 0,
        totalHomeworkIncomplete: 0,
        totalTooLate: 0,
      })
    }
    for (const record of attendanceRecords) {
      const studentId = String(record?.student_id || '')
      if (!studentId) continue
      const summary = attendanceSummaryByStudentId.get(studentId)
      if (!summary) continue
      if (!summary.latestRecord) {
        summary.latestRecord = record
      }
      if (record?.is_present === false) summary.totalAbsent += 1
      if (record?.has_homework_incomplete === true) summary.totalHomeworkIncomplete += 1
      if (record?.was_too_late === true) summary.totalTooLate += 1
    }

    const studentsWithAttendance = studentIds.map((studentId: string) => {
      const student = (profileById.get(studentId) || null) as any
      const classMember = (memberById.get(studentId) || null) as any
      const attendanceSummary = attendanceSummaryByStudentId.get(studentId)
      const latestRecord = attendanceSummary?.latestRecord || null

      const recentActivity = mapRecentActivity(
        auditLogs
          .filter((log: any) => {
            const actorId = String(log?.user_id || '')
            const targetId = String(log?.metadata?.student_id || '')
            const touchesStudent = actorId === studentId || targetId === studentId
            if (!touchesStudent) return false
            return isAttendanceTimelineAction(log)
          })
          .slice(0, 12)
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
        email: student?.email || 'Guest',
        isPresent: latestRecord?.is_present ?? null,
        hasHomeworkIncomplete: latestRecord?.has_homework_incomplete ?? false,
        wasTooLate: latestRecord?.was_too_late ?? false,
        recentActivity,
        stats: {
          totalAbsent: attendanceSummary?.totalAbsent || 0,
          totalHomeworkIncomplete: attendanceSummary?.totalHomeworkIncomplete || 0,
          totalTooLate: attendanceSummary?.totalTooLate || 0,
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
      logCustomEvent,
    } = body

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }

    const normalizedCustomMessage = typeof customMessage === 'string' ? customMessage.trim() : ''
    const shouldLogCustomEvent = logCustomEvent !== false
    const nextIsPresent = typeof isPresent === 'boolean' ? isPresent : true
    const nextHomeworkIncomplete = Boolean(hasHomeworkIncomplete)
    const nextWasTooLate = Boolean(wasTooLate)

    let writeClient: any = supabase
    try {
      writeClient = createAdminClient()
    } catch {
      writeClient = supabase
    }

    const { data: latestAttendanceRecord } = await writeClient
      .from('student_attendance')
      .select('id, is_present, has_homework_incomplete, was_too_late, created_at')
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const previousIsPresent =
      typeof latestAttendanceRecord?.is_present === 'boolean'
        ? latestAttendanceRecord.is_present
        : null
    const previousHomeworkIncomplete =
      typeof latestAttendanceRecord?.has_homework_incomplete === 'boolean'
        ? latestAttendanceRecord.has_homework_incomplete
        : null
    const previousTooLate =
      typeof latestAttendanceRecord?.was_too_late === 'boolean'
        ? latestAttendanceRecord.was_too_late
        : null
    const isPresentChanged = previousIsPresent === null || previousIsPresent !== nextIsPresent
    const homeworkChanged =
      previousHomeworkIncomplete === null
        ? nextHomeworkIncomplete
        : previousHomeworkIncomplete !== nextHomeworkIncomplete
    const tooLateChanged =
      previousTooLate === null
        ? nextWasTooLate
        : previousTooLate !== nextWasTooLate
    const hasNoStateChange = !isPresentChanged && !homeworkChanged && !tooLateChanged

    if (hasNoStateChange && !normalizedCustomMessage) {
      return NextResponse.json({ success: true, noop: true, attendance: latestAttendanceRecord })
    }

    const { data: attendance, error: attendanceError } = await writeClient
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

    if (isPresentChanged) {
      await logAuditEntry(writeClient as any, {
        userId: user.id,
        classId,
        action: 'attendance_state_changed',
        entityType: 'attendance',
        entityId: attendance?.id,
        metadata: {
          log_code: 'EVT-ATT-001',
          log_category: 'events',
          student_id: studentId,
          from_is_present: previousIsPresent,
          to_is_present: nextIsPresent,
          created_by: user.id,
        },
      })
    }

    if (homeworkChanged) {
      await logAuditEntry(writeClient as any, {
        userId: user.id,
        classId,
        action: 'attendance_event_homework_incomplete',
        entityType: 'attendance',
        entityId: attendance?.id,
        metadata: {
          log_code: 'EVT-ATT-002',
          log_category: 'events',
          student_id: studentId,
          from_active: previousHomeworkIncomplete,
          to_active: nextHomeworkIncomplete,
          created_by: user.id,
        },
      })
    }

    if (tooLateChanged) {
      await logAuditEntry(writeClient as any, {
        userId: user.id,
        classId,
        action: 'attendance_event_late',
        entityType: 'attendance',
        entityId: attendance?.id,
        metadata: {
          log_code: 'EVT-ATT-003',
          log_category: 'events',
          student_id: studentId,
          from_active: previousTooLate,
          to_active: nextWasTooLate,
          created_by: user.id,
        },
      })
    }

    if (normalizedCustomMessage && shouldLogCustomEvent) {
      await logAuditEntry(writeClient as any, {
        userId: user.id,
        classId,
        action: 'attendance_event_custom',
        entityType: 'attendance',
        entityId: attendance?.id,
        metadata: {
          log_code: 'EVT-CUS-001',
          log_category: 'custom_events',
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
