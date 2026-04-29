import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getIdeasRole } from './_shared'

export async function GET() {
  try {
    const supabase = await createClient(cookies())
    const { userId, canManagePolls } = await getIdeasRole()

    const { data: ideas, error } = await supabase
      .from('ideas_board_items')
      .select('id, created_by, title, description, status, lifecycle_stage, is_poll_seed, vote_count, created_at, updated_at')
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: polls, error: pollsError } = await supabase
      .from('ideas_board_polls')
      .select('id, title, description, month_key, status, starts_at, ends_at, created_at')
      .order('created_at', { ascending: false })
      .limit(12)
    if (pollsError) return NextResponse.json({ error: pollsError.message }, { status: 500 })

    const pollIds = (polls || []).map((poll) => poll.id)
    let pollOptions: any[] = []
    let myPollVotes: any[] = []
    if (pollIds.length > 0) {
      const { data: options, error: optionsError } = await supabase
        .from('ideas_board_poll_options')
        .select('id, poll_id, idea_id, title, description, vote_count, position')
        .in('poll_id', pollIds)
        .order('position', { ascending: true })
      if (optionsError) return NextResponse.json({ error: optionsError.message }, { status: 500 })
      pollOptions = options || []

      if (userId) {
        const { data: votes, error: votesError } = await supabase
          .from('ideas_board_poll_votes')
          .select('poll_id, option_id')
          .eq('user_id', userId)
          .in('poll_id', pollIds)
        if (votesError) return NextResponse.json({ error: votesError.message }, { status: 500 })
        myPollVotes = votes || []
      }
    }

    return NextResponse.json({
      ideas: ideas || [],
      polls: polls || [],
      pollOptions,
      myPollVotes,
      canManagePolls,
      currentUserId: userId,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient(cookies())
    const { userId } = await getIdeasRole()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const title = String(body?.title || '').trim()
    const description = String(body?.description || '').trim()
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('ideas_board_items')
      .insert({
        created_by: userId,
        title,
        description: description || null,
        status: 'open',
        lifecycle_stage: 'submitted',
      })
      .select('id, title, description, status, lifecycle_stage, vote_count, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ idea: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
