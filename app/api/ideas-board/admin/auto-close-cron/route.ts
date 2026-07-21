import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logIdeasBoardAudit, notifyIdeasBoardAdmins } from '../../_shared'

export const dynamic = 'force-dynamic'

function hasValidCronSecret(request: NextRequest) {
  const vercelCron = request.headers.get('x-vercel-cron')
  if (vercelCron === '1') return true
  const secret = process.env.INTEGRATION_CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

// Closes polls whose ends_at has passed. Runs daily — polls are monthly, so a
// once-a-day check is more than tight enough and keeps this cheap. Does NOT
// auto-open next month's poll: option selection (which candidate ideas go on
// the ballot) stays an admin call, made via the existing poll-create flow.
// Vercel Cron triggers via GET; POST is kept too so it can be triggered the
// same way as the existing manual/ingestion cron routes in this codebase.
export async function GET(request: NextRequest) {
  return handleAutoClose(request)
}

export async function POST(request: NextRequest) {
  return handleAutoClose(request)
}

async function handleAutoClose(request: NextRequest) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const nowIso = new Date().toISOString()

    const { data: expiredPolls, error } = await supabase
      .from('ideas_board_polls')
      .select('id, title, month_key, ends_at')
      .eq('status', 'open')
      .not('ends_at', 'is', null)
      .lte('ends_at', nowIso)

    if (error) throw new Error(error.message || 'Failed to load expired polls')
    if (!expiredPolls || expiredPolls.length === 0) {
      return NextResponse.json({ closed_count: 0 })
    }

    const closedIds: string[] = []
    for (const poll of expiredPolls) {
      const { error: updateError } = await supabase
        .from('ideas_board_polls')
        .update({ status: 'closed', updated_at: nowIso })
        .eq('id', poll.id)
      if (updateError) continue

      closedIds.push(poll.id)
      void logIdeasBoardAudit({
        actorId: null,
        action: 'poll_auto_closed',
        entityType: 'poll',
        entityId: poll.id,
        before: { status: 'open' },
        after: { status: 'closed' },
        metadata: { ends_at: poll.ends_at, via: 'cron' },
      })
    }

    if (closedIds.length > 0) {
      void notifyIdeasBoardAdmins({
        type: 'poll_auto_closed',
        title: 'Poll auto-closed',
        message: `${closedIds.length} poll(s) reached their end date and closed automatically. Create next month's poll when ready.`,
        data: { closed_poll_ids: closedIds },
      })
    }

    return NextResponse.json({ closed_count: closedIds.length })
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || 'Auto-close failed') }, { status: 500 })
  }
}
