import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getIdeasRole } from '../../../_shared'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const supabase = await createClient(cookies())
    const { userId } = await getIdeasRole()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { pollId } = await params
    const body = await request.json().catch(() => ({}))
    const optionId = String(body?.optionId || '').trim()
    if (!optionId) return NextResponse.json({ error: 'optionId is required' }, { status: 400 })

    const { data: poll, error: pollError } = await supabase
      .from('ideas_board_polls')
      .select('id, status')
      .eq('id', pollId)
      .maybeSingle()
    if (pollError) return NextResponse.json({ error: pollError.message }, { status: 500 })
    if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    if (poll.status !== 'open') return NextResponse.json({ error: 'Poll is closed' }, { status: 400 })

    const { data: option, error: optionError } = await supabase
      .from('ideas_board_poll_options')
      .select('id, poll_id')
      .eq('id', optionId)
      .eq('poll_id', pollId)
      .maybeSingle()
    if (optionError) return NextResponse.json({ error: optionError.message }, { status: 500 })
    if (!option) return NextResponse.json({ error: 'Option not found for this poll' }, { status: 404 })

    const { error } = await supabase
      .from('ideas_board_poll_votes')
      .insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: userId,
      })

    if (error) {
      if (error.code === '23505') return NextResponse.json({ ok: true, alreadyVoted: true })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
