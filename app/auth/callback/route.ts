import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error_description')

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=invalid_code', request.url))
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
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
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code)

    if (authError) {
      throw new Error(authError.message)
    }

    // Verify successful session creation
    // Immediately refresh cookies
    const { data: { session } } = await supabase.auth.getSession()
    const cookieStore2 = await cookies()
    const sessionCookie = cookieStore2.get('sb-access-token')
    if (!session || !sessionCookie) {
      throw new Error('Session creation failed - cookies not set')
    }
    
    // Set helper cookie for client-side detection
    cookieStore2.set('login-complete', 'true', {
      maxAge: 60 * 2, // 2 minutes
      path: '/',
    })

    // Always redirect to dashboard after successful login
    return NextResponse.redirect(new URL('/', request.url))
  } catch (err) {
    console.error('Authentication callback error:', err)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent((err as Error).message)}`, request.url))
  }
}
