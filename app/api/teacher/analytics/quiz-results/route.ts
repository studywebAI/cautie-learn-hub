import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ClassQuizAnalytics = {
  classId: string
  className: string
  totalStudents: number
  quizzes: {
    quizId: string
    quizTitle: string
    topicId: string
    topicName: string
    averageScore: number
    completionRate: number
    totalAttempts: number
    errorRate: number
  }[]
  topicErrorRates: Array<{
    topicId: string
    topicName: string
    errorRate: number
    averageScore: number
    attemptCount: number
  }>
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const classIds = url.searchParams.getAll('classId')

    // Get classes the teacher owns/teaches
    const { data: teacherClasses } = await supabase
      .from('class_members')
      .select('class_id, classes!inner(id, name)')
      .eq('user_id', user.id)

    if (!teacherClasses || teacherClasses.length === 0) {
      return NextResponse.json({ classes: [] })
    }

    const availableClassIds = teacherClasses.map(c => c.class_id)
    const classesToAnalyze = classIds.length > 0
      ? availableClassIds.filter(id => classIds.includes(id))
      : availableClassIds

    const results: ClassQuizAnalytics[] = []

    for (const classId of classesToAnalyze) {
      const classInfo = teacherClasses.find((c: any) => c.class_id === classId)
      if (!classInfo) continue

      // Get all students in class
      const { data: classMembers } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', classId)

      const studentIds = classMembers?.map(m => m.user_id) || []

      if (studentIds.length === 0) {
        results.push({
          classId,
          className: (classInfo as any).classes?.name || 'Unknown Class',
          totalStudents: 0,
          quizzes: [],
          topicErrorRates: [],
        })
        continue
      }

      // Get assignments for this class
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, title, paragraph_id')
        .eq('class_id', classId)

      const assignmentIds = assignments?.map((a: any) => a.id) || []

      if (assignmentIds.length === 0) {
        results.push({
          classId,
          className: (classInfo as any).classes?.name || 'Unknown Class',
          totalStudents: studentIds.length,
          quizzes: [],
          topicErrorRates: [],
        })
        continue
      }

      // Get blocks for assignments
      const { data: blocks } = await supabase
        .from('blocks')
        .select('id, assignment_id')
        .in('assignment_id', assignmentIds)

      const blockIds = blocks?.map((b: any) => b.id) || []

      // Get student answers for these blocks
      const { data: answers } = blockIds.length > 0
        ? await supabase
          .from('student_answers')
          .select(`
            id,
            student_id,
            score,
            is_correct,
            blocks!inner(
              id,
              assignment_id,
              assignments!inner(
                id,
                title,
                paragraph_id,
                paragraphs!inner(
                  id,
                  chapter_id,
                  chapters!inner(
                    id,
                    subject_id,
                    subjects!inner(
                      id,
                      title
                    )
                  )
                )
              )
            )
          `)
          .in('student_id', studentIds)
          .in('blocks.id', blockIds)
        : { data: [] }

      // Aggregate by assignment and topic
      const quizMap = new Map<string, {
        quizId: string
        quizTitle: string
        topicId: string
        topicName: string
        scores: number[]
        studentCount: Set<string>
        correctCount: number
        totalCount: number
      }>()

      const topicMap = new Map<string, {
        topicId: string
        topicName: string
        scores: number[]
        correctCount: number
        totalCount: number
      }>()

      const safe = (answers || []).filter((a: any) => {
        return a?.blocks?.[0]?.assignments?.[0]?.paragraph_id &&
          a.blocks[0].assignments[0].paragraphs?.[0]?.chapter_id &&
          a.blocks[0].assignments[0].paragraphs[0].chapters?.[0]?.subject_id
      })

      for (const answer of safe) {
        const block = answer.blocks[0]
        const assignment = block.assignments[0]
        const paragraph = assignment.paragraphs[0]
        const chapter = paragraph.chapters[0]
        const subject = chapter.subjects[0]

        const quizId = assignment.id as string
        const topicId = subject.id as string

        // Aggregate by quiz
        const quizKey = quizId as string
        const existing = quizMap.get(quizKey) || {
          quizId,
          quizTitle: assignment.title || 'Untitled Quiz',
          topicId,
          topicName: subject.title,
          scores: [],
          studentCount: new Set<string>(),
          correctCount: 0,
          totalCount: 0,
        }

        existing.scores.push(answer.score ?? 0)
        existing.studentCount.add(answer.student_id)
        existing.correctCount += answer.is_correct ? 1 : 0
        existing.totalCount++
        quizMap.set(quizKey, existing)

        // Aggregate by topic
        const topicKey = topicId as string
        const topicExisting = topicMap.get(topicKey) || {
          topicId,
          topicName: subject.title,
          scores: [],
          correctCount: 0,
          totalCount: 0,
        }

        topicExisting.scores.push(answer.score ?? 0)
        topicExisting.correctCount += answer.is_correct ? 1 : 0
        topicExisting.totalCount++
        topicMap.set(topicKey, topicExisting)
      }

      const quizzes = Array.from(quizMap.values()).map(q => ({
        quizId: q.quizId,
        quizTitle: q.quizTitle,
        topicId: q.topicId,
        topicName: q.topicName,
        averageScore: q.scores.length > 0
          ? Math.round(q.scores.reduce((a, b) => a + b, 0) / q.scores.length)
          : 0,
        completionRate: Math.round((q.studentCount.size / studentIds.length) * 100),
        totalAttempts: q.totalCount,
        errorRate: q.totalCount > 0
          ? Math.round(((q.totalCount - q.correctCount) / q.totalCount) * 100)
          : 0,
      }))

      const topicErrorRates = Array.from(topicMap.values())
        .map(t => ({
          topicId: t.topicId,
          topicName: t.topicName,
          errorRate: t.totalCount > 0
            ? Math.round(((t.totalCount - t.correctCount) / t.totalCount) * 100)
            : 0,
          averageScore: t.scores.length > 0
            ? Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length)
            : 0,
          attemptCount: t.totalCount,
        }))
        .sort((a, b) => b.errorRate - a.errorRate)

      results.push({
        classId,
        className: (classInfo as any).classes?.name || 'Unknown Class',
        totalStudents: studentIds.length,
        quizzes: quizzes.sort((a, b) => b.averageScore - a.averageScore),
        topicErrorRates,
      })
    }

    return NextResponse.json({ classes: results })
  } catch (err) {
    console.error('Teacher analytics error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
