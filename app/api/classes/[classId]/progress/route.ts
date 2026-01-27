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

    // Verify user owns the class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .eq('owner_id', user.id)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found or access denied' }, { status: 404 })
    }

    // Get all students in the class
    const { data: classMembers, error: membersError } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('role', 'student')

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    // Get student profiles
    const studentIds = classMembers?.map(m => m.user_id) || []
    const { data: profiles, error: profilesError } = studentIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', studentIds)
      : { data: [], error: null }

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    const students = classMembers?.map(member => ({
      user_id: member.user_id,
      profile: profiles?.find(p => p.id === member.user_id)
    })) || []

    // Get all assignments for the class
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id, title, due_date, created_at')
      .eq('class_id', classId)
      .order('created_at')

    if (assignmentsError) {
      return NextResponse.json({ error: assignmentsError.message }, { status: 500 })
    }

    // Get all submissions for the assignments
    const assignmentIds = assignments?.map(a => a.id) || []
    const { data: submissions, error: submissionsError } = assignmentIds.length > 0
      ? await supabase
          .from('submissions')
          .select('assignment_id, user_id, status, grade, submitted_at')
          .in('assignment_id', assignmentIds)
      : { data: [], error: null }

    if (submissionsError) {
      return NextResponse.json({ error: submissionsError.message }, { status: 500 })
    }

    // Calculate progress for each student
    const studentProgress = students?.map(student => {
      const studentId = student.user_id
      const profile = student.profile

      // Get submissions for this student
      const studentSubmissions = submissions?.filter(s => s.user_id === studentId) || []

      // Calculate assignment progress
      const totalAssignments = assignments?.length || 0
      const completedAssignments = studentSubmissions.filter(s => s.status === 'submitted' || s.grade !== null).length
      const gradedAssignments = studentSubmissions.filter(s => s.grade !== null).length

      // Calculate average grade
      const grades = studentSubmissions.filter(s => s.grade !== null).map(s => s.grade).filter(g => g !== null) as number[]
      const averageGrade = grades.length > 0 ? grades.reduce((a, b) => a! + b!, 0) / grades.length : null

      // Assignment details
      const assignmentDetails = assignments?.map(assignment => {
        const submission = studentSubmissions.find(s => s.assignment_id === assignment.id)
        return {
          assignmentId: assignment.id,
          title: assignment.title,
          dueDate: assignment.due_date,
          submitted: !!submission,
          submittedAt: submission?.submitted_at,
          status: submission?.status || 'not_submitted',
          grade: submission?.grade
        }
      }) || []

      return {
        studentId,
        studentName: profile?.full_name || 'Unknown Student',
        avatarUrl: profile?.avatar_url,
        totalAssignments,
        completedAssignments,
        gradedAssignments,
        averageGrade,
        completionRate: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0,
        assignmentDetails
      }
    }) || []

    return NextResponse.json({
      className: classData.name,
      students: studentProgress,
      assignments: assignments?.map(a => ({
        id: a.id,
        title: a.title,
        dueDate: a.due_date
      })) || []
    })

  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}