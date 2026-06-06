import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getClassPermission } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

// DELETE - remove a calendar event (teachers only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ classId: string; eventId: string }> }
) {
  const { classId, eventId } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
        remove(name: string, options: any) { cookieStore.set(name, '', { ...options, maxAge: 0 }) },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const perm = await getClassPermission(supabase, classId, user.id)
  if (!perm.isTeacher) {
    return NextResponse.json({ error: 'Only teachers can delete class calendar events' }, { status: 403 })
  }

  const { error } = await (supabase as any)
    .from('class_calendar_events')
    .delete()
    .eq('id', eventId)
    .eq('class_id', classId)

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to delete calendar event' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
