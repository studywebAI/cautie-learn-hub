import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function logGroup(...args: any[]) {
  console.log('[CLASS_GROUP]', ...args)
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
    // (role column was removed - use subscription_type from profiles instead)
    const { data: classMember, error: memberError } = await supabase
      .from('class_members')
      .select('user_id')
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

    // Get all class members (students and teachers)
    // (role column was removed - use subscription_type from profiles instead)
    const { data: classMembers, error: membersError } = await supabase
      .from('class_members')
      .select('user_id, created_at')
      .eq('class_id', classId)

    if (membersError) {
      logGroup('GET - class_members failed', { classId, membersError: membersError.message })
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    const allUserIds = classMembers?.map(m => m.user_id) || []
    
    // Get profiles for all members to determine their subscription_type (teacher/student)
    let profiles: any[] = []
    let subscriptionTypes: Record<string, string> = {}
    
    if (allUserIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
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

    // Filter students and teachers based on subscription_type (global role)
    // Treat unknown profile role as student so members without a profile don't disappear.
    const studentIds = allUserIds.filter(uid => subscriptionTypes[uid] !== 'teacher')
    const teacherIds = allUserIds.filter(uid => subscriptionTypes[uid] === 'teacher')

    // Get all assignments for the class
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id, title, due_date, created_at, class_id')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })

    if (assignmentsError) {
      return NextResponse.json({ error: assignmentsError.message }, { status: 500 })
    }

    const assignmentIds = assignments?.map(a => a.id) || []

    // Get submissions for these assignments
    let submissions: any[] = []
    if (assignmentIds.length > 0 && studentIds.length > 0) {
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('id, assignment_id, user_id, status, grade, submitted_at, created_at')
        .in('assignment_id', assignmentIds)
        .in('user_id', studentIds)
      
      if (submissionsError) {
        return NextResponse.json({ error: submissionsError.message }, { status: 500 })
      }
      submissions = submissionsData || []
    }

    // Get recent audit logs for students in this class
    let auditLogs: any[] = []
    if (studentIds.length > 0) {
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('id, user_id, action, entity_type, entity_id, details, created_at')
        .in('user_id', studentIds)
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (logsError) {
        return NextResponse.json({ error: logsError.message }, { status: 500 })
      }
      auditLogs = logsData || []
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
    const students = studentIds.map(studentId => {
      const profile = profiles.find((p: any) => p.id === studentId)
      const member = classMembers?.find((m: any) => m.user_id === studentId)
      const studentSubmissions = submissions.filter((s: any) => s.user_id === studentId)
      const studentLogs = auditLogs.filter((l: any) => l.user_id === studentId)

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
        details: log.details,
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
        name: profile?.full_name || 'Unknown Student',
        email: profile?.email || null,
        avatarUrl: profile?.avatar_url,
        role: 'student',
        joinedAt: member?.created_at,
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

    // Build teachers data
    const teachers = teacherIds.map(teacherId => {
      const profile = profiles.find((p: any) => p.id === teacherId)
      const member = classMembers?.find((m: any) => m.user_id === teacherId)
      
      return {
        id: teacherId,
        name: profile?.full_name || 'Unknown Teacher',
        email: profile?.email || null,
        avatarUrl: profile?.avatar_url,
        role: 'teacher',
        joinedAt: member?.created_at,
        lastSeen: profile?.last_seen,
        onlineStatus: getOnlineStatus(profile?.last_seen)
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
