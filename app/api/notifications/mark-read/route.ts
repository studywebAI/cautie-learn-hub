import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST mark notifications as read
export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { notification_ids, mark_all } = await request.json()

  let updateQuery = (supabase as any)
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .eq('read', false)

  if (!mark_all && notification_ids && notification_ids.length > 0) {
    updateQuery = updateQuery.in('id', notification_ids)
  }

  const { error } = await updateQuery

  if (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// GET unread count
export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: count, error } = await (supabase as any)
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

  if (error) {
    console.error('Error getting unread count:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ count: count || 0 })
}