import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getIdeasRole } from '../_shared'

export async function POST(request: Request) {
  try {
    const supabase = await createClient(cookies())
    const { userId, canManagePolls } = await getIdeasRole()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManagePolls) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const title = String(body?.title || '').trim()
    const description = String(body?.description || '').trim()
    const monthKey = String(body?.monthKey || '').trim()
    const optionIdeaIds = Array.isArray(body?.optionIdeaIds) ? body.optionIdeaIds.map((v: unknown) => String(v)) : []

    if (!title) return NextResponse.json({ error: 'Poll title is required' }, { status: 400 })
    if (!monthKey) return NextResponse.json({ error: 'monthKey is required' }, { status: 400 })
    if (optionIdeaIds.length < 2) return NextResponse.json({ error: 'At least 2 options are required' }, { status: 400 })

    const { data: poll, error: pollError } = await supabase
      .from('ideas_board_polls')
      .insert({
        title,
        description: description || null,
        month_key: monthKey,
        status: 'open',
        created_by: userId,
      })
      .select('id')
      .single()
    if (pollError) return NextResponse.json({ error: pollError.message }, { status: 500 })

    const { data: ideas, error: ideasError } = await supabase
      .from('ideas_board_items')
      .select('id, title, description, lifecycle_stage')
      .in('id', optionIdeaIds)
    if (ideasError) return NextResponse.json({ error: ideasError.message }, { status: 500 })

    const validIdeas = (ideas || []).filter((idea) => idea.lifecycle_stage === 'candidate')
    if (validIdeas.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 candidate ideas for poll options' }, { status: 400 })
    }

    const optionsPayload = validIdeas.map((idea, idx) => ({
      poll_id: poll.id,
      idea_id: idea.id,
      title: idea.title,
      description: idea.description,
      position: idx,
    }))

    const { error: optionsError } = await supabase
      .from('ideas_board_poll_options')
      .insert(optionsPayload)
    if (optionsError) return NextResponse.json({ error: optionsError.message }, { status: 500 })

    return NextResponse.json({ ok: true, pollId: poll.id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
