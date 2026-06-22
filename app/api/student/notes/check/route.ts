import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const topicId = url.searchParams.get('topicId')

    // For now, we return a simple check.
    // In a real implementation, you'd query a notes table to check if user has notes for this topic.
    // This is a placeholder that always returns hasNotes: false for demo purposes.

    // If there's a notes table in the future, it would look like:
    // const { data } = await supabase
    //   .from('user_notes')
    //   .select('id')
    //   .eq('user_id', user.id)
    //   .eq('topic_id', topicId)
    //   .maybeSingle()

    return NextResponse.json({
      topicId,
      hasNotes: false, // Placeholder: implement when notes table exists
      userId: user.id,
    })
  } catch (err) {
    console.error('Notes check error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
