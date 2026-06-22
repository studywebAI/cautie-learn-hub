import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
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

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Cautie (${session.user.email})`,
      issuer: 'Cautie Learn Hub',
      length: 32,
    })

    if (!secret.base32) {
      return NextResponse.json(
        { error: 'Failed to generate secret' },
        { status: 500 }
      )
    }

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '')

    // Return secret and QR code (don't store yet - user must verify first)
    return NextResponse.json({
      success: true,
      secret: secret.base32,
      qrCode,
    })
  } catch (err) {
    console.error('2FA enroll error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
