import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions'

export const dynamic = 'force-dynamic'

// GET -- aggregate vote counts for a poll block, for anyone with access to
// the subject (student or teacher). Deliberately returns counts only, never
// which student voted for what -- that breakdown is teacher-only and already
// available via the existing per-block student-answers endpoint, which this
// route does not duplicate.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string; blockId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, resolvedParams.subjectId)
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: block, error: blockError } = await (supabase as any)
      .from('blocks')
      .select('id, assignment_id, type, data')
      .eq('id', resolvedParams.blockId)
      .maybeSingle()
    if (blockError || !block || block.assignment_id !== resolvedParams.assignmentId || block.type !== 'poll') {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    const { data: answers, error: answersError } = await (supabase as any)
      .from('student_answers')
      .select('answer_data')
      .eq('block_id', resolvedParams.blockId)
    if (answersError) {
      return NextResponse.json({ error: answersError.message }, { status: 500 })
    }

    const options: string[] = Array.isArray(block.data?.options) ? block.data.options : []
    const counts: Record<string, number> = {}
    options.forEach((opt: string) => { counts[opt] = 0 })
    let totalVotes = 0
    for (const row of answers || []) {
      const option = row?.answer_data?.option
      if (typeof option === 'string' && option in counts) {
        counts[option] += 1
        totalVotes += 1
      }
    }

    return NextResponse.json({ question: block.data?.question || '', options, counts, totalVotes })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
