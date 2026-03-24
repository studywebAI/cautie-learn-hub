import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  ensureSubjectAssignable,
  ensureTeacherClassAccess,
  normalizeAgendaLinks,
  normalizeAgendaVisibility,
} from '@/lib/agenda'
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

function toIsoOrNull(value: any) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await getClassPermission(supabase as any, classId, user.id)
    if (!perm.isMember) return NextResponse.json({ error: 'Not a class member' }, { status: 403 })

    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')
    const includeHidden = req.nextUrl.searchParams.get('includeHidden') === '1' && perm.isTeacher

    let query = (supabase as any)
      .from('class_agenda_items')
      .select(`
        *,
        class_agenda_item_links(*),
        classes:class_id(id, name),
        subjects:subject_id(id, title)
      `)
      .eq('class_id', classId)
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('starts_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (!includeHidden && perm.isStudent) {
      query = query.or(`visibility_state.eq.visible,and(visibility_state.eq.scheduled,publish_at.lte.${new Date().toISOString()})`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : null
    const filtered = (data || []).filter((item: any) => {
      const date = new Date(item?.due_at || item?.starts_at || item?.created_at || 0)
      if (fromDate && date < fromDate) return false
      if (toDate && date > toDate) return false
      return true
    })

    return NextResponse.json({ items: filtered })
  } catch (error) {
    console.error('class agenda GET failed', error)
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const classAccess = await ensureTeacherClassAccess(supabase as any, classId, user.id)
    if (!classAccess.ok) return NextResponse.json({ error: classAccess.error }, { status: classAccess.status })

    const title = String(body?.title || '').trim()
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const subjectId = body?.subject_id ? String(body.subject_id) : null
    const subjectAccess = await ensureSubjectAssignable(supabase as any, classId, subjectId, user.id)
    if (!subjectAccess.ok) return NextResponse.json({ error: subjectAccess.error }, { status: subjectAccess.status })

    const startsAt = toIsoOrNull(body?.starts_at)
    const dueAt = toIsoOrNull(body?.due_at)
    const enabled = body?.visible !== false
    const publishAt = toIsoOrNull(body?.publish_at)
    const visibility = normalizeAgendaVisibility(enabled, publishAt)
    const links = normalizeAgendaLinks(body?.links)

    const insertPayload = {
      class_id: classId,
      subject_id: subjectId,
      title,
      description: body?.description ? String(body.description) : null,
      item_type: body?.item_type ? String(body.item_type) : 'assignment',
      starts_at: startsAt,
      due_at: dueAt,
      visibility_state: visibility.visibility_state,
      publish_at: visibility.publish_at,
      created_by: user.id,
      updated_by: user.id,
    }

    const { data: item, error: insertError } = await (supabase as any)
      .from('class_agenda_items')
      .insert([insertPayload])
      .select('*')
      .single()
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    if (links.length > 0) {
      const linkRows = links.map((link, index) => ({
        agenda_item_id: item.id,
        link_type: link.link_type,
        link_ref_id: link.link_ref_id || null,
        label: link.label,
        metadata_json: link.metadata_json || {},
        position: Number.isFinite(Number(link.position)) ? Number(link.position) : index,
      }))
      const { error: linksError } = await (supabase as any).from('class_agenda_item_links').insert(linkRows)
      if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 })
    }

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: 'agenda_item_created',
      entityType: 'class_agenda_item',
      entityId: item.id,
      metadata: {
        visibility_state: visibility.visibility_state,
        has_links: links.length > 0,
      },
    })

    await (supabase as any).from('class_agenda_events').insert({
      agenda_item_id: item.id,
      class_id: classId,
      actor_user_id: user.id,
      event_type: 'created',
      metadata: {
        visibility_state: visibility.visibility_state,
        title,
      },
    })

    const { data: itemWithLinks } = await (supabase as any)
      .from('class_agenda_items')
      .select('*, class_agenda_item_links(*), classes:class_id(id, name), subjects:subject_id(id, title)')
      .eq('id', item.id)
      .single()

    return NextResponse.json({ item: itemWithLinks || item }, { status: 201 })
  } catch (error) {
    console.error('class agenda POST failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
