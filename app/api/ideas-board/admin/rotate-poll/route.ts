import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getIdeasRole } from '../../_shared'

export async function POST() {
  try {
    const supabase = await createClient(cookies())
    const { userId, canManagePolls } = await getIdeasRole()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManagePolls) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: openPolls } = await supabase
      .from('ideas_board_polls')
      .select('id, title, month_key')
      .eq('status', 'open')

    const closedIds: string[] = []
    for (const poll of openPolls || []) {
      await supabase
        .from('ideas_board_polls')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', poll.id)
      closedIds.push(poll.id)
    }

    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`

    const webhookUrl = process.env.ADMIN_NOTIFY_WEBHOOK_URL
    if (webhookUrl && closedIds.length > 0) {
      void fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'poll_rotated',
          closed_poll_ids: closedIds,
          next_month_key: nextMonthKey,
          rotated_by: userId,
          rotated_at: new Date().toISOString(),
        }),
      }).catch(() => {})
    }

    return NextResponse.json({
      ok: true,
      closed_count: closedIds.length,
      next_month_key: nextMonthKey,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
