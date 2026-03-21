import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: rows, error } = await (supabase as any)
      .from('studysets')
      .select('id, name, confidence_level, target_days, minutes_per_day, status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ studysets: rows || [] })
  } catch (error) {
    console.error('studysets GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json().catch(() => ({}))

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const name = String(body?.name || '').trim()
    const classId = body?.class_id ? String(body.class_id) : null
    const confidenceLevel = ['beginner', 'intermediate', 'advanced'].includes(String(body?.confidence_level))
      ? String(body.confidence_level)
      : 'beginner'
    const targetDays = Math.max(1, Math.min(60, Number(body?.target_days || 7)))
    const minutesPerDay = Math.max(10, Math.min(480, Number(body?.minutes_per_day || 45)))
    const sourceBundle = body?.source_bundle ? String(body.source_bundle) : null

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const { data: studyset, error: createError } = await (supabase as any)
      .from('studysets')
      .insert([{
        user_id: user.id,
        class_id: classId,
        name,
        confidence_level: confidenceLevel,
        target_days: targetDays,
        minutes_per_day: minutesPerDay,
        status: 'draft',
        source_bundle: sourceBundle,
      }])
      .select('id, name, confidence_level, target_days, minutes_per_day, status, created_at, updated_at')
      .single()

    if (createError || !studyset) {
      return NextResponse.json({ error: createError?.message || 'Failed to create studyset' }, { status: 500 })
    }

    return NextResponse.json({ success: true, studyset })
  } catch (error) {
    console.error('studysets POST failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

