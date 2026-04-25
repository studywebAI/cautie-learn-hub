import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

async function getSchedulePrefs(supabase: any, classId: string) {
  const { data } = await (supabase as any)
    .from('class_preferences')
    .select('school_schedule_enabled, school_schedule_visible_to_students')
    .eq('class_id', classId)
    .maybeSingle()

  return {
    school_schedule_enabled: data?.school_schedule_enabled === true,
    school_schedule_visible_to_students: data?.school_schedule_visible_to_students !== false,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await getClassPermission(supabase as any, classId, user.id)
    if (!perm.isMember) return NextResponse.json({ error: 'Not a class member' }, { status: 403 })

    const prefs = await getSchedulePrefs(supabase, classId)
    if (!prefs.school_schedule_enabled) {
      return NextResponse.json({ enabled: false, slots: [] })
    }
    if (perm.isStudent && !prefs.school_schedule_visible_to_students) {
      return NextResponse.json({ error: 'Schedule hidden for students' }, { status: 403 })
    }

    const { data: slots, error } = await (supabase as any)
      .from('class_school_schedule_slots')
      .select('id, class_id, day_of_week, period_index, title, start_time, end_time, is_break, subject_id, notes, created_by, created_at, updated_at')
      .eq('class_id', classId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ enabled: true, visible_to_students: prefs.school_schedule_visible_to_students, slots: slots || [] })
  } catch (error) {
    console.error('school schedule GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json().catch(() => ({}))

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await getClassPermission(supabase as any, classId, user.id)
    if (!perm.isTeacher) return NextResponse.json({ error: 'Only teachers can edit schedule' }, { status: 403 })

    const slot = {
      class_id: classId,
      day_of_week: Number(body?.day_of_week || 1),
      period_index: Number(body?.period_index || 1),
      title: String(body?.title || '').trim(),
      start_time: String(body?.start_time || ''),
      end_time: String(body?.end_time || ''),
      is_break: Boolean(body?.is_break),
      subject_id: body?.subject_id ? String(body.subject_id) : null,
      notes: body?.notes ? String(body.notes) : null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }

    if (!slot.title || !slot.start_time || !slot.end_time) {
      return NextResponse.json({ error: 'title, start_time, end_time are required' }, { status: 400 })
    }

    const { data: inserted, error } = await (supabase as any)
      .from('class_school_schedule_slots')
      .insert([slot])
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: 'school_schedule_slot_created',
      entityType: 'school_schedule',
      entityId: inserted.id,
      metadata: {
        day_of_week: slot.day_of_week,
        title: slot.title,
        start_time: slot.start_time,
        end_time: slot.end_time,
      },
    })

    return NextResponse.json({ success: true, slot: inserted })
  } catch (error) {
    console.error('school schedule POST failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const slotId = req.nextUrl.searchParams.get('slotId')
    if (!slotId) return NextResponse.json({ error: 'slotId is required' }, { status: 400 })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await getClassPermission(supabase as any, classId, user.id)
    if (!perm.isTeacher) return NextResponse.json({ error: 'Only teachers can edit schedule' }, { status: 403 })

    const { error } = await (supabase as any)
      .from('class_school_schedule_slots')
      .delete()
      .eq('id', slotId)
      .eq('class_id', classId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: 'school_schedule_slot_deleted',
      entityType: 'school_schedule',
      entityId: slotId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('school schedule DELETE failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json().catch(() => ({}))

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await getClassPermission(supabase as any, classId, user.id)
    if (!perm.isTeacher) return NextResponse.json({ error: 'Only teachers can edit schedule' }, { status: 403 })

    const slotId = String(body?.slot_id || '').trim()
    if (!slotId) return NextResponse.json({ error: 'slot_id is required' }, { status: 400 })

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (body?.day_of_week !== undefined) updates.day_of_week = Number(body.day_of_week)
    if (body?.period_index !== undefined) updates.period_index = Number(body.period_index)
    if (body?.title !== undefined) updates.title = String(body.title || '').trim()
    if (body?.start_time !== undefined) updates.start_time = String(body.start_time || '')
    if (body?.end_time !== undefined) updates.end_time = String(body.end_time || '')
    if (body?.is_break !== undefined) updates.is_break = Boolean(body.is_break)
    if (body?.subject_id !== undefined) updates.subject_id = body.subject_id ? String(body.subject_id) : null
    if (body?.notes !== undefined) updates.notes = body.notes ? String(body.notes) : null

    const hasContentUpdates = Object.keys(updates).some((key) => key !== 'updated_at')
    if (!hasContentUpdates) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    if (updates.title !== undefined && !updates.title) {
      return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 })
    }
    if (updates.start_time !== undefined && !updates.start_time) {
      return NextResponse.json({ error: 'start_time cannot be empty' }, { status: 400 })
    }
    if (updates.end_time !== undefined && !updates.end_time) {
      return NextResponse.json({ error: 'end_time cannot be empty' }, { status: 400 })
    }

    const { data: updated, error } = await (supabase as any)
      .from('class_school_schedule_slots')
      .update(updates)
      .eq('id', slotId)
      .eq('class_id', classId)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: 'school_schedule_slot_updated',
      entityType: 'school_schedule',
      entityId: slotId,
      metadata: {
        day_of_week: updates.day_of_week,
        period_index: updates.period_index,
        title: updates.title,
        start_time: updates.start_time,
        end_time: updates.end_time,
      },
    })

    return NextResponse.json({ success: true, slot: updated })
  } catch (error) {
    console.error('school schedule PATCH failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
