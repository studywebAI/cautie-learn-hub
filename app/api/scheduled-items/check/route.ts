import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Fires reminder notifications for the current user's scheduled study items
// whose scheduled_for time has arrived. Called periodically from the client
// (see ScheduledReminderChecker) so reminders surface while the app is open.
export async function GET() {
  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ fired: 0 })
  }

  const now = new Date().toISOString()

  const { data: dueItems, error } = await (supabase as any)
    .from('scheduled_study_items')
    .select('id, tool, title')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const items = Array.isArray(dueItems) ? dueItems : []
  if (items.length === 0) {
    return NextResponse.json({ fired: 0 })
  }

  const notifiedAt = new Date().toISOString()

  await (supabase as any).from('notifications').insert(
    items.map((item: any) => ({
      user_id: user.id,
      type: 'scheduled_study_item_due',
      title: `Time to study: ${item.title}`,
      message: `Your scheduled ${item.tool} session is ready to start.`,
      data: { scheduled_item_id: item.id, tool: item.tool },
    }))
  )

  await (supabase as any)
    .from('scheduled_study_items')
    .update({ status: 'notified', notified_at: notifiedAt })
    .in('id', items.map((item: any) => item.id))

  return NextResponse.json({ fired: items.length })
}
