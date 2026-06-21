import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'
import { createScheduledStudyItemSchema, validateBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// GET the logged-in user's scheduled study items
export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ items: [] })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const statusParam = searchParams.get('status')

  let query = (supabase as any)
    .from('scheduled_study_items')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_for', { ascending: true })

  if (from) query = query.gte('scheduled_for', from)
  if (to) query = query.lte('scheduled_for', to)
  if (statusParam) {
    const statuses = statusParam.split(',').map((s) => s.trim()).filter(Boolean)
    if (statuses.length > 0) query = query.in('status', statuses)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data || [] })
}

// POST create a new scheduled study item
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = await validateBody(request, createScheduledStudyItemSchema)
  if ('error' in validation) {
    return validation.error
  }
  const { tool, title, source_text, scheduled_for } = validation.data

  const { data, error } = await (supabase as any)
    .from('scheduled_study_items')
    .insert({
      user_id: user.id,
      tool,
      title,
      source_text: source_text || null,
      scheduled_for,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
