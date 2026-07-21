import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getIdeasRole } from '../../_shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { userId, canManagePolls } = await getIdeasRole()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManagePolls) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = await createClient(cookies())
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)

    const { data: entries, error } = await supabase
      .from('ideas_board_audit_log')
      .select('id, actor_id, action, entity_type, entity_id, before, after, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const actorIds = [...new Set((entries || []).map((e) => e.actor_id).filter(Boolean))] as string[]
    const { data: profiles } = actorIds.length > 0
      ? await supabase.from('profiles').select('id, display_name, full_name, email').in('id', actorIds)
      : { data: [] }
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

    const enriched = (entries || []).map((entry) => ({
      ...entry,
      actor: entry.actor_id
        ? (() => {
            const p: any = profileMap.get(entry.actor_id)
            return p ? { display_name: p.display_name || p.full_name || p.email } : { display_name: 'Unknown' }
          })()
        : { display_name: 'System (cron)' },
    }))

    return NextResponse.json({ entries: enriched })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
