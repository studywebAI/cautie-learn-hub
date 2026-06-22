import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import speakeasy from 'speakeasy'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

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

    // Fetch current TOTP secret
    const { data: mfaData, error: fetchError } = await supabase
      .from('user_2fa_secrets')
      .select('totp_secret')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (fetchError || !mfaData?.totp_secret) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      )
    }

    // Verify TOTP code before disabling
    const verified = speakeasy.totp.verify({
      secret: mfaData.totp_secret,
      encoding: 'base32',
      token: code.toString(),
      window: 2,
    })

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      )
    }

    // Disable 2FA
    const { error: disableError } = await supabase
      .from('user_2fa_secrets')
      .update({ enabled: false })
      .eq('user_id', session.user.id)

    if (disableError) {
      console.error('Failed to disable 2FA:', disableError)
      return NextResponse.json(
        { error: 'Failed to disable 2FA' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully',
    })
  } catch (err) {
    console.error('2FA disable error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
