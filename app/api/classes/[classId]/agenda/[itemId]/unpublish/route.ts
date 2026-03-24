import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ensureTeacherClassAccess } from '@/lib/agenda'
import { logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

export async function POST(
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

    const { error } = await (supabase as any)
      .from('class_agenda_items')
      .update({
        visibility_state: 'hidden',
        publish_at: null,
        updated_by: user.id,
      })
      .eq('id', itemId)
      .eq('class_id', classId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: 'agenda_item_unpublished',
      entityType: 'class_agenda_item',
      entityId: itemId,
    })

    await (supabase as any).from('class_agenda_events').insert({
      agenda_item_id: itemId,
      class_id: classId,
      actor_user_id: user.id,
      event_type: 'unpublished',
      metadata: {},
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('agenda unpublish failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
