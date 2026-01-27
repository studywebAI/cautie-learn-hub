import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET test subjects functionality
export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test subjects table access
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*')
      .limit(5)

    return NextResponse.json({
      success: true,
      user: user.id,
      subjectsCount: subjects?.length || 0,
      subjects: subjects,
      error: error?.message
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}