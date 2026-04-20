import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { upsertDailyPulseForStudyset, upsertDailyPulseForUser } from '@/lib/studysets/daily-pulse'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json().catch(() => ({}))
    const studysetId = body?.studysetId ? String(body.studysetId) : null
    const pulseDate = body?.pulseDate ? String(body.pulseDate) : undefined

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (studysetId) {
      const result = await upsertDailyPulseForStudyset({
        supabase,
        userId: user.id,
        studysetId,
        pulseDate,
      })
      return NextResponse.json({
        success: true,
        scope: 'studyset',
        studyset_id: studysetId,
        result,
      })
    }

    const result = await upsertDailyPulseForUser({
      supabase,
      userId: user.id,
      pulseDate,
    })

    return NextResponse.json({
      success: true,
      scope: 'user',
      result,
    })
  } catch (error) {
    console.error('studyset daily pulse POST failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

