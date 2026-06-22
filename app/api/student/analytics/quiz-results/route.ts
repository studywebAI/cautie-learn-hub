import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type TopicAnalytics = {
  topicId: string
  topicName: string
  totalAttempts: number
  averageScore: number
  correctAnswers: number
  incorrectAnswers: number
  lastAttemptDate: string | null
}

type QuizResult = {
  id: string
  score: number
  isCorrect: boolean
  submittedAt: string
  topicId: string
  topicName: string
  assignmentTitle: string
}

type TrendData = {
  date: string
  averageScore: number
  attemptCount: number
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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500)
    const topicId = url.searchParams.get('topicId')

    // Get student answers with full context (topic/subject)
    let query = (supabase as any)
      .from('student_answers')
      .select(`
        id,
        score,
        is_correct,
        submitted_at,
        blocks!inner(
          id,
          assignment_id,
          assignments!inner(
            id,
            title,
            paragraph_id,
            paragraphs!inner(
              id,
              title,
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
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(limit)

    const { data: answers, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Aggregate by topic
    const topicMap = new Map<string, TopicAnalytics>()
    const quizResults: QuizResult[] = []
    const trendMap = new Map<string, { scores: number[]; count: number }>()

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

      const topicId = subject.id
      const topicName = subject.title
      const score = answer.score ?? 0
      const isCorrect = answer.is_correct ?? false
      const date = answer.submitted_at ? new Date(answer.submitted_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

      // Build topic aggregation
      const existing = topicMap.get(topicId) || {
        topicId,
        topicName,
        totalAttempts: 0,
        averageScore: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        lastAttemptDate: null,
      }

      existing.totalAttempts++
      existing.correctAnswers += isCorrect ? 1 : 0
      existing.incorrectAnswers += isCorrect ? 0 : 1
      existing.lastAttemptDate = answer.submitted_at

      if (existing.totalAttempts > 0) {
        existing.averageScore = Math.round(
          (existing.correctAnswers / existing.totalAttempts) * 100
        )
      }

      topicMap.set(topicId, existing)

      // Build trend data
      const trendKey = date
      const trend = trendMap.get(trendKey) || { scores: [], count: 0 }
      trend.scores.push(score)
      trend.count++
      trendMap.set(trendKey, trend)

      // Build quiz results array
      quizResults.push({
        id: answer.id,
        score,
        isCorrect,
        submittedAt: answer.submitted_at || new Date().toISOString(),
        topicId,
        topicName,
        assignmentTitle: assignment.title || 'Untitled Assignment',
      })
    }

    // Convert trend data to sorted array
    const trendArray: TrendData[] = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        averageScore: Math.round(data.scores.reduce((sum: number, a: number) => sum + a, 0) / data.scores.length),
        attemptCount: data.count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Get strongest and weakest topics
    const topicsArray = Array.from(topicMap.values())
    const strongTopics = topicsArray
      .filter(t => t.totalAttempts >= 2)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5)

    const weakTopics = topicsArray
      .filter(t => t.totalAttempts >= 2)
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 5)

    return NextResponse.json({
      quizResults,
      topicAnalytics: Array.from(topicMap.values()),
      strongTopics,
      weakTopics,
      scoreTrend: trendArray,
      summary: {
        totalAttempts: safe.length,
        averageScore: safe.length > 0
          ? Math.round(safe.reduce((sum: number, a: any) => sum + (a.score ?? 0), 0) / safe.length)
          : 0,
      },
    })
  } catch (err) {
    console.error('Analytics error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
