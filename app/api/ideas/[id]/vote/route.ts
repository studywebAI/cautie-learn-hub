import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient(cookies())

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user voted
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .select('id')
      .eq('idea_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 500 })
    }

    // Get vote count
    const { count, error: countError } = await supabase
      .from('votes')
      .select('id', { count: 'exact' })
      .eq('idea_id', id)

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    return NextResponse.json({
      voted: !!vote,
      vote_count: count || 0,
    })
  } catch (error) {
    console.error('[GET /api/ideas/[id]/vote]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient(cookies())

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Insert vote (UNIQUE constraint prevents duplicates)
    const { data: vote, error } = await supabase
      .from('votes')
      .insert({
        idea_id: id,
        user_id: user.id,
      })
      .select()
      .single()

    // Handle duplicate vote
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You already voted on this idea' },
          { status: 409 }
        )
      }
      console.error('[POST /api/ideas/[id]/vote] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get updated vote count
    const { count } = await supabase
      .from('votes')
      .select('id', { count: 'exact' })
      .eq('idea_id', id)

    return NextResponse.json(
      {
        data: vote,
        vote_count: count || 0,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/ideas/[id]/vote]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
