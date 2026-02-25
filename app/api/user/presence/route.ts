import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function logPresence(...args: any[]) {
  console.log('[USER_PRESENCE]', ...args)
}

export async function POST(request: Request) {
  logPresence('POST - Updating presence')

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
          remove(name: string, options: any) { cookieStore.set(name, '', { ...options, maxAge: 0 }) }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      logPresence('POST - Unauthorized user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logPresence('POST - Authenticated user', user.id)

    // Update the user's last_seen in profiles
    const timestamp = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ last_seen: timestamp })
      .eq('id', user.id)

    if (updateError) {
      logPresence('POST - Failed to update presence:', updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    logPresence('POST - Presence updated', { userId: user.id, timestamp })
    return NextResponse.json({ success: true, timestamp })

  } catch (error) {
    logPresence('POST - Error updating presence', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
