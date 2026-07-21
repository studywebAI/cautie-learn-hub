import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type IdeasRole = {
  userId: string | null
  canManagePolls: boolean
}

export async function getIdeasRole(): Promise<IdeasRole> {
  const supabase = await createClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: null, canManagePolls: false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', user.id)
    .maybeSingle()

  const role = String(profile?.subscription_type || '').toLowerCase()
  const canManagePolls = role === 'admin' || role === 'owner' || role === 'creator'
  return { userId: user.id, canManagePolls }
}

export async function logIdeasBoardAudit(entry: {
  actorId: string | null
  action: string
  entityType: 'idea' | 'poll'
  entityId: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}) {
  try {
    const admin = createAdminClient()
    await admin.from('ideas_board_audit_log').insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      before: entry.before ?? null,
      after: entry.after ?? null,
      metadata: entry.metadata ?? null,
    })
  } catch {
    // Audit logging must never block the underlying admin action.
  }
}

export async function notifyIdeasBoardAdmins(payload: {
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
}) {
  const admin = createAdminClient()
  const { data: adminProfiles } = await admin
    .from('profiles')
    .select('id')
    .in('subscription_type', ['admin', 'owner', 'creator'])
  const adminIds = (adminProfiles || []).map((p: any) => p.id)
  if (adminIds.length === 0) return
  await admin.from('notifications').insert(
    adminIds.map((adminId: string) => ({
      user_id: adminId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data || {},
    }))
  )
}
