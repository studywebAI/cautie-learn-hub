import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: memberships } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('user_id', user.id)

    const classIds = (memberships || []).map((m: any) => m.class_id).filter(Boolean)
    if (classIds.length === 0) return NextResponse.json({ slots: [] })

    const { data: prefs } = await (supabase as any)
      .from('class_preferences')
      .select('class_id, school_schedule_enabled, school_schedule_visible_to_students')
      .in('class_id', classIds)

    const visibleClassIds = (prefs || [])
      .filter((p: any) => p.school_schedule_enabled === true && p.school_schedule_visible_to_students !== false)
      .map((p: any) => p.class_id)

    if (visibleClassIds.length === 0) return NextResponse.json({ slots: [] })

    const { data: classRows } = await supabase
      .from('classes')
      .select('id, name')
      .in('id', visibleClassIds)
    const classNameById = new Map((classRows || []).map((c: any) => [c.id, c.name]))

    const { data: slots, error } = await (supabase as any)
      .from('class_school_schedule_slots')
      .select('id, class_id, day_of_week, period_index, title, start_time, end_time, is_break, subject_id, notes')
      .in('class_id', visibleClassIds)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      slots: (slots || []).map((slot: any) => ({
        ...slot,
        class_name: classNameById.get(slot.class_id) || 'Class',
      })),
    })
  } catch (error) {
    console.error('school schedule aggregate GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

