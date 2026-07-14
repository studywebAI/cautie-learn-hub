import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST — student meldt dat een specifieke vraag fout is nagekeken. Alleen
// mogelijk nadat de docent de resultaten heeft vrijgegeven (dezelfde gate
// als het bekijken van resultaten). Landt als een 'grading_dispute' event op
// de bestaande assignment_events-tabel (vrij event_type/payload, geen
// migratie nodig) — zie docs/grades-feature-brainstorm.md punt 7.
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

    const body = await request.json().catch(() => ({}))
    const blockId = String(body?.block_id || '').trim()
    const note = String(body?.note || '').trim()
    if (!blockId || !note) {
      return NextResponse.json({ error: 'block_id and note are required' }, { status: 400 })
    }
    if (note.length > 1000) {
      return NextResponse.json({ error: 'note too long' }, { status: 400 })
    }

    const { data: gradeSet } = await supabase
      .from('grade_sets')
      .select('id, answers_released_at')
      .eq('assignment_id', resolvedParams.assignmentId)
      .maybeSingle()

    if (!gradeSet || !(gradeSet as any).answers_released_at) {
      return NextResponse.json({ error: 'Results not released yet' }, { status: 403 })
    }

    const { data: answer } = await supabase
      .from('student_answers')
      .select('id, assignment_attempt_id')
      .eq('assignment_id', resolvedParams.assignmentId)
      .eq('block_id', blockId)
      .eq('student_id', user.id)
      .maybeSingle()

    const { error } = await supabase.from('assignment_events').insert({
      assignment_id: resolvedParams.assignmentId,
      attempt_id: (answer as any)?.assignment_attempt_id || null,
      student_id: user.id,
      event_type: 'grading_dispute',
      event_payload: { block_id: blockId, note, answer_id: (answer as any)?.id || null, status: 'open' },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
