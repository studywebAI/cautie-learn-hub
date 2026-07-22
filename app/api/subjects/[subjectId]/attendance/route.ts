import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSubjectPermission } from '@/lib/auth/subject-permissions'
import { logAuditEntry } from '@/lib/auth/class-permissions'

// Mirrors app/api/classes/[classId]/attendance/route.ts, keyed on
// subject_id instead of class_id -- roster comes from subject_students
// instead of class_members. Phase 2.7, attendance subject-first.

function studentDisplayName(
  profileDisplayName: string | null | undefined,
  fullName: string | null | undefined,
) {
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

// GET - Fetch all students with their attendance records for a subject
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await getSubjectPermission(supabase as any, subjectId, user.id)
    if (!perm.hasAccess) return NextResponse.json({ error: 'Only subject teachers can view attendance' }, { status: 403 })

    let dataClient: any = supabase
    try { dataClient = createAdminClient() } catch { dataClient = supabase }

    const { data: subjectStudents, error: studentsError } = await dataClient
      .from('subject_students')
      .select('student_id')
      .eq('subject_id', subjectId)

    if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 })

    const studentIds = (subjectStudents || []).map((row: any) => String(row?.student_id || '').trim()).filter(Boolean)

    let profilesData: any[] = []
    if (studentIds.length > 0) {
      const { data: profiles, error: profilesFetchError } = await dataClient
        .from('profiles')
        .select('id, display_name, full_name, email')
        .in('id', studentIds)
      if (profilesFetchError) return NextResponse.json({ error: profilesFetchError.message }, { status: 500 })
      profilesData = profiles || []
    }
    const profileById = new Map(profilesData.map((p: any) => [p.id, p]))

    let auditLogs: any[] = []
    if (studentIds.length > 0) {
      const studentSet = new Set(studentIds)
      const { data: logsData, error: logsError } = await dataClient
        .from('audit_logs')
        .select('id, user_id, action, entity_type, entity_id, metadata, created_at')
        .eq('metadata->>subject_id', subjectId)
        .order('created_at', { ascending: false })
        .limit(250)
      if (!logsError) {
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
        .eq('subject_id', subjectId)
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(Math.max(studentIds.length * 6, 300))
      if (attendanceError) return NextResponse.json({ error: attendanceError.message }, { status: 500 })
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
        latestRecord: null, totalAbsent: 0, totalHomeworkIncomplete: 0, totalTooLate: 0,
      })
    }
    for (const record of attendanceRecords) {
      const studentId = String(record?.student_id || '')
      if (!studentId) continue
      const summary = attendanceSummaryByStudentId.get(studentId)
      if (!summary) continue
      if (!summary.latestRecord) summary.latestRecord = record
      if (record?.is_present === false) summary.totalAbsent += 1
      if (record?.has_homework_incomplete === true) summary.totalHomeworkIncomplete += 1
      if (record?.was_too_late === true) summary.totalTooLate += 1
    }

    const studentsWithAttendance = studentIds.map((studentId: string) => {
      const student = (profileById.get(studentId) || null) as any
      const attendanceSummary = attendanceSummaryByStudentId.get(studentId)
      const latestRecord = attendanceSummary?.latestRecord || null

      const recentActivity = auditLogs
        .filter((log: any) => {
          const actorId = String(log?.user_id || '')
          const targetId = String(log?.metadata?.student_id || '')
          const touchesStudent = actorId === studentId || targetId === studentId
          return touchesStudent && isAttendanceTimelineAction(log)
        })
        .slice(0, 12)
        .map((log: any) => {
          const actorProfile = profileById.get(String(log.user_id || ''))
          return {
            id: log.id,
            action: log.action,
            entityType: log.entity_type,
            entityId: log.entity_id,
            details: {
              ...(log.metadata || {}),
              actor_name: actorDisplayName(actorProfile?.display_name, actorProfile?.full_name, actorProfile?.email, String(log.user_id || '')),
            },
            createdAt: log.created_at,
          }
        })

      return {
        id: studentId,
        name: studentDisplayName(student?.display_name, student?.full_name),
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
      subjectId,
      students: studentsWithAttendance,
      totalStudents: studentsWithAttendance.length,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + String(error) }, { status: 500 })
  }
}

// POST - Update attendance for a student
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await getSubjectPermission(supabase as any, subjectId, user.id)
    if (!perm.hasAccess) return NextResponse.json({ error: 'Only subject teachers can update attendance' }, { status: 403 })

    const body = await request.json()
    const { studentId, isPresent, hasHomeworkIncomplete, wasTooLate, customMessage, logCustomEvent } = body

    if (!studentId) return NextResponse.json({ error: 'studentId is required' }, { status: 400 })

    const normalizedCustomMessage = typeof customMessage === 'string' ? customMessage.trim() : ''
    const shouldLogCustomEvent = logCustomEvent !== false
    const nextIsPresent = typeof isPresent === 'boolean' ? isPresent : true
    const nextHomeworkIncomplete = Boolean(hasHomeworkIncomplete)
    const nextWasTooLate = Boolean(wasTooLate)
    const attendanceChangeGroupId = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

    let writeClient: any = supabase
    try { writeClient = createAdminClient() } catch { writeClient = supabase }

    const { data: targetStudent, error: studentError } = await writeClient
      .from('subject_students')
      .select('student_id')
      .eq('subject_id', subjectId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 })
    if (!targetStudent) return NextResponse.json({ error: 'Target student is not in this subject' }, { status: 400 })

    const { data: latestAttendanceRecord } = await writeClient
      .from('student_attendance')
      .select('id, is_present, has_homework_incomplete, was_too_late, created_at')
      .eq('subject_id', subjectId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const previousIsPresent = typeof latestAttendanceRecord?.is_present === 'boolean' ? latestAttendanceRecord.is_present : null
    const previousHomeworkIncomplete = typeof latestAttendanceRecord?.has_homework_incomplete === 'boolean' ? latestAttendanceRecord.has_homework_incomplete : null
    const previousTooLate = typeof latestAttendanceRecord?.was_too_late === 'boolean' ? latestAttendanceRecord.was_too_late : null
    const isPresentChanged = previousIsPresent === null || previousIsPresent !== nextIsPresent
    const homeworkChanged = previousHomeworkIncomplete === null ? nextHomeworkIncomplete : previousHomeworkIncomplete !== nextHomeworkIncomplete
    const tooLateChanged = previousTooLate === null ? nextWasTooLate : previousTooLate !== nextWasTooLate
    const hasNoStateChange = !isPresentChanged && !homeworkChanged && !tooLateChanged

    if (hasNoStateChange && !normalizedCustomMessage) {
      return NextResponse.json({ success: true, noop: true, attendance: latestAttendanceRecord })
    }

    const { data: attendance, error: attendanceError } = await writeClient
      .from('student_attendance')
      .insert({
        student_id: studentId,
        class_id: null,
        subject_id: subjectId,
        is_present: nextIsPresent,
        has_homework_incomplete: nextHomeworkIncomplete,
        was_sent_out: false,
        was_too_late: nextWasTooLate,
        created_by: user.id,
      })
      .select()
      .single()

    if (attendanceError) return NextResponse.json({ error: attendanceError.message }, { status: 500 })

    if (isPresentChanged) {
      await logAuditEntry(writeClient as any, {
        userId: user.id,
        action: 'attendance_state_changed',
        entityType: 'attendance',
        entityId: attendance?.id,
        metadata: {
          log_code: 'EVT-ATT-001', log_category: 'events', subject_id: subjectId, student_id: studentId,
          from_is_present: previousIsPresent, to_is_present: nextIsPresent,
          attendance_change_group_id: attendanceChangeGroupId, created_by: user.id,
        },
      })
    }
    if (homeworkChanged) {
      await logAuditEntry(writeClient as any, {
        userId: user.id,
        action: 'attendance_event_homework_incomplete',
        entityType: 'attendance',
        entityId: attendance?.id,
        metadata: {
          log_code: 'EVT-ATT-002', log_category: 'events', subject_id: subjectId, student_id: studentId,
          from_active: previousHomeworkIncomplete, to_active: nextHomeworkIncomplete,
          attendance_change_group_id: attendanceChangeGroupId, created_by: user.id,
        },
      })
    }
    if (tooLateChanged) {
      await logAuditEntry(writeClient as any, {
        userId: user.id,
        action: 'attendance_event_late',
        entityType: 'attendance',
        entityId: attendance?.id,
        metadata: {
          log_code: 'EVT-ATT-003', log_category: 'events', subject_id: subjectId, student_id: studentId,
          from_active: previousTooLate, to_active: nextWasTooLate,
          attendance_change_group_id: attendanceChangeGroupId, created_by: user.id,
        },
      })
    }
    if (normalizedCustomMessage && shouldLogCustomEvent) {
      await logAuditEntry(writeClient as any, {
        userId: user.id,
        action: 'attendance_event_custom',
        entityType: 'attendance',
        entityId: attendance?.id,
        metadata: {
          log_code: 'EVT-CUS-001', log_category: 'custom_events', subject_id: subjectId, student_id: studentId,
          custom_message: normalizedCustomMessage,
          attendance_change_group_id: attendanceChangeGroupId, created_by: user.id,
        },
      })
    }

    return NextResponse.json({ success: true, attendance })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + String(error) }, { status: 500 })
  }
}
