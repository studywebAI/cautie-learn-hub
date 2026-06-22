import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import speakeasy from 'speakeasy'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { secret, code } = body

    if (!secret || !code) {
      return NextResponse.json(
        { error: 'Secret and code are required' },
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

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code.toString(),
      window: 2, // Allow ±2 time steps for clock skew
    })

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      )
    }

    // Store TOTP secret in user metadata
    // We'll store it in a separate table since user_metadata has limitations
    const { error } = await supabase
      .from('user_2fa_secrets')
      .upsert({
        user_id: session.user.id,
        totp_secret: secret,
        enabled: true,
      })

    if (error) {
      console.error('Failed to save TOTP secret:', error)
      return NextResponse.json(
        { error: 'Failed to enable 2FA' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
    })
  } catch (err) {
    console.error('2FA verify enroll error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
