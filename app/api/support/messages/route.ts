import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - submit a "Reach us" message from the Help & FAQ page.
// No email/phone/chatbot routing yet — just stores the message for manual triage.
export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body?.body === 'string' ? body.body.trim() : ''

  if (!subject) {
    return NextResponse.json({ error: 'subject is required' }, { status: 400 })
  }
  if (!message) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  const { data: inserted, error } = await (supabase as any)
    .from('support_messages')
    .insert({
      user_id: user.id,
      subject,
      body: message,
    })
    .select('id, subject, body, status, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to send message' }, { status: 500 })
  }

  return NextResponse.json({ message: inserted })
}
