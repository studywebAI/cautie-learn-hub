import { createServerClient } from '@supabase/ssr'
import { type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  console.log('[logout] POST - Starting logout process');
  
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
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (e) {
              // Ignore errors in server components
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (e) {
              // Ignore errors in server components
            }
          },
        },
      }
    )

    // Check if we have a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('[logout] Session check:', { 
      hasSession: !!session, 
      sessionError: sessionError?.message || 'none' 
    });

    if (session) {
      const { error: signOutError } = await supabase.auth.signOut()
      console.log('[logout] SignOut result:', { 
        error: signOutError?.message || 'success' 
      });
    }

    // Clear all Supabase cookies manually as a fallback
    const allCookies = cookieStore.getAll()
    for (const cookie of allCookies) {
      if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
        try {
          cookieStore.set({ name: cookie.name, value: '', maxAge: 0 })
          console.log('[logout] Cleared cookie:', cookie.name);
        } catch (e) {
          // Ignore
        }
      }
    }

    console.log('[logout] Redirecting to /login');
    return NextResponse.redirect(new URL('/login', req.url), {
      status: 302,
    })
  } catch (error) {
    console.error('[logout] Error:', error);
    // Still redirect even on error
    return NextResponse.redirect(new URL('/login', req.url), {
      status: 302,
    })
  }
}
