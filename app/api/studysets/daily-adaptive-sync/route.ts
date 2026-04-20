import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { runDailyAdaptiveSyncForUser } from '@/lib/studysets/adaptive-engine'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json().catch(() => ({}))
    const force = body?.force === true

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await runDailyAdaptiveSyncForUser({
      supabase,
      userId: user.id,
      force,
    })

    return NextResponse.json({
      success: true,
      force,
      ...result,
    })
  } catch (error) {
    console.error('studyset daily adaptive sync POST failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
