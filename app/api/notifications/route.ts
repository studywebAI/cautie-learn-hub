import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET user's notifications
export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const unreadOnly = searchParams.get('unread_only') === 'true'

  let query = (supabase as any)
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  // Filter out expired notifications
  query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

  const { data: notifications, error } = await query

  if (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(notifications)
}

// POST create notification (admin/system use)
export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, title, message, data, user_id, expires_at } = await request.json()

  // Only allow creating notifications for the current user or if admin
  // For now, allow self-notifications
  const targetUserId = user_id || user.id

  const { data: notification, error } = await (supabase as any)
    .from('notifications')
    .insert({
      user_id: targetUserId,
      type,
      title,
      message,
      data: data || {},
      expires_at
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(notification)
}