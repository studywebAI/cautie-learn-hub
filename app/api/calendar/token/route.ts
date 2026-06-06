import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Returns (or creates) a stable calendar token for the current user.
// The token is used as the path segment in /api/calendar/student/[token].ics
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Try to get existing token
    const { data: existing } = await (supabase as any)
      .from('calendar_tokens')
      .select('token')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing?.token) {
      return NextResponse.json({ token: existing.token })
    }

    // Create new token
    const { data: created, error: createError } = await (supabase as any)
      .from('calendar_tokens')
      .insert([{ user_id: user.id }])
      .select('token')
      .single()

    if (createError || !created?.token) {
      // Fallback: use userId directly (backwards compat with existing endpoint)
      return NextResponse.json({ token: user.id })
    }

    return NextResponse.json({ token: created.token })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
