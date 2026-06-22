# Analytics Implementation - Detailed Code Examples & Query Patterns

---

## 1. Database Query Patterns

### 1.1 Quiz Score to Topic Mapping

**Goal**: Get all quiz answers for a student with subject/topic context

```sql
SELECT 
  sa.id,
  sa.student_id,
  sa.block_id,
  sa.score,
  sa.is_correct,
  sa.submitted_at,
  b.assignment_id,
  b.type as block_type,
  a.title as assignment_title,
  a.paragraph_id,
  p.title as paragraph_title,
  p.chapter_id,
  c.title as chapter_title,
  c.subject_id,
  s.title as subject_title
FROM student_answers sa
LEFT JOIN blocks b ON sa.block_id = b.id
LEFT JOIN assignments a ON b.assignment_id = a.id
LEFT JOIN paragraphs p ON a.paragraph_id = p.id
LEFT JOIN chapters c ON p.chapter_id = c.id
LEFT JOIN subjects s ON c.subject_id = s.id
WHERE sa.student_id = $1
  AND sa.submitted_at >= NOW() - INTERVAL '90 days'
ORDER BY sa.submitted_at DESC;
```

**Why this pattern**:
- Navigates FK chain: answers → blocks → assignments → paragraphs → chapters → subjects
- Includes block type to distinguish quiz questions from other content
- LEFT JOIN to handle partial hierarchies (some assignments might not have paragraphs)
- Filters to last 90 days for performance

---

### 1.2 Per-Topic Aggregate (Student View)

```sql
WITH scored_answers AS (
  SELECT 
    c.subject_id,
    s.title as subject_title,
    sa.score,
    sa.is_correct,
    sa.submitted_at,
    b.id as block_id,
    CASE 
      WHEN sa.score IS NOT NULL THEN sa.score
      WHEN sa.is_correct = true THEN 100
      WHEN sa.is_correct = false THEN 0
      ELSE NULL
    END as effective_score
  FROM student_answers sa
  LEFT JOIN blocks b ON sa.block_id = b.id
  LEFT JOIN assignments a ON b.assignment_id = a.id
  LEFT JOIN paragraphs p ON a.paragraph_id = p.id
  LEFT JOIN chapters c ON p.chapter_id = c.id
  LEFT JOIN subjects s ON c.subject_id = s.id
  WHERE sa.student_id = $1
    AND c.subject_id IS NOT NULL
    AND sa.submitted_at >= NOW() - INTERVAL '90 days'
)
SELECT 
  subject_id as topic_id,
  subject_title as topic_title,
  COUNT(DISTINCT block_id) as total_questions,
  COUNT(CASE WHEN is_correct = true THEN 1 END) as correct_answers,
  AVG(effective_score) as average_score,
  COUNT(*) as total_attempts,
  MIN(submitted_at) as first_attempt_at,
  MAX(submitted_at) as last_attempt_at
FROM scored_answers
GROUP BY subject_id, subject_title
ORDER BY average_score DESC;
```

**Why this pattern**:
- Uses CTE (WITH clause) for readability
- Handles mixed scoring: explicit score field OR is_correct boolean
- Aggregates at subject level with multiple metrics
- Returns both count (attempts) and average for context

---

### 1.3 Performance Trend Over Time (Daily Buckets)

```sql
SELECT 
  DATE(sa.submitted_at) as date,
  AVG(CASE 
    WHEN sa.score IS NOT NULL THEN sa.score
    WHEN sa.is_correct = true THEN 100
    WHEN sa.is_correct = false THEN 0
    ELSE NULL
  END) as average_score,
  COUNT(DISTINCT sa.id) as attempts_count,
  COUNT(DISTINCT c.subject_id) as topics_reviewed
FROM student_answers sa
LEFT JOIN blocks b ON sa.block_id = b.id
LEFT JOIN assignments a ON b.assignment_id = a.id
LEFT JOIN paragraphs p ON a.paragraph_id = p.id
LEFT JOIN chapters c ON p.chapter_id = c.id
WHERE sa.student_id = $1
  AND sa.submitted_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(sa.submitted_at)
ORDER BY date ASC;
```

---

### 1.4 Class-Wide Quiz Analysis (Error Rate by Question)

```sql
WITH class_members AS (
  SELECT user_id FROM class_members WHERE class_id = $1
),
quiz_results AS (
  SELECT 
    sa.student_id,
    b.id as block_id,
    b.assignment_id,
    a.title as assignment_title,
    c.subject_id,
    s.title as subject_title,
    sa.score,
    sa.is_correct,
    sa.answer_data,
    sa.submitted_at,
    sa.graded_at,
    CASE 
      WHEN sa.score IS NOT NULL THEN sa.score
      WHEN sa.is_correct = true THEN 100
      WHEN sa.is_correct = false THEN 0
      ELSE NULL
    END as effective_score
  FROM student_answers sa
  LEFT JOIN blocks b ON sa.block_id = b.id
  LEFT JOIN assignments a ON b.assignment_id = a.id
  LEFT JOIN paragraphs p ON a.paragraph_id = p.id
  LEFT JOIN chapters c ON p.chapter_id = c.id
  LEFT JOIN subjects s ON c.subject_id = s.id
  WHERE sa.student_id IN (SELECT user_id FROM class_members)
    AND sa.submitted_at >= NOW() - INTERVAL '30 days'
)
SELECT 
  block_id,
  assignment_id,
  assignment_title,
  subject_id,
  subject_title,
  COUNT(DISTINCT student_id) as students_attempted,
  AVG(effective_score) as average_score,
  (COUNT(CASE WHEN is_correct = false THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0) * 100) as error_rate
FROM quiz_results
GROUP BY block_id, assignment_id, assignment_title, subject_id, subject_title
ORDER BY error_rate DESC;
```

---

### 1.5 Common Wrong Answers (For Open Questions)

```sql
SELECT 
  b.id as block_id,
  a.title as assignment_title,
  sa.answer_data::text as answer_text,
  COUNT(*) as frequency,
  (COUNT(*)::FLOAT / (SELECT COUNT(*) FROM student_answers sa2 
    WHERE sa2.block_id = b.id AND sa2.is_correct = false) * 100) as percentage
FROM student_answers sa
LEFT JOIN blocks b ON sa.block_id = b.id
LEFT JOIN assignments a ON b.assignment_id = a.id
WHERE b.id = $1
  AND sa.is_correct = false
  AND b.type = 'open_question'
  AND sa.answer_data IS NOT NULL
GROUP BY b.id, a.title, sa.answer_data::text
HAVING COUNT(*) >= 2  -- Only mistakes made by 2+ students
ORDER BY frequency DESC
LIMIT 5;
```

---

## 2. API Endpoint Implementation Details

### 2.1 `/api/student/analytics/detailed/route.ts`

**Location**: `/app/api/student/analytics/detailed/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { StudentAnalyticsDetail, StudentTopicScore, StudentPerformanceTrend } from '@/lib/types'

export const dynamic = 'force-dynamic'

const CACHE_DURATION = 60 * 60 * 1000 // 1 hour
const cache = new Map<string, { data: any; timestamp: number }>()

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const cacheKey = `student-analytics-${userId}`

    // Check cache
    const cached = cache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json(cached.data)
    }

    // Fetch all student answers with context
    const { data: answers, error: answersError } = await supabase
      .from('student_answers')
      .select(`
        id, student_id, block_id, score, is_correct, submitted_at,
        blocks!inner(id, assignment_id, type),
        blocks!inner(
          assignments!inner(id, title, paragraph_id),
          assignments!inner(
            paragraphs!inner(id, title, chapter_id),
            paragraphs!inner(
              chapters!inner(id, subject_id, title),
              chapters!inner(subjects!inner(id, title))
            )
          )
        )
      `)
      .eq('student_id', userId)
      .gte('submitted_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('submitted_at', { ascending: false })

    if (answersError) {
      return NextResponse.json(
        { error: answersError.message },
        { status: 500 }
      )
    }

    // Transform and aggregate data
    const scoresByTopic = aggregateScoresByTopic(answers || [])
    const performanceTrend = extractPerformanceTrend(answers || [])
    const { strongTopics, weakTopics } = identifyStrongWeakTopics(scoresByTopic)
    const summary = generateSummary(scoresByTopic, performanceTrend)

    const result: StudentAnalyticsDetail = {
      scoresByTopic,
      performanceTrend,
      strongTopics,
      weakTopics,
      summary,
    }

    // Cache result
    cache.set(cacheKey, { data: result, timestamp: Date.now() })

    return NextResponse.json(result)
  } catch (err) {
    console.error('Analytics fetch error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function aggregateScoresByTopic(answers: any[]): StudentTopicScore[] {
  const map = new Map<string, {
    topicId: string
    topicTitle: string
    quizzes: any[]
    scores: number[]
  }>()

  for (const answer of answers) {
    // Navigate nested structure
    const block = answer.blocks
    if (!block || !Array.isArray(block) || block.length === 0) continue
    
    const assignment = block[0]?.assignments
    if (!assignment || !Array.isArray(assignment) || assignment.length === 0) continue
    
    const paragraph = assignment[0]?.paragraphs
    if (!paragraph || !Array.isArray(paragraph) || paragraph.length === 0) continue
    
    const chapter = paragraph[0]?.chapters
    if (!chapter || !Array.isArray(chapter) || chapter.length === 0) continue
    
    const subject = chapter[0]?.subjects
    if (!subject || !Array.isArray(subject) || subject.length === 0) continue

    const topicId = subject[0]?.id
    const topicTitle = subject[0]?.title
    if (!topicId) continue

    const effectiveScore = answer.score ?? (answer.is_correct ? 100 : 0)
    
    const entry = map.get(topicId) || {
      topicId,
      topicTitle,
      quizzes: [],
      scores: [],
    }

    entry.scores.push(effectiveScore)
    entry.quizzes.push({
      quizId: block[0]?.id,
      quizTitle: assignment[0]?.title || 'Quiz',
      score: effectiveScore,
      totalQuestions: 1, // Would need to aggregate per quiz separately
      correctAnswers: answer.is_correct ? 1 : 0,
      attemptedAt: answer.submitted_at,
    })

    map.set(topicId, entry)
  }

  return Array.from(map.values()).map(entry => ({
    topicId: entry.topicId,
    topicTitle: entry.topicTitle,
    quizzes: entry.quizzes,
    averageScore: Math.round(
      entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
    ),
    totalAttempts: entry.scores.length,
    performanceRating: getPerformanceRating(
      entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
    ),
  }))
}

function extractPerformanceTrend(answers: any[]): StudentPerformanceTrend[] {
  const byDate = new Map<string, {
    scores: number[]
    topicsSet: Set<string>
    quizzesCount: number
  }>()

  for (const answer of answers) {
    const date = new Date(answer.submitted_at).toISOString().split('T')[0]
    const effectiveScore = answer.score ?? (answer.is_correct ? 100 : 0)
    
    const block = answer.blocks?.[0]
    const assignment = block?.assignments?.[0]
    const paragraph = assignment?.paragraphs?.[0]
    const chapter = paragraph?.chapters?.[0]
    const subject = chapter?.subjects?.[0]
    const topicId = subject?.id || 'unknown'

    const entry = byDate.get(date) || {
      scores: [],
      topicsSet: new Set(),
      quizzesCount: 0,
    }

    entry.scores.push(effectiveScore)
    entry.topicsSet.add(topicId)
    entry.quizzesCount += 1

    byDate.set(date, entry)
  }

  return Array.from(byDate.entries())
    .map(([date, data]) => ({
      date,
      averageScore: Math.round(
        data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      ),
      quizzesCompleted: data.quizzesCount,
      topicsReviewed: Array.from(data.topicsSet),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function identifyStrongWeakTopics(topics: StudentTopicScore[]) {
  const sorted = [...topics].sort((a, b) => b.averageScore - a.averageScore)
  
  const strong = sorted.slice(0, Math.ceil(sorted.length * 0.25)).map(t => ({
    topicId: t.topicId,
    topicTitle: t.topicTitle,
    averageScore: t.averageScore,
    reason: `Consistently scoring ${t.averageScore}% on ${t.topicTitle} assessments.`,
  }))

  const weak = sorted.slice(Math.floor(sorted.length * 0.75)).map(t => ({
    topicId: t.topicId,
    topicTitle: t.topicTitle,
    averageScore: t.averageScore,
    reason: `Focus area: ${t.averageScore}% average, consider additional practice.`,
  }))

  return { strongTopics: strong, weakTopics: weak }
}

function generateSummary(topics: StudentTopicScore[], trend: StudentPerformanceTrend[]) {
  const allScores = topics.flatMap(t => 
    t.quizzes.map(q => q.score)
  )
  const overallAvg = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0

  const bestTopic = topics.reduce((prev, curr) =>
    curr.averageScore > (prev?.averageScore ?? 0) ? curr : prev, null as any)
  const worstTopic = topics.reduce((prev, curr) =>
    curr.averageScore < (prev?.averageScore ?? 100) ? curr : prev, null as any)

  // Calculate improvement: compare first vs last week
  const improvementRate = trend.length > 7
    ? Math.round(
      ((trend[trend.length - 1]?.averageScore ?? 0) -
       (trend[Math.max(0, trend.length - 7)]?.averageScore ?? 0))
    )
    : 0

  return {
    totalQuizzesTaken: topics.reduce((sum, t) => sum + t.totalAttempts, 0),
    overallAverageScore: overallAvg,
    bestPerformingTopic: bestTopic?.topicTitle || 'N/A',
    needsWorkTopic: worstTopic?.topicTitle || 'N/A',
    improvementRate,
  }
}

function getPerformanceRating(score: number): 'excellent' | 'good' | 'fair' | 'needs-improvement' {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 60) return 'fair'
  return 'needs-improvement'
}
```

**Key implementation notes**:
- Handles nested Supabase relations carefully (check for arrays/existence before accessing)
- Implements simple in-memory caching to avoid repeated queries
- Transforms raw data into UI-friendly structures
- Calculations are server-side (efficiency + security)

---

### 2.2 `/api/student/notes/check/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NotesCheckResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get('topicId')

    if (!topicId) {
      return NextResponse.json(
        { error: 'topicId parameter required' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // Check for student notes on this topic
    // Note: Assumes student_notes table exists with (student_id, topic_id, content, created_at)
    const { data: notes, error: notesError } = await supabase
      .from('student_notes')
      .select('id, created_at')
      .eq('student_id', userId)
      .eq('topic_id', topicId)
      .maybeSingle()

    if (notesError && notesError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Notes check error:', notesError)
    }

    // Check for student activity on this topic
    // Activity = any student_answers where the topic matches
    const { data: activity, error: activityError } = await supabase
      .from('student_answers')
      .select(`
        id, submitted_at,
        blocks!inner(assignment_id),
        blocks!inner(
          assignments!inner(paragraph_id),
          assignments!inner(
            paragraphs!inner(chapter_id),
            paragraphs!inner(
              chapters!inner(subject_id),
              chapters!inner(subjects!inner(id))
            )
          )
        )
      `)
      .eq('student_id', userId)
      .eq('blocks.assignments.paragraphs.chapters.subjects.id', topicId)
      .limit(1)

    if (activityError && activityError.code !== 'PGRST116') {
      console.error('Activity check error:', activityError)
    }

    const hasNotes = !!notes
    const hasActivity = (activity || []).length > 0
    const lastActivity = hasActivity ? activity?.[0]?.submitted_at : null
    const notesCreatedAt = hasNotes ? notes?.created_at : null

    const response: NotesCheckResponse = {
      topicId,
      hasNotes,
      hasActivity,
      lastActivityAt: lastActivity,
      notesCreatedAt,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('Notes check error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### 2.3 `/api/classes/[classId]/analytics/detailed/route.ts` (Abbreviated)

```typescript
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { TeacherAnalyticsDetail, QuizMetric, TopicErrorRate } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const topicFilter = searchParams.get('topicFilter')?.split(',') || []

    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { classId } = await params

    // Verify teacher access to class
    const { data: classMember } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!classMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch class members
    const { data: members } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)

    const studentIds = (members || []).map(m => m.user_id)
    if (studentIds.length === 0) {
      return NextResponse.json({
        quizMetrics: [],
        topicErrorRates: [],
        classMetaMetrics: {
          totalQuizzes: 0,
          totalStudents: 0,
          overallClassAverage: 0,
          averageCompletionRate: 0,
          mostDifficultTopic: null,
          easiestTopic: null,
        },
      })
    }

    // Fetch all student answers for the class
    const { data: answers } = await supabase
      .from('student_answers')
      .select(`
        id, student_id, score, is_correct, submitted_at,
        blocks!inner(id, assignment_id, type),
        blocks!inner(
          assignments!inner(id, title, paragraph_id, class_id),
          assignments!inner(
            paragraphs!inner(id, chapter_id),
            paragraphs!inner(
              chapters!inner(id, subject_id),
              chapters!inner(subjects!inner(id, title))
            )
          )
        )
      `)
      .in('student_id', studentIds)
      .eq('blocks.assignments.class_id', classId)
      .gte('submitted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Transform answers into quiz metrics
    const quizMetrics = buildQuizMetrics(answers || [], topicFilter)
    const topicErrorRates = calculateTopicErrorRates(answers || [])
    const classMetaMetrics = calculateClassMetaMetrics(quizMetrics, studentIds.length)

    const result: TeacherAnalyticsDetail = {
      quizMetrics,
      topicErrorRates,
      classMetaMetrics,
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Teacher analytics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildQuizMetrics(answers: any[], topicFilter: string[]): QuizMetric[] {
  const metricsMap = new Map<string, any>()

  for (const answer of answers) {
    const block = answer.blocks?.[0]
    if (!block) continue
    
    const assignment = block.assignments?.[0]
    const paragraph = assignment?.paragraphs?.[0]
    const chapter = paragraph?.chapters?.[0]
    const subject = chapter?.subjects?.[0]

    if (!assignment || !subject) continue

    // Filter by topic if specified
    if (topicFilter.length > 0 && !topicFilter.includes(subject.id)) {
      continue
    }

    const key = `${assignment.id}::${block.id}`
    const entry = metricsMap.get(key) || {
      quizId: assignment.id,
      quizTitle: assignment.title,
      assignmentId: assignment.id,
      topicId: subject.id,
      topicTitle: subject.title,
      scores: [],
      students: new Set(),
      questionMetrics: new Map(),
    }

    const effectiveScore = answer.score ?? (answer.is_correct ? 100 : 0)
    entry.scores.push(effectiveScore)
    entry.students.add(answer.student_id)

    // Track per-question metrics
    const qKey = block.id
    const qEntry = entry.questionMetrics.get(qKey) || {
      blockId: block.id,
      questionType: block.type,
      correct: 0,
      total: 0,
      wrongAnswers: [],
    }
    qEntry.total += 1
    if (answer.is_correct) qEntry.correct += 1
    else qEntry.wrongAnswers.push(answer.answer_data)

    entry.questionMetrics.set(qKey, qEntry)
    metricsMap.set(key, entry)
  }

  return Array.from(metricsMap.values()).map(entry => ({
    quizId: entry.quizId,
    quizTitle: entry.quizTitle,
    assignmentId: entry.assignmentId,
    topicId: entry.topicId,
    topicTitle: entry.topicTitle,
    classAverage: Math.round(
      entry.scores.reduce((a: number, b: number) => a + b, 0) / entry.scores.length
    ),
    studentCount: entry.students.size,
    completionRate: Math.round((entry.students.size / (entry.students.size || 1)) * 100),
    questionAnalysis: Array.from(entry.questionMetrics.values()).map(q => ({
      blockId: q.blockId,
      questionText: 'Question',
      questionType: q.questionType,
      correctRate: Math.round((q.correct / q.total) * 100),
      commonMistakes: aggregateWrongAnswers(q.wrongAnswers).slice(0, 3),
      averageTimeSeconds: 0, // Would need activity_logs for this
    })),
  }))
}

function aggregateWrongAnswers(answers: any[]): Array<{answer: string; frequency: number; percentage: number}> {
  const map = new Map<string, number>()
  for (const ans of answers) {
    const key = JSON.stringify(ans)
    map.set(key, (map.get(key) || 0) + 1)
  }
  const total = answers.length
  return Array.from(map.entries())
    .map(([ans, freq]) => ({
      answer: JSON.parse(ans),
      frequency: freq,
      percentage: Math.round((freq / total) * 100),
    }))
    .sort((a, b) => b.frequency - a.frequency)
}

function calculateTopicErrorRates(answers: any[]): TopicErrorRate[] {
  const topicMap = new Map<string, {
    total: number
    incorrect: number
    quizzes: Set<string>
  }>()

  for (const answer of answers) {
    const block = answer.blocks?.[0]
    const assignment = block?.assignments?.[0]
    const chapter = assignment?.paragraphs?.[0]?.chapters?.[0]
    const subject = chapter?.subjects?.[0]

    if (!subject) continue

    const entry = topicMap.get(subject.id) || {
      total: 0,
      incorrect: 0,
      quizzes: new Set(),
    }
    entry.total += 1
    if (!answer.is_correct) entry.incorrect += 1
    entry.quizzes.add(assignment.id)
    topicMap.set(subject.id, entry)
  }

  return Array.from(topicMap.entries()).map(([topicId, data]) => ({
    topicId,
    topicTitle: '', // Would need subject title from query
    averageErrorRate: Math.round((data.incorrect / data.total) * 100),
    quizCount: data.quizzes.size,
    trend: 'stable' as const, // Would need trend analysis
  }))
}

function calculateClassMetaMetrics(quizMetrics: QuizMetric[], studentCount: number) {
  const avgScores = quizMetrics.map(q => q.classAverage)
  const overallAvg = avgScores.length > 0
    ? Math.round(avgScores.reduce((a, b) => a + b, 0) / avgScores.length)
    : 0

  return {
    totalQuizzes: quizMetrics.length,
    totalStudents: studentCount,
    overallClassAverage: overallAvg,
    averageCompletionRate: 85, // Placeholder
    mostDifficultTopic: null,
    easiestTopic: null,
  }
}
```

---

## 3. Component Implementation Examples

### 3.1 `StudentAnalyticsCharts.tsx`

```typescript
'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { StudentPerformanceTrend, StudentTopicScore } from '@/lib/types'

interface StudentAnalyticsChartsProps {
  performanceTrend: StudentPerformanceTrend[]
  scoresByTopic: StudentTopicScore[]
}

export function StudentAnalyticsCharts({
  performanceTrend,
  scoresByTopic,
}: StudentAnalyticsChartsProps) {
  return (
    <div className="grid gap-6">
      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trend (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 100]}
                label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 4 }}
                formatter={(value: number) => `${Math.round(value)}%`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="averageScore" 
                stroke="#6b7c4e" 
                name="Avg Score"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Topic Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Scores by Topic</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoresByTopic.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="topicTitle" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                domain={[0, 100]}
              />
              <Tooltip 
                formatter={(value: number) => `${Math.round(value)}%`}
              />
              <Bar 
                dataKey="averageScore" 
                fill="#6b7c4e"
                name="Average Score"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### 3.2 `NotesReminder.tsx` (Full Implementation)

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, X } from 'lucide-react'

const BRAND = '#6b7c4e'
const DISMISSAL_TTL_DAYS = 30

interface NotesReminderProps {
  topicId: string
  topicTitle: string
  onNotesTaken?: () => void
  dismissable?: boolean
}

export function NotesReminder({
  topicId,
  topicTitle,
  onNotesTaken,
  dismissable = true,
}: NotesReminderProps) {
  const [isDismissed, setIsDismissed] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const dismissKey = `cautie:notes-reminder:dismissed:${topicId}`
    const storedTime = localStorage.getItem(dismissKey)

    // Check if dismissal flag is still valid (< 30 days old)
    if (storedTime) {
      const daysSince = (Date.now() - parseInt(storedTime, 10)) / (1000 * 60 * 60 * 24)
      if (daysSince < DISMISSAL_TTL_DAYS) {
        setIsDismissed(true)
        setIsLoading(false)
        return
      } else {
        localStorage.removeItem(dismissKey)
      }
    }

    // Check if user has notes and activity on this topic
    async function checkNotesStatus() {
      try {
        const res = await fetch(`/api/student/notes/check?topicId=${topicId}`, {
          cache: 'no-store',
        })

        if (!res.ok) {
          console.error('Failed to check notes status')
          setIsDismissed(true)
          setIsLoading(false)
          return
        }

        const { hasNotes, hasActivity } = await res.json()

        // Show reminder only if: has activity + no notes
        setIsDismissed(hasNotes || !hasActivity)
      } catch (err) {
        console.error('Notes check error:', err)
        setIsDismissed(true) // Default: hide on error
      } finally {
        setIsLoading(false)
      }
    }

    void checkNotesStatus()
  }, [topicId])

  const handleDismiss = () => {
    const dismissKey = `cautie:notes-reminder:dismissed:${topicId}`
    localStorage.setItem(dismissKey, Date.now().toString())
    setIsDismissed(true)
  }

  const handleCreateNotes = () => {
    onNotesTaken?.()
    // Navigate to notes page; dismissal handled on return
  }

  if (isLoading || isDismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm animate-in slide-in-from-bottom-4">
      <Card
        className="border shadow-lg"
        style={{ borderColor: `${BRAND}40`, backgroundColor: `${BRAND}05` }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText
              className="h-5 w-5 shrink-0 mt-1"
              style={{ color: BRAND }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">
                Add notes for "{topicTitle}"
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You've completed quizzes on this topic. Add notes to improve
                retention.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleCreateNotes}
                  style={{ backgroundColor: BRAND, color: 'white' }}
                  className="hover:opacity-90"
                >
                  Create notes
                </Button>
                {dismissable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                    className="text-xs h-8"
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
            {dismissable && (
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground mt-1"
                aria-label="Close reminder"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 4. Integration Points

### 4.1 Quiz Results Page Integration

**File**: `/app/(main)/tools/quiz/[quizId]/results/page.tsx` (hypothetical)

```typescript
import { NotesReminder } from '@/components/notes/NotesReminder'

export default function QuizResultsPage({
  params: { quizId },
}: {
  params: { quizId: string }
}) {
  // Extract topicId from quiz context
  const topicId = getTopicIdFromQuiz(quizId) // Helper function

  return (
    <>
      {/* Existing results UI */}
      <div>Quiz Results...</div>

      {/* Notes reminder */}
      <NotesReminder
        topicId={topicId}
        topicTitle="Current Topic Name"
        onNotesTaken={() => console.log('User clicked Create Notes')}
      />
    </>
  )
}
```

---

### 4.2 Class Page Integration

**File**: `/app/(main)/class/[classId]/page.tsx` (hypothetical)

```typescript
import { NotesReminder } from '@/components/notes/NotesReminder'

export default function ClassPage({
  params: { classId },
  searchParams,
}: {
  params: { classId: string }
  searchParams: { topicId?: string }
}) {
  const topicId = searchParams.topicId

  return (
    <>
      {/* Class content */}
      <div>Class materials...</div>

      {/* Show reminder only if topicId is in URL */}
      {topicId && (
        <NotesReminder
          topicId={topicId}
          topicTitle="Topic from context"
        />
      )}
    </>
  )
}
```

---

## 5. Error Handling & Edge Cases

### 5.1 Missing Relations
If a `student_answer` doesn't have a complete FK chain (e.g., assignment has no paragraph):
```typescript
const safeNavigate = (obj: any, path: string[], fallback: any = null) => {
  let current = obj
  for (const key of path) {
    if (!current || typeof current !== 'object') return fallback
    current = current[key]
  }
  return current ?? fallback
}

// Usage:
const topicId = safeNavigate(answer, ['blocks', 0, 'assignments', 0, 'paragraphs', 0, 'chapters', 0, 'subjects', 0, 'id'])
```

### 5.2 Empty student_answers
Return empty analytics structure:
```typescript
const defaultAnalytics: StudentAnalyticsDetail = {
  scoresByTopic: [],
  performanceTrend: [],
  strongTopics: [],
  weakTopics: [],
  summary: {
    totalQuizzesTaken: 0,
    overallAverageScore: 0,
    bestPerformingTopic: 'No data yet',
    needsWorkTopic: 'No data yet',
    improvementRate: 0,
  },
}
```

### 5.3 student_notes Table Doesn't Exist
Gracefully handle table-not-found error:
```typescript
if (notesError?.code === 'PGRST116' || notesError?.message?.includes('relation')) {
  // Table doesn't exist; assume no notes
  return NextResponse.json({
    hasNotes: false,
    hasActivity: (activity || []).length > 0,
    lastActivityAt: activity?.[0]?.submitted_at || null,
    notesCreatedAt: null,
  })
}
```

---

## 6. Testing Utilities

### 6.1 Mock Data Generator

```typescript
// For testing endpoints
export function generateMockStudentAnswers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `answer-${i}`,
    student_id: 'test-student',
    block_id: `block-${Math.floor(Math.random() * 5)}`,
    score: Math.round(Math.random() * 100),
    is_correct: Math.random() > 0.5,
    submitted_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    blocks: [{
      id: `block-${Math.floor(Math.random() * 5)}`,
      assignment_id: `assignment-${Math.floor(Math.random() * 3)}`,
      type: 'multiple_choice',
      assignments: [{
        id: `assignment-${Math.floor(Math.random() * 3)}`,
        title: `Quiz ${Math.floor(Math.random() * 3)}`,
        paragraph_id: 'paragraph-1',
        paragraphs: [{
          id: 'paragraph-1',
          chapter_id: 'chapter-1',
          chapters: [{
            id: 'chapter-1',
            subject_id: 'subject-1',
            subjects: [{
              id: 'subject-1',
              title: 'Math',
            }],
          }],
        }],
      }],
    }],
  }))
}
```

---

## 7. Performance Optimization Checklist

- [ ] Add database index on `student_answers(student_id, submitted_at)`
- [ ] Add database index on `student_answers(student_id, block_id)`
- [ ] Cache API responses for 1 hour (already implemented in endpoint code)
- [ ] Limit query results to last 90 days for student analytics
- [ ] Paginate quiz metrics in teacher view (show 10 at a time)
- [ ] Use server-side filtering instead of client-side for large datasets
- [ ] Lazy-load charts with Suspense boundary
- [ ] Compress JSON responses with zstandard or gzip (handled by Next.js)

---

**End of Implementation Details**
