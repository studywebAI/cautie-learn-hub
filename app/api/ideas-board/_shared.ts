import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

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
