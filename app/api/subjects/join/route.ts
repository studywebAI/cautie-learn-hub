import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'

import { joinSubjectSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'

export const dynamic = 'force-dynamic'

function sanitizeCode(input: string | null | undefined): string {
  return (input || '').trim()
}

// GET — resolve a subject join code to a subject preview, without joining.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = sanitizeCode(searchParams.get('code'))

  if (!code) {
    return NextResponse.json({ error: 'Join code is required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)

  const { data, error } = await (supabase as any).rpc('get_subject_by_join_code', { p_code: code })
  const subject = Array.isArray(data) ? data[0] : data

  if (error || !subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
  }

  return NextResponse.json({ id: subject.id, title: subject.title, description: subject.description })
}

// POST — join a subject directly by code (student self-enrollment, no class involved).
export async function POST(request: NextRequest) {
  const validation = await validateBody(request, joinSubjectSchema)
  if ('error' in validation) {
    return validation.error
  }
  const subjectCode = sanitizeCode(validation.data.subject_code)

  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await (supabase as any).rpc('get_subject_by_join_code', { p_code: subjectCode })
  const subject = Array.isArray(data) ? data[0] : data

  if (error || !subject) {
    return NextResponse.json({ error: 'Subject not found. Please check the code and try again.' }, { status: 404 })
  }

  const { error: insertError } = await (supabase as any)
    .from('subject_students')
    .insert([{ subject_id: subject.id, student_id: user.id, source: 'direct_join' }])

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({
        message: 'You already joined this subject.',
        alreadyJoined: true,
        subject: { id: subject.id, title: subject.title, description: subject.description },
      }, { status: 200 })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    message: `Successfully joined "${subject.title}"`,
    subject: { id: subject.id, title: subject.title, description: subject.description },
  })
}
