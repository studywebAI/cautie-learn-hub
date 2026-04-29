import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getIdeasRole } from '../../_shared'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const supabase = await createClient(cookies())
    const { userId } = await getIdeasRole()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ideaId } = await params
    const { data: idea, error: ideaError } = await supabase
      .from('ideas_board_items')
      .select('id, lifecycle_stage')
      .eq('id', ideaId)
      .maybeSingle()

    if (ideaError) return NextResponse.json({ error: ideaError.message }, { status: 500 })
    if (!idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    if (idea.lifecycle_stage !== 'candidate') {
      return NextResponse.json({ error: 'Idea is not in poll-candidate stage' }, { status: 400 })
    }

    const { error } = await supabase
      .from('ideas_board_votes')
      .insert({ idea_id: ideaId, user_id: userId })

    if (error) {
      if (error.code === '23505') return NextResponse.json({ ok: true, alreadyVoted: true })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
