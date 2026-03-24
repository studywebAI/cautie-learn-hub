import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function parseClassIds(raw: string | null): string[] {
  if (!raw) return []
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    )
  )
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
    if (profile?.subscription_type !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 })
    }

    const requestedClassIds = parseClassIds(req.nextUrl.searchParams.get('classIds'))
    if (requestedClassIds.length === 0) return NextResponse.json({ items: [] })

    const { data: memberships } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('user_id', user.id)

    const teacherClassIds = new Set((memberships || []).map((row: any) => row.class_id))
    const allowedClassIds = requestedClassIds.filter((classId) => teacherClassIds.has(classId))
    if (allowedClassIds.length === 0) return NextResponse.json({ items: [] })

    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')

    let query = (supabase as any)
      .from('class_agenda_items')
      .select(`
        *,
        class_agenda_item_links(*),
        classes:class_id(id, name),
        subjects:subject_id(id, title)
      `)
      .in('class_id', allowedClassIds)
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('starts_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    const { data: items, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : null
    const filtered = (items || []).filter((item: any) => {
      const date = new Date(item?.due_at || item?.starts_at || item?.created_at || 0)
      if (fromDate && date < fromDate) return false
      if (toDate && date > toDate) return false
      return true
    })

    return NextResponse.json({ items: filtered, classIds: allowedClassIds })
  } catch (error) {
    console.error('teacher overlay agenda GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
