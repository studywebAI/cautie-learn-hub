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

// POST — request to join a subject by code. One code, both roles go
// through the same approval step: a student or a teacher entering the
// code files a pending subject_join_requests row (role recorded from
// their account type), and an existing subject teacher must approve it
// (PATCH /api/subjects/[subjectId]/join-requests) before they actually
// get a subject_students / subject_teachers row.
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

  const { data: ownerCheck } = await (supabase as any)
    .from('subjects')
    .select('user_id')
    .eq('id', subject.id)
    .maybeSingle()

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', user.id)
    .maybeSingle()
  const isTeacher = ['teacher', 'owner', 'admin', 'creator'].includes(String(profile?.subscription_type || '').toLowerCase())
  const role = isTeacher ? 'teacher' : 'student'

  if (ownerCheck?.user_id === user.id) {
    return NextResponse.json({
      message: 'You already own this subject.',
      alreadyJoined: true,
      subject: { id: subject.id, title: subject.title, description: subject.description },
    }, { status: 200 })
  }

  const membershipTable = isTeacher ? 'subject_teachers' : 'subject_students'
  const membershipColumn = isTeacher ? 'teacher_id' : 'student_id'
  const { data: existingMembership } = await (supabase as any)
    .from(membershipTable)
    .select(membershipColumn)
    .eq('subject_id', subject.id)
    .eq(membershipColumn, user.id)
    .maybeSingle()
  if (existingMembership) {
    return NextResponse.json({
      message: 'You already joined this subject.',
      alreadyJoined: true,
      subject: { id: subject.id, title: subject.title, description: subject.description },
    }, { status: 200 })
  }

  const { data: existingPending } = await (supabase as any)
    .from('subject_join_requests')
    .select('id')
    .eq('subject_id', subject.id)
    .eq('requester_user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()
  if (existingPending) {
    return NextResponse.json({
      message: 'Your request to join this subject is already pending approval.',
      pendingApproval: true,
      subject: { id: subject.id, title: subject.title, description: subject.description },
    }, { status: 202 })
  }

  const { data: createdRequest, error: requestError } = await (supabase as any)
    .from('subject_join_requests')
    .insert([{ subject_id: subject.id, requester_user_id: user.id, requester_email: user.email || null, role }])
    .select('id')
    .single()

  if (requestError || !createdRequest) {
    return NextResponse.json({ error: requestError?.message || 'Failed to create join request' }, { status: 500 })
  }

  const { data: teacherRows } = await (supabase as any)
    .from('subject_teachers')
    .select('teacher_id')
    .eq('subject_id', subject.id)
  const approverIds = Array.from(new Set([ownerCheck?.user_id, ...(teacherRows || []).map((r: any) => r.teacher_id)]))
    .filter((id) => id && id !== user.id)

  if (approverIds.length > 0) {
    await (supabase as any).from('notifications').insert(
      approverIds.map((teacherId) => ({
        user_id: teacherId,
        type: 'subject_join_request',
        title: role === 'teacher' ? 'Co-teacher request' : 'New pending student',
        message: role === 'teacher'
          ? `${user.email || 'A teacher'} wants to co-teach "${subject.title}"`
          : `${user.email || 'A student'} wants to join "${subject.title}"`,
        data: {
          request_id: createdRequest.id,
          subject_id: subject.id,
          subject_title: subject.title,
          requester_user_id: user.id,
          requester_email: user.email || null,
          role,
        },
      }))
    )
  }

  return NextResponse.json({
    message: 'Request sent. Waiting for approval from an existing teacher of this subject.',
    pendingApproval: true,
    subject: { id: subject.id, title: subject.title, description: subject.description },
  }, { status: 202 })
}
