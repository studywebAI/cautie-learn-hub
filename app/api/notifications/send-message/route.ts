import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getClassPermission } from '@/lib/auth/class-permissions'

// POST /api/notifications/send-message
// Teacher-only. Sends a one-way notification to either a whole class or a
// single student in that class — not a chat, just a targeted push message
// that shows up in the recipient's notification inbox / dashboard.
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const classId = typeof body?.classId === 'string' ? body.classId : null
    const studentId = typeof body?.studentId === 'string' ? body.studentId : null
    const message = typeof body?.message === 'string' ? body.message.trim() : ''

    if (!classId || !message) {
      return NextResponse.json({ error: 'classId and message are required' }, { status: 400 })
    }
    if (message.length > 500) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 })
    }

    const perm = await getClassPermission(supabase as any, classId, user.id)
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Only teachers of this class can send messages' }, { status: 403 })
    }

    let recipientIds: string[] = []
    if (studentId) {
      const { data: member } = await (supabase as any)
        .from('class_members')
        .select('user_id, role')
        .eq('class_id', classId)
        .eq('user_id', studentId)
        .maybeSingle()
      if (!member) {
        return NextResponse.json({ error: 'That student is not a member of this class' }, { status: 404 })
      }
      recipientIds = [studentId]
    } else {
      const { data: members } = await (supabase as any)
        .from('class_members')
        .select('user_id, role')
        .eq('class_id', classId)
      recipientIds = (members || [])
        .filter((m: any) => m.role !== 'teacher')
        .map((m: any) => String(m.user_id))
        .filter((id: string) => id && id !== user.id)
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 404 })
    }

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle()
    const senderName = profile?.full_name || (profile?.email ? profile.email.split('@')[0] : 'Your teacher')

    const rows = recipientIds.map((id) => ({
      user_id: id,
      type: 'class_message',
      title: `Message from ${senderName}`,
      message,
      data: { class_id: classId, from_user_id: user.id },
    }))

    const { error: insertError } = await supabase.from('notifications').insert(rows)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, recipientCount: recipientIds.length })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
