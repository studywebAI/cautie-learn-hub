import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { insertBlockCommand } from '@/ai/flows/insert-block-command'
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions'

export const dynamic = 'force-dynamic'

// POST — chatbox insert-command for the assignment editor: teacher types
// "maak een multiple choice blok over X" and gets back a single block
// {blockType, ...fields} to insert client-side. Does not persist anything
// itself — the editor's existing autosave handles that once inserted into
// local state, same as any manually-added block.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.subscription_type !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Being *a* teacher isn't enough -- must be a teacher of *this* subject.
    const hasSubjectAccess = await userHasSubjectAccess(supabase as any, user.id, resolvedParams.subjectId)
    if (!hasSubjectAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: assignment } = await supabase
      .from('assignments')
      .select('id')
      .eq('id', resolvedParams.assignmentId)
      .maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const command = String(body?.command || '').trim()
    let contextSummary = String(body?.contextSummary || '').slice(0, 4000)
    if (!command) return NextResponse.json({ error: 'command is required' }, { status: 400 })
    if (command.length > 500) return NextResponse.json({ error: 'command too long' }, { status: 400 })

    // Prior paragraphs/chapters are only pulled in when the teacher explicitly
    // opts in — by default the AI only sees this assignment's own content.
    if (body?.includeSiblingContext === true) {
      const { data: currentParagraph } = await (supabase as any)
        .from('paragraphs')
        .select('paragraph_number, chapter_id')
        .eq('id', resolvedParams.paragraphId)
        .maybeSingle()

      if (currentParagraph) {
        const { data: siblingParagraphs } = await (supabase as any)
          .from('paragraphs')
          .select('title, paragraph_number')
          .eq('chapter_id', currentParagraph.chapter_id)
          .lt('paragraph_number', currentParagraph.paragraph_number)
          .order('paragraph_number', { ascending: true })
          .limit(5)

        const { data: currentChapter } = await (supabase as any)
          .from('chapters')
          .select('title, chapter_number')
          .eq('id', currentParagraph.chapter_id)
          .maybeSingle()

        const { data: priorChapters } = currentChapter
          ? await (supabase as any)
              .from('chapters')
              .select('title, chapter_number')
              .eq('subject_id', resolvedParams.subjectId)
              .lt('chapter_number', currentChapter.chapter_number)
              .order('chapter_number', { ascending: true })
              .limit(5)
          : { data: [] }

        const siblingLines: string[] = []
        if (currentChapter) siblingLines.push(`Current chapter: ${currentChapter.title}`)
        if (priorChapters?.length) siblingLines.push(`Prior chapters: ${priorChapters.map((c: any) => c.title).join(', ')}`)
        if (siblingParagraphs?.length) siblingLines.push(`Prior paragraphs in this chapter: ${siblingParagraphs.map((p: any) => p.title).join(', ')}`)
        if (siblingLines.length) {
          contextSummary = `${siblingLines.join('\n')}\n\n${contextSummary}`.slice(0, 4000)
        }
      }
    }

    const result = await insertBlockCommand(command, contextSummary, 'Dutch')
    return NextResponse.json({ block: result })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
