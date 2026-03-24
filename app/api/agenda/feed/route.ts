import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function normalizeDate(value: string | null, fallback: string) {
  if (!value) return fallback
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return fallback
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.subscription_type !== 'student') {
      return NextResponse.json({ items: [] })
    }

    const from = normalizeDate(req.nextUrl.searchParams.get('from'), new Date().toISOString().slice(0, 10))
    const to = normalizeDate(
      req.nextUrl.searchParams.get('to'),
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10)
    )

    const { data: memberships } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('user_id', user.id)

    const classIds = (memberships || []).map((row: any) => row.class_id).filter(Boolean)
    if (classIds.length === 0) return NextResponse.json({ items: [] })

    const nowIso = new Date().toISOString()
    const { data: items, error } = await (supabase as any)
      .from('class_agenda_items')
      .select(`
        *,
        class_agenda_item_links(*),
        classes:class_id(id, name),
        subjects:subject_id(id, title)
      `)
      .in('class_id', classIds)
      .or(`visibility_state.eq.visible,and(visibility_state.eq.scheduled,publish_at.lte.${nowIso})`)
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('starts_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const fromDate = new Date(`${from}T00:00:00.000Z`)
    const toDate = new Date(`${to}T23:59:59.999Z`)
    const filtered = (items || []).filter((item: any) => {
      const date = new Date(item?.due_at || item?.starts_at || item?.created_at || 0)
      return date >= fromDate && date <= toDate
    })

    return NextResponse.json({ items: filtered })
  } catch (error) {
    console.error('agenda feed GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
