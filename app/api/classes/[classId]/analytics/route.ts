import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { startOfWeek, subWeeks, format, differenceInMinutes, subDays, startOfDay, endOfDay } from 'date-fns'
import type { ClassAnalytics, EngagementMetrics, PerformanceTrend, AtRiskStudent, ComparativeData } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(
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

    // Verify teacher has access to this class
    const { data: classMember, error: classError } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single()

    if (classError || classMember?.role !== 'teacher') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get class students
    const { data: students, error: studentsError } = await supabase
      .from('class_members')
      .select('user_id, profiles!inner(id, full_name)')
      .eq('class_id', classId)
      .eq('role', 'student')

    if (studentsError) {
      console.error('Students error:', studentsError)
      return NextResponse.json({ error: studentsError.message }, { status: 500 })
    }

    const studentIds = students.map(s => s.user_id)
    const totalStudents = studentIds.length

    // Calculate engagement metrics
    const engagementMetrics: EngagementMetrics = await calculateEngagementMetrics(supabase, classId, studentIds)

    // Calculate performance trends (last 30 days)
    const performanceTrends: PerformanceTrend[] = await calculatePerformanceTrends(supabase, classId, studentIds)

    // Identify at-risk students
    const atRiskStudents: AtRiskStudent[] = await identifyAtRiskStudents(supabase, classId, studentIds, students)

    // Comparative analysis with other teacher classes
    const comparativeAnalysis: ComparativeData[] = await calculateComparativeAnalysis(supabase, user.id, classId)

    // Class overview
    const classOverview = {
      totalStudents,
      activeStudents: engagementMetrics.activeStudentsCount,
      totalAssignments: await getTotalAssignments(supabase, classId),
      averageClassScore: performanceTrends.length > 0 ? performanceTrends[performanceTrends.length - 1].averageScore : 0,
      overallCompletionRate: performanceTrends.length > 0 ? performanceTrends[performanceTrends.length - 1].completionRate : 0
    }

    // Generate insights
    const insights = generateInsights(engagementMetrics, performanceTrends, atRiskStudents, comparativeAnalysis)

    const analytics: ClassAnalytics = {
      engagementMetrics,
      performanceTrends,
      atRiskStudents,
      comparativeAnalysis,
      classOverview,
      insights,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(analytics)
  } catch (err) {
    console.error('Unexpected error in class analytics GET:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function calculateEngagementMetrics(
  supabase: any,
  classId: string,
  studentIds: string[]
): Promise<EngagementMetrics> {
  const weekStart = startOfWeek(new Date())

  // Average study time for the last week
  let totalStudyTime = 0
  let activeStudents = new Set<string>()

  for (const studentId of studentIds) {
    const { data: sessionLogs } = await supabase
      .from('session_logs')
      .select('*')
      .eq('student_id', studentId)
      .gte('started_at', weekStart.toISOString())

    if (sessionLogs) {
      sessionLogs.forEach((log: any) => {
        if (log.started_at && log.finished_at) {
          const duration = differenceInMinutes(new Date(log.finished_at), new Date(log.started_at))
          totalStudyTime += duration
          activeStudents.add(studentId)
        }
      })
    }
  }

  const averageStudyTime = studentIds.length > 0 ? totalStudyTime / studentIds.length : 0

  // Assignment participation
  const { data: submissions } = await supabase
    .from('submissions')
    .select('user_id')
    .in('user_id', studentIds)

  const participatingStudents = new Set(submissions?.map((s: any) => s.user_id) || [])
  const assignmentParticipation = studentIds.length > 0 ? (participatingStudents.size / studentIds.length) * 100 : 0

  // Quiz participation
  const { data: quizAnswers } = await supabase
    .from('student_answers')
    .select('student_id')
    .in('student_id', studentIds)

  const quizParticipatingStudents = new Set(quizAnswers?.map((a: any) => a.student_id) || [])
  const quizParticipation = studentIds.length > 0 ? (quizParticipatingStudents.size / studentIds.length) * 100 : 0

  // Attendance rate (simplified - based on recent activity)
  const attendanceRate = (activeStudents.size / studentIds.length) * 100

  return {
    averageStudyTime,
    attendanceRate,
    assignmentParticipation,
    quizParticipation,
    activeStudentsCount: activeStudents.size
  }
}

async function calculatePerformanceTrends(
  supabase: any,
  classId: string,
  studentIds: string[]
): Promise<PerformanceTrend[]> {
  const trends: PerformanceTrend[] = []
  const days = 30

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i)
    const startOfDate = startOfDay(date)
    const endOfDate = endOfDay(date)

    // Get submissions for this day
    const { data: submissions } = await supabase
      .from('submissions')
      .select('grade, student_answers(score)')
      .in('user_id', studentIds)
      .gte('submitted_at', startOfDate.toISOString())
      .lte('submitted_at', endOfDate.toISOString())

    let totalScore = 0
    let scoreCount = 0
    let completedCount = 0

    submissions?.forEach((sub: any) => {
      if (sub.grade !== null && sub.grade !== undefined) {
        totalScore += sub.grade
        scoreCount++
        completedCount++
      } else if (sub.student_answers && sub.student_answers.length > 0) {
        // Calculate from quiz answers
        const quizScore = sub.student_answers.reduce((sum: number, answer: any) => sum + (answer.score || 0), 0) / sub.student_answers.length
        totalScore += quizScore
        scoreCount++
        completedCount++
      }
    })

    const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0
    const completionRate = studentIds.length > 0 ? (completedCount / studentIds.length) * 100 : 0

    trends.push({
      date: format(date, 'yyyy-MM-dd'),
      averageScore,
      completionRate,
      submissionsCount: completedCount
    })
  }

  return trends
}

async function identifyAtRiskStudents(
  supabase: any,
  classId: string,
  studentIds: string[],
  students: any[]
): Promise<AtRiskStudent[]> {
  const atRisk: AtRiskStudent[] = []

  for (const student of students) {
    const studentId = student.user_id
    const studentName = student.profiles?.full_name || 'Unknown Student'

    // Check recent activity (last 7 days)
    const weekAgo = subDays(new Date(), 7)
    const { data: recentLogs } = await supabase
      .from('session_logs')
      .select('started_at, finished_at')
      .eq('student_id', studentId)
      .gte('started_at', weekAgo.toISOString())

    let totalStudyTime = 0
    recentLogs?.forEach((log: any) => {
      if (log.started_at && log.finished_at) {
        totalStudyTime += differenceInMinutes(new Date(log.finished_at), new Date(log.started_at))
      }
    })

    // Check recent submissions
    const { data: recentSubs } = await supabase
      .from('submissions')
      .select('grade')
      .eq('user_id', studentId)
      .gte('submitted_at', weekAgo.toISOString())

    const avgGrade = recentSubs && recentSubs.length > 0
      ? recentSubs.reduce((sum: number, sub: any) => sum + (sub.grade || 0), 0) / recentSubs.length
      : 0

    // Calculate risk scores
    const engagementScore = Math.min(100, (totalStudyTime / 10) * 100) // Expect 10+ hours/week
    const performanceScore = avgGrade

    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    const reasons: string[] = []

    if (engagementScore < 30 || performanceScore < 60) {
      riskLevel = 'high'
      if (engagementScore < 30) reasons.push('Low study time')
      if (performanceScore < 60) reasons.push('Poor grades')
    } else if (engagementScore < 60 || performanceScore < 75) {
      riskLevel = 'medium'
      if (engagementScore < 60) reasons.push('Below average engagement')
      if (performanceScore < 75) reasons.push('Average performance needs improvement')
    }

    if (riskLevel !== 'low') {
      atRisk.push({
        id: studentId,
        name: studentName,
        riskLevel,
        reasons,
        engagementScore,
        performanceScore,
        lastActivity: recentLogs && recentLogs.length > 0
          ? recentLogs[recentLogs.length - 1].started_at
          : 'No recent activity'
      })
    }
  }

  return atRisk.sort((a, b) => {
    const riskOrder = { high: 3, medium: 2, low: 1 }
    return riskOrder[b.riskLevel] - riskOrder[a.riskLevel]
  })
}

async function calculateComparativeAnalysis(
  supabase: any,
  teacherId: string,
  currentClassId: string
): Promise<ComparativeData[]> {
  // Get all teacher's classes
  const { data: teacherClasses } = await supabase
    .from('class_members')
    .select('class_id, classes!inner(id, name)')
    .eq('user_id', teacherId)
    .eq('role', 'teacher')

  const comparativeData: ComparativeData[] = []

  for (const classMember of teacherClasses || []) {
    const classId = classMember.class_id
    const className = classMember.classes?.name || 'Unknown Class'

    // Get students for this class
    const { data: classStudents } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('role', 'student')

    const studentIds = classStudents?.map((s: any) => s.user_id) || []

    // Calculate metrics (simplified version)
    const { data: submissions } = await supabase
      .from('submissions')
      .select('grade')
      .in('user_id', studentIds)

    const validGrades = submissions?.filter((s: any) => s.grade !== null && s.grade !== undefined) || []
    const averageScore = validGrades.length > 0
      ? validGrades.reduce((sum: number, s: any) => sum + s.grade, 0) / validGrades.length
      : 0

    const completionRate = studentIds.length > 0 ? (validGrades.length / studentIds.length) * 100 : 0

    // Simple engagement rate based on recent activity
    const weekAgo = subDays(new Date(), 7)
    const { data: recentLogs } = await supabase
      .from('session_logs')
      .select('student_id')
      .in('student_id', studentIds)
      .gte('started_at', weekAgo.toISOString())

    const activeStudents = new Set(recentLogs?.map((l: any) => l.student_id) || [])
    const engagementRate = studentIds.length > 0 ? (activeStudents.size / studentIds.length) * 100 : 0

    comparativeData.push({
      className,
      averageScore,
      completionRate,
      engagementRate,
      studentCount: studentIds.length
    })
  }

  return comparativeData
}

async function getTotalAssignments(supabase: any, classId: string): Promise<number> {
  const { count } = await supabase
    .from('assignments')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)

  return count || 0
}

function generateInsights(
  engagement: EngagementMetrics,
  trends: PerformanceTrend[],
  atRisk: AtRiskStudent[],
  comparative: ComparativeData[]
): string[] {
  const insights: string[] = []

  // Engagement insights
  if (engagement.attendanceRate < 70) {
    insights.push('Low attendance rate detected. Consider reaching out to inactive students.')
  }

  if (engagement.assignmentParticipation < 80) {
    insights.push('Assignment participation is below 80%. Review assignment clarity and deadlines.')
  }

  // Performance insights
  if (trends.length > 1) {
    const recent = trends[trends.length - 1]
    const previous = trends[trends.length - 2]

    if (recent.averageScore > previous.averageScore + 5) {
      insights.push('Great improvement in recent performance!')
    } else if (recent.averageScore < previous.averageScore - 5) {
      insights.push('Recent performance decline detected. Review recent assignments.')
    }
  }

  // At-risk insights
  if (atRisk.length > 0) {
    insights.push(`${atRisk.length} student${atRisk.length > 1 ? 's are' : ' is'} at risk and may need additional support.`)
  }

  // Comparative insights
  if (comparative.length > 1) {
    const currentClass = comparative.find(c => c.className !== 'Unknown Class') // This is a simplification
    if (currentClass) {
      const avgScore = comparative.reduce((sum, c) => sum + c.averageScore, 0) / comparative.length
      if (currentClass.averageScore > avgScore + 5) {
        insights.push('This class is performing above average compared to your other classes.')
      } else if (currentClass.averageScore < avgScore - 5) {
        insights.push('This class is performing below average. Consider reviewing teaching strategies.')
      }
    }
  }

  if (insights.length === 0) {
    insights.push('Class performance looks good overall. Keep up the excellent work!')
  }

  return insights
}
