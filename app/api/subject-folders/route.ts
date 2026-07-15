import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Personal, per-teacher subject folders (B9, docs/subjects-feature-brainstorm.md).
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('subject_folders')
      .select('id, name, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ folders: [] })
    return NextResponse.json({ folders: data || [] })
  } catch (err) {
    return NextResponse.json({ folders: [] })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.subscription_type !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const name = String(body?.name || '').trim()
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (name.length > 80) return NextResponse.json({ error: 'name too long' }, { status: 400 })

    const { data, error } = await supabase
      .from('subject_folders')
      .insert({ name, created_by: user.id })
      .select('id, name, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ folder: data })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
