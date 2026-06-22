import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          }
        }
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if 2FA is enabled
    const { data: mfaData, error } = await supabase
      .from('user_2fa_secrets')
      .select('enabled')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (error) {
      console.error('Failed to fetch 2FA status:', error)
      return NextResponse.json(
        { error: 'Failed to fetch 2FA status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      enabled: mfaData?.enabled || false,
    })
  } catch (err) {
    console.error('2FA status error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
