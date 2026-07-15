import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET — concatenates all `text`-type block content across every assignment
// in this paragraph, for the "generate flashcards/quiz from this chapter"
// one-click action (docs/subjects-feature-brainstorm.md section D point 14).
// Content-mode assignments (settings.delivery.isContent) are exactly the
// "leerstof" this is meant to summarize/quiz.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: paragraph } = await supabase
      .from('paragraphs')
      .select('id, title')
      .eq('id', resolvedParams.paragraphId)
      .maybeSingle()
    if (!paragraph) return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 })

    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title')
      .eq('paragraph_id', resolvedParams.paragraphId)

    const assignmentIds = (assignments || []).map((a: any) => a.id)
    if (assignmentIds.length === 0) {
      return NextResponse.json({ sourceText: '', title: (paragraph as any).title })
    }

    const { data: blocks } = await supabase
      .from('blocks')
      .select('assignment_id, type, data, block_index')
      .in('assignment_id', assignmentIds)
      .eq('type', 'text')
      .order('block_index', { ascending: true })

    const assignmentTitleById = new Map((assignments || []).map((a: any) => [a.id, a.title]))
    const sections: string[] = []
    let lastAssignmentId: string | null = null
    for (const block of blocks || []) {
      const data = (block as any).data || {}
      const header = typeof data.header === 'string' ? data.header.trim() : ''
      const content = typeof data.content === 'string' ? data.content.trim() : ''
      if (!header && !content) continue
      if ((block as any).assignment_id !== lastAssignmentId) {
        lastAssignmentId = (block as any).assignment_id
        const assignmentTitle = assignmentTitleById.get(lastAssignmentId)
        if (assignmentTitle) sections.push(`## ${assignmentTitle}`)
      }
      if (header) sections.push(`### ${header}`)
      if (content) sections.push(content)
    }

    const sourceText = sections.join('\n\n').slice(0, 12000)
    return NextResponse.json({ sourceText, title: (paragraph as any).title })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
