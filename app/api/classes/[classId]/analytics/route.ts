import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { format, subDays, startOfDay, endOfDay, differenceInMinutes } from 'date-fns'
import type {
  AnalyticsWarning,
  ClassAnalytics,
  ClassAnalyticsAssignmentSpeed,
  ClassAnalyticsStudentRow,
  ClassAnalyticsSubject,
  ComparativeData,
  EngagementMetrics,
  PerformanceTrend,
  AtRiskStudent,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const { classId } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: classMember } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!classMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: students, error: studentsError } = await supabase
      .from('class_members')
      .select('user_id, profiles!inner(id, full_name)')
      .eq('class_id', classId)

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 })
    }

    const studentsSafe = (students || []).filter((s: any) => s.user_id !== user.id)
    const studentIds = studentsSafe.map((s: any) => s.user_id)
    const totalStudents = studentIds.length

    const studentNameById = new Map<string, string>()
    studentsSafe.forEach((s: any) => {
      studentNameById.set(s.user_id, s.profiles?.full_name || 'Unknown Student')
    })

    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, class_id, paragraph_id, title')
      .eq('class_id', classId)

    const assignmentsSafe = assignments || []
    const assignmentIds = assignmentsSafe.map((a: any) => a.id)

    const paragraphIds = assignmentsSafe
      .map((a: any) => a.paragraph_id)
      .filter((id: string | null): id is string => !!id)

    const { data: paragraphs } = paragraphIds.length > 0
      ? await supabase
        .from('paragraphs')
        .select('id, title, chapter_id')
        .in('id', paragraphIds)
      : { data: [] as any[] }

    const paragraphsSafe = paragraphs || []
    const paragraphById = new Map<string, any>()
    const chapterIds: string[] = []
    const chapterIdSet = new Set<string>()
    paragraphsSafe.forEach((p: any) => {
      paragraphById.set(p.id, p)
      if (p.chapter_id && !chapterIdSet.has(p.chapter_id)) {
        chapterIdSet.add(p.chapter_id)
        chapterIds.push(p.chapter_id)
      }
    })

    const { data: chapters } = chapterIds.length > 0
      ? await supabase
        .from('chapters')
        .select('id, title, subject_id')
        .in('id', chapterIds)
      : { data: [] as any[] }

    const chaptersSafe = chapters || []
    const chapterById = new Map<string, any>()
    const subjectIds: string[] = []
    const subjectIdSet = new Set<string>()
    chaptersSafe.forEach((c: any) => {
      chapterById.set(c.id, c)
      if (c.subject_id && !subjectIdSet.has(c.subject_id)) {
        subjectIdSet.add(c.subject_id)
        subjectIds.push(c.subject_id)
      }
    })

    const { data: subjects } = subjectIds.length > 0
      ? await supabase
        .from('subjects')
        .select('id, title')
        .in('id', subjectIds)
      : { data: [] as any[] }

    const subjectById = new Map<string, any>()
    ;(subjects || []).forEach((s: any) => subjectById.set(s.id, s))

    const assignmentContextById = new Map<string, {
      assignmentId: string
      assignmentTitle: string
      paragraphId: string | null
      paragraphTitle: string | null
      subjectId: string | null
      subjectTitle: string | null
    }>()
    assignmentsSafe.forEach((assignment: any) => {
      const paragraph = assignment.paragraph_id ? paragraphById.get(assignment.paragraph_id) : null
      const chapter = paragraph?.chapter_id ? chapterById.get(paragraph.chapter_id) : null
      const subject = chapter?.subject_id ? subjectById.get(chapter.subject_id) : null
      assignmentContextById.set(assignment.id, {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title || 'Untitled assignment',
        paragraphId: paragraph?.id || null,
        paragraphTitle: paragraph?.title || null,
        subjectId: subject?.id || null,
        subjectTitle: subject?.title || null,
      })
    })

    const { data: submissions } = assignmentIds.length > 0
      ? await supabase
        .from('submissions')
        .select('id, assignment_id, user_id, submitted_at, grade, content')
        .in('assignment_id', assignmentIds)
      : { data: [] as any[] }

    const { data: blocks } = assignmentIds.length > 0
      ? await supabase
        .from('blocks')
        .select('id, assignment_id, type')
        .in('assignment_id', assignmentIds)
      : { data: [] as any[] }

    const blocksSafe = blocks || []
    const blockIds = blocksSafe.map((b: any) => b.id)
    const blockAssignmentById = new Map<string, { assignmentId: string; type: string }>()
    blocksSafe.forEach((block: any) => {
      if (!block?.id || !block?.assignment_id) return
      blockAssignmentById.set(block.id, {
        assignmentId: block.assignment_id,
        type: block.type || 'unknown',
      })
    })

    const { data: studentAnswers } = blockIds.length > 0
      ? await supabase
        .from('student_answers')
        .select('student_id, block_id, answer_data, submitted_at, score')
        .in('student_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])
        .in('block_id', blockIds)
      : { data: [] as any[] }

    const { data: activityLogs } = await (supabase as any)
      .from('activity_logs')
      .select('student_id, activity_type, paragraph_id, subject_id, time_spent_seconds, metadata, created_at')
      .in('student_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false })

    const activityLogsSafe = activityLogs || []

    const engagementMetrics = await calculateEngagementMetrics(supabase, studentIds, activityLogsSafe)
    const performanceTrends = await calculatePerformanceTrends(supabase, studentIds, assignmentIds)
    const atRiskStudents = await identifyAtRiskStudents(supabase, studentsSafe)
    const comparativeAnalysis = await calculateComparativeAnalysis(supabase, user.id)

    const { count: totalAssignments } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId)

    const classOverview = {
      totalStudents,
      activeStudents: engagementMetrics.activeStudentsCount,
      totalAssignments: totalAssignments || 0,
      averageClassScore: performanceTrends.length > 0 ? performanceTrends[performanceTrends.length - 1].averageScore : 0,
      overallCompletionRate: performanceTrends.length > 0 ? performanceTrends[performanceTrends.length - 1].completionRate : 0,
    }

    const analytics: ClassAnalytics = {
      engagementMetrics,
      performanceTrends,
      atRiskStudents,
      comparativeAnalysis,
      subjects: buildSubjectRows(
        studentIds,
        submissions || [],
        activityLogsSafe,
        assignmentContextById
      ),
      assignmentSpeeds: buildAssignmentSpeeds(activityLogsSafe, assignmentContextById),
      studentRows: buildStudentRows(
        studentIds,
        studentNameById,
        submissions || [],
        activityLogsSafe,
        assignmentContextById,
        studentAnswers || [],
        blockAssignmentById,
        assignmentsSafe.length
      ),
      warnings: buildWarnings(
        studentIds,
        studentNameById,
        activityLogsSafe,
        assignmentContextById,
        studentAnswers || [],
        blockAssignmentById
      ),
      plagiarismIntegration: {
        provider: process.env.ZEROGPT_API_KEY ? 'ZeroGPT' : 'Internal similarity',
        configured: true,
        note: process.env.ZEROGPT_API_KEY
          ? 'External AI-origin scoring enabled with ZeroGPT plus internal similarity checks.'
          : 'Using internal text-similarity checks only.',
      },
      classOverview,
      insights: generateInsights(engagementMetrics, atRiskStudents),
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(analytics)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function calculateEngagementMetrics(
  supabase: any,
  studentIds: string[],
  activityLogs: any[]
): Promise<EngagementMetrics> {
  if (studentIds.length === 0) {
    return {
      averageStudyTime: 0,
      attendanceRate: 0,
      assignmentParticipation: 0,
      quizParticipation: 0,
      activeStudentsCount: 0,
    }
  }

  const weekAgo = subDays(new Date(), 7).toISOString()
  let totalMinutes = 0
  const activeStudents = new Set<string>()

  const { data: sessions } = await supabase
    .from('session_logs')
    .select('student_id, started_at, finished_at')
    .in('student_id', studentIds)
    .gte('started_at', weekAgo)

  ;(sessions || []).forEach((log: any) => {
    if (log.started_at && log.finished_at) {
      totalMinutes += Math.max(0, differenceInMinutes(new Date(log.finished_at), new Date(log.started_at)))
      activeStudents.add(log.student_id)
    }
  })

  ;(activityLogs || []).forEach((log: any) => {
    if (!log?.created_at || log.created_at < weekAgo) return
    totalMinutes += Math.round((log.time_spent_seconds || 0) / 60)
    activeStudents.add(log.student_id)
  })

  const { data: submissions } = await supabase
    .from('submissions')
    .select('user_id')
    .in('user_id', studentIds)

  const submissionUsers = new Set((submissions || []).map((s: any) => s.user_id))

  const { data: answers } = await supabase
    .from('student_answers')
    .select('student_id')
    .in('student_id', studentIds)

  const quizUsers = new Set((answers || []).map((a: any) => a.student_id))

  return {
    averageStudyTime: totalMinutes / Math.max(studentIds.length, 1),
    attendanceRate: (activeStudents.size / studentIds.length) * 100,
    assignmentParticipation: (submissionUsers.size / studentIds.length) * 100,
    quizParticipation: (quizUsers.size / studentIds.length) * 100,
    activeStudentsCount: activeStudents.size,
  }
}

async function calculatePerformanceTrends(
  supabase: any,
  studentIds: string[],
  assignmentIds: string[]
): Promise<PerformanceTrend[]> {
  const result: PerformanceTrend[] = []

  for (let i = 29; i >= 0; i--) {
    const day = subDays(new Date(), i)
    const dayStart = startOfDay(day).toISOString()
    const dayEnd = endOfDay(day).toISOString()

    const { data: submissions } = await supabase
      .from('submissions')
      .select('grade')
      .in('user_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])
      .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('submitted_at', dayStart)
      .lte('submitted_at', dayEnd)

    const graded = (submissions || []).filter((s: any) => s.grade !== null && s.grade !== undefined)
    const averageScore = graded.length > 0
      ? graded.reduce((sum: number, s: any) => sum + Number(s.grade || 0), 0) / graded.length
      : 0

    result.push({
      date: format(day, 'yyyy-MM-dd'),
      averageScore,
      completionRate: studentIds.length > 0 ? ((submissions || []).length / studentIds.length) * 100 : 0,
      submissionsCount: (submissions || []).length,
    })
  }

  return result
}

async function identifyAtRiskStudents(supabase: any, students: any[]): Promise<AtRiskStudent[]> {
  const weekAgo = subDays(new Date(), 7).toISOString()
  const results: AtRiskStudent[] = []

  for (const student of students) {
    const studentId = student.user_id
    const studentName = student.profiles?.full_name || 'Unknown Student'

    const { data: recentSessions } = await supabase
      .from('session_logs')
      .select('started_at, finished_at')
      .eq('student_id', studentId)
      .gte('started_at', weekAgo)

    let studyMinutes = 0
    ;(recentSessions || []).forEach((s: any) => {
      if (s.started_at && s.finished_at) {
        studyMinutes += Math.max(0, differenceInMinutes(new Date(s.finished_at), new Date(s.started_at)))
      }
    })

    const { data: recentSubs } = await supabase
      .from('submissions')
      .select('grade')
      .eq('user_id', studentId)
      .gte('submitted_at', weekAgo)

    const graded = (recentSubs || []).filter((s: any) => s.grade !== null && s.grade !== undefined)
    const performance = graded.length > 0
      ? graded.reduce((sum: number, s: any) => sum + Number(s.grade || 0), 0) / graded.length
      : 0
    const engagement = Math.min(100, (studyMinutes / 300) * 100)

    if (engagement < 35 || performance < 60) {
      results.push({
        id: studentId,
        name: studentName,
        riskLevel: 'high',
        reasons: ['Low activity or low score'],
        engagementScore: engagement,
        performanceScore: performance,
        lastActivity: recentSessions?.[0]?.started_at || 'No recent activity',
      })
    } else if (engagement < 55 || performance < 75) {
      results.push({
        id: studentId,
        name: studentName,
        riskLevel: 'medium',
        reasons: ['Needs closer follow-up'],
        engagementScore: engagement,
        performanceScore: performance,
        lastActivity: recentSessions?.[0]?.started_at || 'No recent activity',
      })
    }
  }

  return results
}

async function calculateComparativeAnalysis(supabase: any, teacherId: string): Promise<ComparativeData[]> {
  const { data: teacherClasses } = await supabase
    .from('class_members')
    .select('class_id, classes!inner(id, name)')
    .eq('user_id', teacherId)

  const out: ComparativeData[] = []
  for (const item of teacherClasses || []) {
    const classId = item.class_id
    const className = item.classes?.name || 'Unknown Class'

    const { data: members } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
    const ids = (members || []).map((m: any) => m.user_id)

    const { data: submissions } = await supabase
      .from('submissions')
      .select('grade')
      .in('user_id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'])

    const graded = (submissions || []).filter((s: any) => s.grade !== null && s.grade !== undefined)
    out.push({
      className,
      averageScore: graded.length > 0 ? graded.reduce((sum: number, s: any) => sum + Number(s.grade || 0), 0) / graded.length : 0,
      completionRate: ids.length > 0 ? ((submissions || []).length / ids.length) * 100 : 0,
      engagementRate: 0,
      studentCount: ids.length,
    })
  }

  return out
}

function generateInsights(engagement: EngagementMetrics, atRisk: AtRiskStudent[]): string[] {
  const insights: string[] = []

  if (engagement.assignmentParticipation < 80) {
    insights.push('Assignment participation is below 80%.')
  }
  if (engagement.attendanceRate < 70) {
    insights.push('Attendance/engagement is below 70%.')
  }
  if (atRisk.length > 0) {
    insights.push(`${atRisk.length} student${atRisk.length === 1 ? '' : 's'} require extra attention.`)
  }
  if (insights.length === 0) {
    insights.push('Class performance is stable this week.')
  }

  return insights
}

function buildSubjectRows(
  studentIds: string[],
  submissions: any[],
  activityLogs: any[],
  assignmentContextById: Map<string, any>
): ClassAnalyticsSubject[] {
  const map = new Map<string, {
    subjectId: string
    subjectTitle: string
    studentIds: Set<string>
    submissionsCount: number
    totalStudyMinutes: number
  }>()

  for (const sub of submissions) {
    const ctx = assignmentContextById.get(sub.assignment_id)
    const subjectId = ctx?.subjectId
    const subjectTitle = ctx?.subjectTitle
    if (!subjectId) continue
    const entry = map.get(subjectId) || {
      subjectId,
      subjectTitle: subjectTitle || 'Unknown subject',
      studentIds: new Set<string>(),
      submissionsCount: 0,
      totalStudyMinutes: 0,
    }
    entry.submissionsCount += 1
    entry.studentIds.add(sub.user_id)
    map.set(subjectId, entry)
  }

  for (const log of activityLogs) {
    if (!studentIds.includes(log.student_id)) continue
    const subjectId = log.subject_id
    if (!subjectId) continue
    const current = map.get(subjectId) || {
      subjectId,
      subjectTitle: 'Unknown subject',
      studentIds: new Set<string>(),
      submissionsCount: 0,
      totalStudyMinutes: 0,
    }
    current.totalStudyMinutes += Math.round((Number(log.time_spent_seconds) || 0) / 60)
    current.studentIds.add(log.student_id)
    map.set(subjectId, current)
  }

  return Array.from(map.values())
    .map((v) => ({
      subjectId: v.subjectId,
      subjectTitle: v.subjectTitle,
      submissionsCount: v.submissionsCount,
      activeStudents: v.studentIds.size,
      totalStudyMinutes: v.totalStudyMinutes,
    }))
    .sort((a, b) => b.submissionsCount - a.submissionsCount)
}

function buildAssignmentSpeeds(
  activityLogs: any[],
  assignmentContextById: Map<string, any>
): ClassAnalyticsAssignmentSpeed[] {
  const durationMap = new Map<string, number[]>()

  for (const log of activityLogs) {
    if (log.activity_type !== 'assignment') continue
    const metadata = safeMetadata(log.metadata)
    const assignmentId = metadata.assignment_id
    if (!assignmentId) continue
    const seconds = Number(log.time_spent_seconds || metadata.duration_seconds || 0)
    if (!seconds || seconds <= 0) continue
    const arr = durationMap.get(assignmentId) || []
    arr.push(seconds)
    durationMap.set(assignmentId, arr)
  }

  const out: ClassAnalyticsAssignmentSpeed[] = []
  for (const [assignmentId, values] of durationMap.entries()) {
    const ctx = assignmentContextById.get(assignmentId)
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length
    out.push({
      assignmentId,
      assignmentTitle: ctx?.assignmentTitle || 'Assignment',
      subjectId: ctx?.subjectId || undefined,
      subjectTitle: ctx?.subjectTitle || undefined,
      averageSeconds: avg,
      submissionCount: values.length,
    })
  }

  return out.sort((a, b) => b.averageSeconds - a.averageSeconds)
}

function buildStudentRows(
  studentIds: string[],
  studentNameById: Map<string, string>,
  submissions: any[],
  activityLogs: any[],
  assignmentContextById: Map<string, any>,
  studentAnswers: any[],
  blockAssignmentById: Map<string, { assignmentId: string; type: string }>,
  totalAssignments: number
): ClassAnalyticsStudentRow[] {
  const warnings = buildWarnings(
    studentIds,
    studentNameById,
    activityLogs,
    assignmentContextById,
    studentAnswers,
    blockAssignmentById
  )
  const warningCountByStudent = new Map<string, number>()
  for (const warning of warnings) {
    warningCountByStudent.set(
      warning.studentId,
      (warningCountByStudent.get(warning.studentId) || 0) + 1
    )
  }

  const rows: ClassAnalyticsStudentRow[] = []
  for (const studentId of studentIds) {
    const studentSubs = submissions.filter((s: any) => s.user_id === studentId)
    const studentLogs = activityLogs.filter((l: any) => l.student_id === studentId)
    const studentOpenAnswers = studentAnswers.filter((a: any) => {
      if (a.student_id !== studentId) return false
      const blockCtx = blockAssignmentById.get(a.block_id)
      return blockCtx?.type === 'open_question'
    })
    const pendingOpenReviews = studentOpenAnswers.filter((a: any) => a.score === null || a.score === undefined).length
    const gradedSubs = studentSubs.filter((s: any) => s.grade !== null && s.grade !== undefined)
    const averageGrade = gradedSubs.length > 0
      ? gradedSubs.reduce((sum: number, s: any) => sum + Number(s.grade || 0), 0) / gradedSubs.length
      : null
    const completionRate = totalAssignments > 0 ? (studentSubs.length / totalAssignments) * 100 : 0
    const subjectSet = new Set<string>()

    for (const sub of studentSubs) {
      const ctx = assignmentContextById.get(sub.assignment_id)
      if (ctx?.subjectTitle) subjectSet.add(ctx.subjectTitle)
    }
    for (const log of studentLogs) {
      const metadata = safeMetadata(log.metadata)
      if (metadata.subject_title) subjectSet.add(String(metadata.subject_title))
    }

    const assignmentDurations = studentLogs
      .filter((l: any) => l.activity_type === 'assignment')
      .map((l: any) => Number(l.time_spent_seconds || 0))
      .filter((n: number) => Number.isFinite(n) && n > 0)

    const totalStudyMinutes = studentLogs.reduce((sum: number, l: any) => {
      return sum + Math.round((Number(l.time_spent_seconds) || 0) / 60)
    }, 0)

    const mostRecentLog = [...studentLogs]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    const lastSubmission = [...studentSubs]
      .filter((s: any) => !!s.submitted_at)
      .sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]

    const recentTool = mostRecentLog
      ? {
        toolType: mostRecentLog.activity_type || 'general',
        title: pickToolTitle(safeMetadata(mostRecentLog.metadata)),
        usedAt: mostRecentLog.created_at || null,
      }
      : null

    rows.push({
      studentId,
      studentName: studentNameById.get(studentId) || 'Unknown Student',
      subjectsWorked: Array.from(subjectSet),
      submissionsCount: studentSubs.length,
      totalStudyMinutes,
      completionRate,
      averageGrade,
      pendingOpenReviews,
      averageSubmissionSeconds: assignmentDurations.length > 0
        ? assignmentDurations.reduce((sum: number, n: number) => sum + n, 0) / assignmentDurations.length
        : null,
      warningCount: warningCountByStudent.get(studentId) || 0,
      lastActivityAt: mostRecentLog?.created_at || null,
      lastSubmissionAt: lastSubmission?.submitted_at || null,
      recentTool,
    })
  }

  return rows.sort((a, b) => b.warningCount - a.warningCount || b.totalStudyMinutes - a.totalStudyMinutes)
}

function buildWarnings(
  studentIds: string[],
  studentNameById: Map<string, string>,
  activityLogs: any[],
  assignmentContextById: Map<string, any>,
  studentAnswers: any[],
  blockAssignmentById: Map<string, { assignmentId: string; type: string }>
): AnalyticsWarning[] {
  const warnings: AnalyticsWarning[] = []

  const latestByStudentAssignment = new Map<string, any>()
  for (const log of activityLogs) {
    if (log.activity_type !== 'assignment') continue
    const metadata = safeMetadata(log.metadata)
    const assignmentId = metadata.assignment_id
    if (!assignmentId) continue
    const key = `${log.student_id}::${assignmentId}`
    const existing = latestByStudentAssignment.get(key)
    if (!existing || new Date(log.created_at).getTime() > new Date(existing.created_at).getTime()) {
      latestByStudentAssignment.set(key, log)
    }
  }

  const byAssignment = new Map<string, { studentId: string; seconds: number; log: any }[]>()
  for (const log of latestByStudentAssignment.values()) {
    const metadata = safeMetadata(log.metadata)
    const assignmentId = metadata.assignment_id
    const seconds = Number(log.time_spent_seconds || metadata.duration_seconds || 0)
    if (!assignmentId || !seconds || seconds <= 0) continue
    const arr = byAssignment.get(assignmentId) || []
    arr.push({ studentId: log.student_id, seconds, log })
    byAssignment.set(assignmentId, arr)
  }

  const plagiarismWarnings = buildTextSimilarityWarnings(
    studentIds,
    studentNameById,
    assignmentContextById,
    studentAnswers,
    blockAssignmentById
  )
  warnings.push(...plagiarismWarnings)

  for (const [assignmentId, rows] of byAssignment.entries()) {
    if (rows.length < 3) continue
    const classAvg = rows.reduce((sum, r) => sum + r.seconds, 0) / rows.length
    const ctx = assignmentContextById.get(assignmentId)

    for (const row of rows) {
      const ratio = classAvg > 0 ? row.seconds / classAvg : 1
      if (ratio <= 0.1 && row.seconds <= 90 && classAvg >= 600) {
        warnings.push({
          id: `speed-high-${assignmentId}-${row.studentId}`,
          studentId: row.studentId,
          studentName: studentNameById.get(row.studentId) || 'Unknown Student',
          severity: 'high',
          type: 'speed',
          assignmentId,
          assignmentTitle: ctx?.assignmentTitle || safeMetadata(row.log.metadata).assignment_title,
          subjectId: ctx?.subjectId || undefined,
          subjectTitle: ctx?.subjectTitle || undefined,
          message: 'Student finished far faster than class average. Check for copying/pasting.',
          ratio,
          studentSeconds: row.seconds,
          classAverageSeconds: classAvg,
          createdAt: row.log.created_at,
        })
      } else if (ratio <= 0.2 && row.seconds <= 180 && classAvg >= 300) {
        warnings.push({
          id: `speed-medium-${assignmentId}-${row.studentId}`,
          studentId: row.studentId,
          studentName: studentNameById.get(row.studentId) || 'Unknown Student',
          severity: 'medium',
          type: 'speed',
          assignmentId,
          assignmentTitle: ctx?.assignmentTitle || safeMetadata(row.log.metadata).assignment_title,
          subjectId: ctx?.subjectId || undefined,
          subjectTitle: ctx?.subjectTitle || undefined,
          message: 'Student completed unusually fast compared to class average.',
          ratio,
          studentSeconds: row.seconds,
          classAverageSeconds: classAvg,
          createdAt: row.log.created_at,
        })
      }
    }
  }

  for (const log of latestByStudentAssignment.values()) {
    const metadata = safeMetadata(log.metadata)
    const assignmentId = metadata.assignment_id
    const pasteCount = Number(metadata.paste_count || 0)
    const pasteChars = Number(metadata.paste_chars || 0)
    const seconds = Number(log.time_spent_seconds || metadata.duration_seconds || 0)
    if (!assignmentId || seconds <= 0) continue
    if (pasteCount > 0 && pasteChars >= 60 && seconds <= 120) {
      const severity = seconds <= 20 ? 'medium' : 'low'
      const ctx = assignmentContextById.get(assignmentId)
      warnings.push({
        id: `paste-${assignmentId}-${log.student_id}`,
        studentId: log.student_id,
        studentName: studentNameById.get(log.student_id) || 'Unknown Student',
        severity,
        type: 'paste',
        assignmentId,
        assignmentTitle: ctx?.assignmentTitle || metadata.assignment_title,
        subjectId: ctx?.subjectId || undefined,
        subjectTitle: ctx?.subjectTitle || undefined,
        message: severity === 'medium'
          ? 'Fast submission with paste activity detected.'
          : 'Paste activity detected in a short submission window.',
        studentSeconds: seconds,
        createdAt: log.created_at,
      })
    }

    const aiProbability = Number(metadata.ai_probability || metadata.zerogpt_probability || 0)
    if (aiProbability >= 0.75) {
      const ctx = assignmentContextById.get(assignmentId)
      warnings.push({
        id: `ai-${assignmentId}-${log.student_id}`,
        studentId: log.student_id,
        studentName: studentNameById.get(log.student_id) || 'Unknown Student',
        severity: aiProbability >= 0.9 ? 'high' : 'medium',
        type: 'ai_plagiarism',
        assignmentId,
        assignmentTitle: ctx?.assignmentTitle || metadata.assignment_title,
        subjectId: ctx?.subjectId || undefined,
        subjectTitle: ctx?.subjectTitle || undefined,
        message: `AI-generated text probability flagged (${Math.round(aiProbability * 100)}%).`,
        createdAt: log.created_at,
      })
    }
  }

  return warnings
    .filter((w) => studentIds.includes(w.studentId))
    .sort((a, b) => {
      const rank: Record<string, number> = { high: 3, medium: 2, low: 1 }
      return rank[b.severity] - rank[a.severity]
    })
}

function buildTextSimilarityWarnings(
  studentIds: string[],
  studentNameById: Map<string, string>,
  assignmentContextById: Map<string, any>,
  studentAnswers: any[],
  blockAssignmentById: Map<string, { assignmentId: string; type: string }>
): AnalyticsWarning[] {
  const byAssignmentStudent = new Map<string, { text: string; latestAt: string | null }>()

  for (const answer of studentAnswers) {
    const studentId = answer.student_id
    if (!studentIds.includes(studentId)) continue
    const blockContext = blockAssignmentById.get(answer.block_id)
    if (!blockContext?.assignmentId) continue

    const text = extractAnswerText(answer.answer_data, blockContext.type)
    if (text.length < 30) continue

    const key = `${blockContext.assignmentId}::${studentId}`
    const current = byAssignmentStudent.get(key) || { text: '', latestAt: null as string | null }
    current.text = `${current.text}\n${text}`.trim()
    if (!current.latestAt || (answer.submitted_at && new Date(answer.submitted_at).getTime() > new Date(current.latestAt).getTime())) {
      current.latestAt = answer.submitted_at || current.latestAt
    }
    byAssignmentStudent.set(key, current)
  }

  const byAssignment = new Map<string, { studentId: string; text: string; latestAt: string | null }[]>()
  for (const [key, value] of byAssignmentStudent.entries()) {
    const [assignmentId, studentId] = key.split('::')
    const arr = byAssignment.get(assignmentId) || []
    arr.push({ studentId, text: value.text, latestAt: value.latestAt })
    byAssignment.set(assignmentId, arr)
  }

  const warnings: AnalyticsWarning[] = []
  for (const [assignmentId, rows] of byAssignment.entries()) {
    if (rows.length < 2) continue
    const maxByStudent = new Map<string, number>()
    const latestByStudent = new Map<string, string | null>()

    for (let i = 0; i < rows.length; i++) {
      latestByStudent.set(rows[i].studentId, rows[i].latestAt)
      for (let j = i + 1; j < rows.length; j++) {
        const similarity = textSimilarity(rows[i].text, rows[j].text)
        maxByStudent.set(rows[i].studentId, Math.max(maxByStudent.get(rows[i].studentId) || 0, similarity))
        maxByStudent.set(rows[j].studentId, Math.max(maxByStudent.get(rows[j].studentId) || 0, similarity))
      }
    }

    const ctx = assignmentContextById.get(assignmentId)
    for (const [studentId, ratio] of maxByStudent.entries()) {
      if (ratio < 0.82) continue
      const severity = ratio >= 0.92 ? 'high' : 'medium'
      warnings.push({
        id: `plagiarism-${assignmentId}-${studentId}`,
        studentId,
        studentName: studentNameById.get(studentId) || 'Unknown Student',
        severity,
        type: 'plagiarism',
        assignmentId,
        assignmentTitle: ctx?.assignmentTitle || 'Assignment',
        subjectId: ctx?.subjectId || undefined,
        subjectTitle: ctx?.subjectTitle || undefined,
        message: `High text similarity with another student answer (${Math.round(ratio * 100)}%).`,
        ratio,
        createdAt: latestByStudent.get(studentId) || undefined,
      })
    }
  }

  return warnings
}

function extractAnswerText(answerData: any, blockType: string): string {
  if (!answerData) return ''
  if (typeof answerData === 'string') return answerData.trim()
  if (Array.isArray(answerData)) return answerData.map((v) => String(v)).join(' ').trim()
  if (typeof answerData !== 'object') return ''

  if (typeof answerData.text === 'string') return answerData.text.trim()
  if (typeof answerData.answer === 'string') return answerData.answer.trim()
  if (typeof answerData.response === 'string') return answerData.response.trim()

  if (Array.isArray(answerData.answers)) {
    return answerData.answers.map((v: any) => String(v || '')).join(' ').trim()
  }
  if (Array.isArray(answerData.selected_answers)) {
    return answerData.selected_answers.join(' ').trim()
  }

  if (blockType === 'fill_in_blank' && Array.isArray(answerData.answers)) {
    return answerData.answers.join(' ').trim()
  }

  return ''
}

function textSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a)
  const tokensB = tokenize(b)
  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let intersection = 0
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++
  }
  const union = new Set<string>([...tokensA, ...tokensB]).size
  return union > 0 ? intersection / union : 0
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 4)
  )
}

function safeMetadata(metadata: any): Record<string, any> {
  if (!metadata) return {}
  if (typeof metadata === 'object' && !Array.isArray(metadata)) return metadata
  return {}
}

function pickToolTitle(metadata: Record<string, any>): string | null {
  const candidates = [
    metadata.title,
    metadata.assignment_title,
    metadata.quiz_title,
    metadata.flashcard_title,
    metadata.paragraph_title,
    metadata.material_title,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim()
  }
  return null
}
