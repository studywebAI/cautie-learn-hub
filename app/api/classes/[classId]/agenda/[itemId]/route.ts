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

async function getItemForClass(supabase: any, classId: string, itemId: string) {
  return await supabase
    .from('class_agenda_items')
    .select('*, class_agenda_item_links(*), classes:class_id(id, name), subjects:subject_id(id, title)')
    .eq('id', itemId)
    .eq('class_id', classId)
    .maybeSingle()
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string; itemId: string }> }
) {
  try {
    const { classId, itemId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await getClassPermission(supabase as any, classId, user.id)
    if (!perm.isMember) return NextResponse.json({ error: 'Not a class member' }, { status: 403 })

    const { data: item, error } = await getItemForClass(supabase as any, classId, itemId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!item) return NextResponse.json({ error: 'Agenda item not found' }, { status: 404 })

    return NextResponse.json({ item })
  } catch (error) {
    console.error('agenda item GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; itemId: string }> }
) {
  try {
    const { classId, itemId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json().catch(() => ({}))

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await ensureTeacherClassAccess(supabase as any, classId, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { data: existing } = await getItemForClass(supabase as any, classId, itemId)
    if (!existing) return NextResponse.json({ error: 'Agenda item not found' }, { status: 404 })

    const nextTitle = body?.title !== undefined ? String(body.title || '').trim() : existing.title
    if (!nextTitle) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const nextSubjectId = body?.subject_id !== undefined
      ? (body.subject_id ? String(body.subject_id) : null)
      : existing.subject_id

    const subjectAccess = await ensureSubjectAssignable(supabase as any, classId, nextSubjectId, user.id)
    if (!subjectAccess.ok) return NextResponse.json({ error: subjectAccess.error }, { status: subjectAccess.status })

    const explicitVisibility = body?.visibility_state ? String(body.visibility_state) : null
    const visibility = explicitVisibility
      ? {
          visibility_state: (['visible', 'hidden', 'scheduled'].includes(explicitVisibility) ? explicitVisibility : 'hidden') as any,
          publish_at: toIsoOrNull(body?.publish_at),
        }
      : normalizeAgendaVisibility(body?.visible !== false, toIsoOrNull(body?.publish_at))

    const updatePayload = {
      title: nextTitle,
      description: body?.description !== undefined ? (body.description ? String(body.description) : null) : existing.description,
      subject_id: nextSubjectId,
      item_type: body?.item_type ? String(body.item_type) : existing.item_type,
      starts_at: body?.starts_at !== undefined ? toIsoOrNull(body.starts_at) : existing.starts_at,
      due_at: body?.due_at !== undefined ? toIsoOrNull(body.due_at) : existing.due_at,
      visibility_state: visibility.visibility_state,
      publish_at: visibility.publish_at,
      updated_by: user.id,
    }

    const { error: updateError } = await (supabase as any)
      .from('class_agenda_items')
      .update(updatePayload)
      .eq('id', itemId)
      .eq('class_id', classId)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    if (body?.links !== undefined) {
      const links = normalizeAgendaLinks(body.links)
      const { error: deleteLinksError } = await (supabase as any)
        .from('class_agenda_item_links')
        .delete()
        .eq('agenda_item_id', itemId)
      if (deleteLinksError) return NextResponse.json({ error: deleteLinksError.message }, { status: 500 })

      if (links.length > 0) {
        const rows = links.map((link, index) => ({
          agenda_item_id: itemId,
          link_type: link.link_type,
          link_ref_id: link.link_ref_id || null,
          label: link.label,
          metadata_json: link.metadata_json || {},
          position: Number.isFinite(Number(link.position)) ? Number(link.position) : index,
        }))
        const { error: insertLinksError } = await (supabase as any).from('class_agenda_item_links').insert(rows)
        if (insertLinksError) return NextResponse.json({ error: insertLinksError.message }, { status: 500 })
      }
    }

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: 'agenda_item_updated',
      entityType: 'class_agenda_item',
      entityId: itemId,
      metadata: {
        visibility_state: visibility.visibility_state,
      },
    })

    await (supabase as any).from('class_agenda_events').insert({
      agenda_item_id: itemId,
      class_id: classId,
      actor_user_id: user.id,
      event_type: 'updated',
      metadata: {
        visibility_state: visibility.visibility_state,
      },
    })

    const { data: item } = await getItemForClass(supabase as any, classId, itemId)
    return NextResponse.json({ item })
  } catch (error) {
    console.error('agenda item PATCH failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string; itemId: string }> }
) {
  try {
    const { classId, itemId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await ensureTeacherClassAccess(supabase as any, classId, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { error: deleteError } = await (supabase as any)
      .from('class_agenda_items')
      .delete()
      .eq('id', itemId)
      .eq('class_id', classId)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: 'agenda_item_deleted',
      entityType: 'class_agenda_item',
      entityId: itemId,
    })

    await (supabase as any).from('class_agenda_events').insert({
      agenda_item_id: itemId,
      class_id: classId,
      actor_user_id: user.id,
      event_type: 'deleted',
      metadata: {},
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('agenda item DELETE failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
