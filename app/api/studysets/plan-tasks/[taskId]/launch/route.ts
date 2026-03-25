import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ParsedSourceBundle = {
  notesText: string
  pastedText: string
  selectedDocuments: Array<{ id: string; name: string; mime_type?: string | null; web_url?: string | null }>
  uploadedFiles: Array<{ name: string; type?: string | null }>
  adaptive: {
    avg_score: number
    mastery_band: string
    weak_topics: string[]
  }
}

function parseSourceBundle(raw: unknown): ParsedSourceBundle {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { notesText: '', pastedText: '', selectedDocuments: [], uploadedFiles: [], adaptive: { avg_score: 0, mastery_band: '', weak_topics: [] } }
  }
  try {
    const parsed = JSON.parse(raw)
    const selectedDocuments = Array.isArray(parsed?.sources?.imports?.selected_documents)
      ? parsed.sources.imports.selected_documents
          .map((doc: any) => ({
            id: String(doc?.id || ''),
            name: String(doc?.name || ''),
            mime_type: typeof doc?.mime_type === 'string' ? doc.mime_type : null,
            web_url: typeof doc?.web_url === 'string' ? doc.web_url : null,
          }))
          .filter((doc: any) => doc.id && doc.name)
      : []

    const uploadedFiles = Array.isArray(parsed?.sources?.uploaded_files)
      ? parsed.sources.uploaded_files
          .map((file: any) => ({
            name: String(file?.name || ''),
            type: typeof file?.type === 'string' ? file.type : null,
          }))
          .filter((file: any) => file.name)
      : []

    const adaptiveWeak = parsed?.runtime?.adaptive?.weak_topic_counts
      ? Object.entries(parsed.runtime.adaptive.weak_topic_counts)
          .map(([topic, count]) => ({ topic: String(topic), count: Number(count || 0) }))
          .filter((item) => item.topic && item.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((item) => item.topic)
      : []

    return {
      notesText: typeof parsed?.sources?.notes_text === 'string' ? parsed.sources.notes_text.trim() : '',
      pastedText: typeof parsed?.sources?.pasted_text === 'string' ? parsed.sources.pasted_text.trim() : '',
      selectedDocuments,
      uploadedFiles,
      adaptive: {
        avg_score: Number(parsed?.runtime?.adaptive?.avg_score || 0),
        mastery_band: String(parsed?.runtime?.adaptive?.mastery_band || ''),
        weak_topics: adaptiveWeak,
      },
    }
  } catch {
    return { notesText: '', pastedText: '', selectedDocuments: [], uploadedFiles: [], adaptive: { avg_score: 0, mastery_band: '', weak_topics: [] } }
  }
}

function buildSourceText(studysetName: string, taskTitle: string, taskDescription: string, bundle: ParsedSourceBundle): string {
  const sections: string[] = []

  if (bundle.notesText) sections.push(`STUDYSET NOTES\n${bundle.notesText}`)
  if (bundle.pastedText) sections.push(`PASTED SOURCE MATERIAL\n${bundle.pastedText}`)

  if (bundle.uploadedFiles.length > 0) {
    const files = bundle.uploadedFiles.map((file) => `- ${file.name}${file.type ? ` (${file.type})` : ''}`).join('\n')
    sections.push(`UPLOADED FILES\n${files}`)
  }

  if (bundle.selectedDocuments.length > 0) {
    const docs = bundle.selectedDocuments
      .map((doc) => `- ${doc.name}${doc.mime_type ? ` (${doc.mime_type})` : ''}${doc.web_url ? ` -> ${doc.web_url}` : ''}`)
      .join('\n')
    sections.push(`ONEDRIVE SELECTED FILES\n${docs}`)
  }

  if (bundle.adaptive.weak_topics.length > 0) {
    sections.push(`CURRENT WEAK AREAS\n${bundle.adaptive.weak_topics.map((topic) => `- ${topic}`).join('\n')}`)
  }

  if (sections.length === 0) {
    sections.push(`STUDYSET\n${studysetName}\n\nTASK\n${taskTitle}\n${taskDescription}`.trim())
  }

  return sections.join('\n\n')
}

function inferTool(taskType: string): 'notes' | 'flashcards' | 'quiz' {
  if (taskType === 'quiz') return 'quiz'
  if (taskType === 'flashcards') return 'flashcards'
  return 'notes'
}

function buildNotesPreset(taskTitle: string, estimatedMinutes: number, bundle: ParsedSourceBundle) {
  const title = taskTitle.toLowerCase()
  const length = bundle.adaptive.mastery_band === 'weak'
    ? 'long'
    : estimatedMinutes >= 30
      ? 'long'
      : estimatedMinutes <= 15
        ? 'short'
        : 'medium'
  const style = title.includes('map') ? 'structured' : 'structured'
  const audience = 'student'
  return { length, style, audience }
}

function buildFlashcardsPreset(taskTitle: string, estimatedMinutes: number, bundle: ParsedSourceBundle) {
  const title = taskTitle.toLowerCase()
  const masteryBoost = bundle.adaptive.mastery_band === 'weak' ? 6 : bundle.adaptive.mastery_band === 'strong' ? -2 : 0
  const count = Math.max(8, Math.min(28, Math.round((estimatedMinutes || 15) / 1.5) + masteryBoost))
  const mode = title.includes('quiz') ? 'mcq' : 'flip'
  const complexity = bundle.adaptive.mastery_band === 'strong'
    ? 'hard'
    : estimatedMinutes >= 25
      ? 'hard'
      : estimatedMinutes <= 12
        ? 'easy'
        : 'medium'
  return { count, mode, complexity }
}

function buildQuizPreset(taskTitle: string, taskDescription: string, estimatedMinutes: number, bundle: ParsedSourceBundle) {
  const copy = `${taskTitle} ${taskDescription}`.toLowerCase()
  const masteryBoost = bundle.adaptive.mastery_band === 'weak' ? 3 : bundle.adaptive.mastery_band === 'strong' ? -1 : 0
  const questionCount = Math.max(5, Math.min(18, Math.round((estimatedMinutes || 15) / 1.8) + masteryBoost))
  const mode = copy.includes('checkpoint') || copy.includes('final') ? 'practice' : 'practice'
  const difficultyProfile = bundle.adaptive.mastery_band === 'strong'
    ? 'hard'
    : copy.includes('final') || copy.includes('hard')
      ? 'hard'
      : 'balanced'
  const questionType = 'mixed'
  return { questionCount, mode, difficultyProfile, questionType }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const requestId = `studyset-launch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  try {
    const { taskId } = await params
    console.info('[studyset-launch] start', { requestId, taskId })
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.warn('[studyset-launch] unauthorized', { requestId, taskId, message: userError?.message || null })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: taskRow, error: taskError } = await (supabase as any)
      .from('studyset_plan_tasks')
      .select(`
        id,
        task_type,
        title,
        description,
        estimated_minutes,
        position,
        completed,
        studyset_plan_days!inner (
          id,
          day_number,
          plan_date,
          studysets!inner (
            id,
            user_id,
            name,
            source_bundle
          )
        )
      `)
      .eq('id', taskId)
      .eq('studyset_plan_days.studysets.user_id', user.id)
      .maybeSingle()

    if (taskError) {
      console.error('[studyset-launch] task query failed', { requestId, taskId, userId: user.id, message: taskError.message })
      return NextResponse.json({ error: taskError.message }, { status: 500 })
    }
    if (!taskRow) {
      console.warn('[studyset-launch] task not found', { requestId, taskId, userId: user.id })
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const day = taskRow.studyset_plan_days
    const studyset = day?.studysets
    if (!day || !studyset) {
      console.error('[studyset-launch] invalid task relation', { requestId, taskId, userId: user.id })
      return NextResponse.json({ error: 'Task relation invalid' }, { status: 500 })
    }

    const tool = inferTool(String(taskRow.task_type || 'notes'))
    const taskTitle = String(taskRow.title || 'Study task')
    const taskDescription = String(taskRow.description || '')
    const estimatedMinutes = Number(taskRow.estimated_minutes || 15)
    const parsedBundle = parseSourceBundle(studyset.source_bundle)
    try {
      const { data: recentAttempts } = await (supabase as any)
        .from('studyset_task_attempts')
        .select('score')
        .eq('user_id', user.id)
        .eq('studyset_id', studyset.id)
        .order('created_at', { ascending: false })
        .limit(8)

      const { data: weakTopicRows } = await (supabase as any)
        .from('studyset_mastery_topics')
        .select('topic_label, weakness_score, mastery_score')
        .eq('user_id', user.id)
        .eq('studyset_id', studyset.id)
        .order('weakness_score', { ascending: false })
        .limit(5)

      if (Array.isArray(recentAttempts) && recentAttempts.length > 0) {
        const avgScore = Math.round(
          recentAttempts.reduce((sum: number, row: any) => sum + Number(row.score || 0), 0) / recentAttempts.length
        )
        parsedBundle.adaptive.avg_score = avgScore
        parsedBundle.adaptive.mastery_band = avgScore >= 85 ? 'strong' : avgScore < 60 ? 'weak' : 'developing'
      }

      if (Array.isArray(weakTopicRows) && weakTopicRows.length > 0) {
        parsedBundle.adaptive.weak_topics = weakTopicRows
          .filter((row: any) => Number(row.weakness_score || 0) > Number(row.mastery_score || 0))
          .map((row: any) => String(row.topic_label || '').trim())
          .filter(Boolean)
          .slice(0, 5)
      }
    } catch {
      // Normalized adaptive tables may not be migrated yet; JSON fallback already parsed.
    }
    const sourceText = buildSourceText(studyset.name, taskTitle, taskDescription, parsedBundle)
    console.info('[studyset-launch] payload built', {
      requestId,
      taskId,
      userId: user.id,
      tool,
      sourceLength: sourceText.length,
      studysetId: studyset.id,
      dayNumber: Number(day.day_number || 1),
    })

    const baseResponse = {
      task: {
        id: taskRow.id,
        type: String(taskRow.task_type || 'notes'),
        title: taskTitle,
        description: taskDescription,
        estimated_minutes: estimatedMinutes,
        position: Number(taskRow.position || 0),
        completed: Boolean(taskRow.completed),
      },
      day: {
        id: day.id,
        day_number: Number(day.day_number || 1),
        plan_date: day.plan_date || null,
      },
      studyset: {
        id: studyset.id,
        name: String(studyset.name || 'Studyset'),
      },
      launch: {
        tool,
        sourceText,
        artifactTitle: `${studyset.name} - ${taskTitle}`,
        autoRun: true,
      },
    }

    if (tool === 'flashcards') {
      const response = {
        ...baseResponse,
        launch: {
          ...baseResponse.launch,
          flashcardsPreset: buildFlashcardsPreset(taskTitle, estimatedMinutes, parsedBundle),
        },
      }
      console.info('[studyset-launch] success', { requestId, taskId, tool: 'flashcards' })
      return NextResponse.json(response)
    }

    if (tool === 'quiz') {
      const response = {
        ...baseResponse,
        launch: {
          ...baseResponse.launch,
          quizPreset: buildQuizPreset(taskTitle, taskDescription, estimatedMinutes, parsedBundle),
        },
      }
      console.info('[studyset-launch] success', { requestId, taskId, tool: 'quiz' })
      return NextResponse.json(response)
    }

    const response = {
      ...baseResponse,
      launch: {
        ...baseResponse.launch,
        notesPreset: buildNotesPreset(taskTitle, estimatedMinutes, parsedBundle),
      },
    }
    console.info('[studyset-launch] success', { requestId, taskId, tool: 'notes' })
    return NextResponse.json(response)
  } catch (error) {
    console.error('[studyset-launch] exception', { requestId, message: (error as any)?.message || 'Internal server error' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
