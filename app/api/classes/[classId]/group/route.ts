import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function logGroup(...args: any[]) {
  console.log('[CLASS_GROUP]', ...args)
}

function displayName(fullName: string | null | undefined, email: string | null | undefined, userId: string) {
  if (fullName && fullName.trim()) return fullName
  if (email && email.includes('@')) return email.split('@')[0]
  return `user-${userId.slice(0, 8)}`
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logGroup('GET - Auth failed', { authError: authError?.message })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { classId } = resolvedParams

    // Check if user is a member of the class
    const { data: classMember, error: memberError } = await supabase
      .from('class_members')
      .select('user_id, role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle()

    // Also check if class exists
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      logGroup('GET - Class not found', { classId, classError: classError?.message })
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Allow access if member
    if (!classMember) {
      logGroup('GET - Member denied', { classId, userId: user.id, memberError: memberError?.message })
      return NextResponse.json({ error: 'Not a member of this class' }, { status: 403 })
    }

    // Read class roster data through admin client when available to avoid
    // RLS edge cases where members can only see their own row.
    let dataClient: any = supabase
    try {
      dataClient = createAdminClient()
    } catch {
      dataClient = supabase
    }

    // Get all class members (students and teachers)
    const { data: classMembers, error: membersError } = await dataClient
      .from('class_members')
      .select('user_id, role')
      .eq('class_id', classId)

    if (membersError) {
      logGroup('GET - class_members failed', { classId, membersError: membersError.message })
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    const allUserIds = (classMembers || []).map((m: { user_id: string }) => m.user_id)
    
    // Get profiles for all members to determine their subscription_type (teacher/student)
    let profiles: any[] = []
    let subscriptionTypes: Record<string, string> = {}
    
    if (allUserIds.length > 0) {
      const { data: profilesData, error: profilesError } = await dataClient
        .from('profiles')
        .select('id, full_name, avatar_url, email, last_seen, subscription_type')
        .in('id', allUserIds)
      
      if (profilesError) {
        logGroup('GET - profiles failed', { classId, profilesError: profilesError.message })
        return NextResponse.json({ error: profilesError.message }, { status: 500 })
      }
      profiles = profilesData || []
      
    // Build subscription_type lookup
      profiles.forEach(p => {
        subscriptionTypes[p.id] = p.subscription_type || 'student'
      })
    }

    const teacherRoles = new Set(['teacher', 'owner', 'admin', 'creator', 'ta'])
    const memberRoleByUserId = new Map(
      (classMembers || []).map((m: any) => [m.user_id, String(m.role || '').toLowerCase()])
    )
    const teacherIds = allUserIds.filter((uid: string) => {
      const classRole = memberRoleByUserId.get(uid) || ''
      if (teacherRoles.has(classRole)) return true
      return subscriptionTypes[uid] === 'teacher'
    })
    const studentIds = allUserIds.filter((uid: string) => !teacherIds.includes(uid))

    // Get all assignments for the class
    const { data: assignments, error: assignmentsError } = await dataClient
      .from('assignments')
      .select('id, title, due_date, created_at, class_id')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })

    if (assignmentsError) {
      return NextResponse.json({ error: assignmentsError.message }, { status: 500 })
    }

    const assignmentIds = (assignments || []).map((a: { id: string }) => a.id)

    // Get submissions for these assignments. Do not fail the whole endpoint
    // if this optional dataset is unavailable.
    let submissions: any[] = []
    if (assignmentIds.length > 0 && studentIds.length > 0) {
      const { data: submissionsData, error: submissionsError } = await dataClient
        .from('submissions')
        .select('id, assignment_id, user_id, status, grade, submitted_at, created_at')
        .in('assignment_id', assignmentIds)
        .in('user_id', studentIds)
      
      if (submissionsError) {
        logGroup('GET - submissions failed (non-fatal)', {
          classId,
          submissionsError: submissionsError.message,
        })
      } else {
        submissions = submissionsData || []
      }
    }

    // Get recent audit logs for this class, then derive per-student activity.
    // This captures both direct student actions and teacher-created events
    // targeted at a student via metadata.student_id.
    let auditLogs: any[] = []
    if (studentIds.length > 0) {
      const { data: logsData, error: logsError } = await dataClient
        .from('audit_logs')
        .select('id, user_id, action, entity_type, entity_id, changes, metadata, created_at')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(250)
      
      if (logsError) {
        logGroup('GET - audit_logs failed (non-fatal)', {
          classId,
          logsError: logsError.message,
        })
      } else {
        const studentIdSet = new Set(studentIds)
        auditLogs = (logsData || []).filter((log: any) => {
          const actorUserId = String(log?.user_id || '')
          const affectedStudentId = String(log?.metadata?.student_id || '')
          return studentIdSet.has(actorUserId) || studentIdSet.has(affectedStudentId)
        })
      }
    }

    // Calculate online status (consider online if last_seen is within 5 minutes)
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    const getOnlineStatus = (lastSeen: string | null) => {
      if (!lastSeen) return 'offline'
      const lastSeenDate = new Date(lastSeen)
      return lastSeenDate > fiveMinutesAgo ? 'online' : 'offline'
    }

    // Build student data
    const students = studentIds.map((studentId: string) => {
      const profile = profiles.find((p: any) => p.id === studentId)
      const studentSubmissions = submissions.filter((s: any) => s.user_id === studentId)
      const studentLogs = auditLogs.filter((l: any) => {
        const actorUserId = String(l?.user_id || '')
        const affectedStudentId = String(l?.metadata?.student_id || '')
        return actorUserId === studentId || affectedStudentId === studentId
      })

      // Calculate assignment stats
      const totalAssignments = assignments?.length || 0
      const completedAssignments = studentSubmissions.filter((s: any) => s.status === 'submitted').length
      const gradedAssignments = studentSubmissions.filter((s: any) => s.grade !== null).length
      
      // Calculate average grade
      const grades = studentSubmissions.filter((s: any) => s.grade !== null).map((s: any) => s.grade).filter((g: any) => g !== null)
      const averageGrade = grades.length > 0 
        ? Math.round(grades.reduce((a: number, b: number) => a + b, 0) / grades.length * 10) / 10 
        : null

      // Get recent activity (last 5 actions)
      const recentActivity = studentLogs.slice(0, 5).map((log: any) => ({
        id: log.id,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        details: log.metadata || log.changes || null,
        createdAt: log.created_at
      }))

      // Get recent submissions
      const recentSubmissions = studentSubmissions
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((sub: any) => {
          const assignment = assignments?.find((a: any) => a.id === sub.assignment_id)
          return {
            id: sub.id,
            assignmentId: sub.assignment_id,
            assignmentTitle: assignment?.title || 'Unknown Assignment',
            status: sub.status,
            grade: sub.grade,
            submittedAt: sub.submitted_at,
            createdAt: sub.created_at
          }
        })

      // Get last graded submission
      const lastGraded = studentSubmissions
        .filter((s: any) => s.grade !== null)
        .sort((a: any, b: any) => new Date(b.submitted_at || b.created_at).getTime() - new Date(a.submitted_at || a.created_at).getTime())[0]

      return {
        id: studentId,
        name: displayName(profile?.full_name, profile?.email, studentId),
        email: profile?.email || null,
        avatarUrl: profile?.avatar_url,
        role: 'student',
        joinedAt: null,
        lastSeen: profile?.last_seen,
        onlineStatus: getOnlineStatus(profile?.last_seen),
        stats: {
          totalAssignments,
          completedAssignments,
          gradedAssignments,
          averageGrade,
          completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0
        },
        lastGraded: lastGraded ? {
          assignmentId: lastGraded.assignment_id,
          grade: lastGraded.grade,
          submittedAt: lastGraded.submitted_at,
          status: lastGraded.status
        } : null,
        recentActivity,
        recentSubmissions
      }
    })

    const [directSubjectsResult, linkedSubjectsResult] = await Promise.all([
      dataClient
        .from('subjects')
        .select('id, title, user_id')
        .eq('class_id', classId),
      (dataClient as any)
        .from('class_subjects')
        .select('subjects(id, title, user_id)')
        .eq('class_id', classId),
    ])

    if (directSubjectsResult.error) {
      logGroup('GET - subjects lookup failed (non-fatal)', {
        classId,
        error: directSubjectsResult.error.message,
      })
    }
    if (linkedSubjectsResult.error) {
      logGroup('GET - class_subjects lookup failed (non-fatal)', {
        classId,
        error: linkedSubjectsResult.error.message,
      })
    }

    const classSubjectsById = new Map<string, { id: string; title: string; user_id: string | null }>()
    for (const subjectRow of (directSubjectsResult.data || []) as any[]) {
      classSubjectsById.set(subjectRow.id, subjectRow)
    }
    for (const linkedRow of (linkedSubjectsResult.data || []) as any[]) {
      const linkedSubject = linkedRow?.subjects
      if (linkedSubject?.id) {
        classSubjectsById.set(linkedSubject.id, linkedSubject)
      }
    }
    const classSubjects = Array.from(classSubjectsById.values())

    // Build teachers data
    const teachers = teacherIds.map((teacherId: string) => {
      const profile = profiles.find((p: any) => p.id === teacherId)
      const teacherSubjects = classSubjects
        .filter((subject: any) => subject.user_id === teacherId)
        .map((subject: any) => ({
          id: subject.id,
          title: subject.title,
          ownerName: profile?.full_name || null,
          ownerEmail: profile?.email || null
        }))
      
      return {
        id: teacherId,
        name: displayName(profile?.full_name, profile?.email, teacherId),
        email: profile?.email || null,
        avatarUrl: profile?.avatar_url,
        role: 'teacher',
        joinedAt: null,
        lastSeen: profile?.last_seen,
        onlineStatus: getOnlineStatus(profile?.last_seen),
        subjects: teacherSubjects
      }
    })

    return NextResponse.json({
      classId,
      students,
      teachers,
      assignments: assignments?.map((a: any) => ({
        id: a.id,
        title: a.title,
        dueDate: a.due_date
      })) || [],
      stats: {
        totalStudents: students.length,
        onlineStudents: students.filter((s: any) => s.onlineStatus === 'online').length,
        totalTeachers: teachers.length,
        onlineTeachers: teachers.filter((t: any) => t.onlineStatus === 'online').length
      }
    })

  } catch (error) {
    logGroup('GET - Unexpected error', { error: String(error) })
    return NextResponse.json({ error: 'Internal server error: ' + String(error) }, { status: 500 })
  }
}
