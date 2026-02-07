import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Log a learning activity (quiz, flashcard, etc.)
export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      activity_type,
      paragraph_id,
      subject_id,
      score,
      total_items,
      correct_items,
      time_spent_seconds,
      metadata
    } = body

    // Validate required fields
    if (!activity_type || !['quiz', 'flashcard', 'assignment', 'study_session'].includes(activity_type)) {
      return NextResponse.json({ error: 'Invalid activity_type' }, { status: 400 })
    }

    // Insert activity log
    const { data: activity, error } = await (supabase as any)
      .from('activity_logs')
      .insert({
        student_id: user.id,
        activity_type,
        paragraph_id: paragraph_id || null,
        subject_id: subject_id || null,
        score: score ?? null,
        total_items: total_items ?? null,
        correct_items: correct_items ?? null,
        time_spent_seconds: time_spent_seconds ?? null,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging activity:', error)
      return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
    }

    console.log(`Activity logged: ${activity_type} by ${user.id}, score: ${score}`)

    return NextResponse.json(activity)

  } catch (error) {
    console.error('Unexpected error in activity POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get activity history for current user
export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activityType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const since = searchParams.get('since') // ISO date string

    let query = (supabase as any)
      .from('activity_logs')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (activityType) {
      query = query.eq('activity_type', activityType)
    }

    if (since) {
      query = query.gte('created_at', since)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching activities:', error)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('Unexpected error in activity GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
