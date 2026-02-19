import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update the user's last_seen in profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update presence:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })

  } catch (error) {
    console.error('Error updating presence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
