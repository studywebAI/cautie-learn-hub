import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies())
    const status = request.nextUrl.searchParams.get('status') || 'active'
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '100'), 1000)
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0')

    const { data: ideas, error } = await supabase
      .from('ideas')
      .select(
        `
        id,
        title,
        description,
        status,
        created_at,
        created_by,
        votes(count)
      `
      )
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const formattedIdeas = ideas?.map((idea) => ({
      ...idea,
      vote_count: idea.votes?.[0]?.count || 0,
    })) || []

    return NextResponse.json({ data: formattedIdeas })
  } catch (error) {
    console.error('[GET /api/ideas]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies())

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (title.length > 255) {
      return NextResponse.json({ error: 'Title must be less than 255 characters' }, { status: 400 })
    }

    const { data: idea, error } = await supabase
      .from('ideas')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        status: 'active',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/ideas] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { ...idea, vote_count: 0 } }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/ideas]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
