import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSubjectPermission } from '@/lib/auth/subject-permissions'

export const dynamic = 'force-dynamic'

async function requireTeacher(supabase: any, subjectId: string, userId: string) {
  const perm = await getSubjectPermission(supabase, subjectId, userId)
  if (!perm.hasAccess || !perm.subject) return { ok: false as const, status: 404, error: 'Subject not found' }
  if (perm.isOwner) return { ok: true as const, subject: perm.subject }
  const { data: teacherRow } = await supabase
    .from('subject_teachers')
    .select('teacher_id')
    .eq('subject_id', subjectId)
    .eq('teacher_id', userId)
    .maybeSingle()
  if (!teacherRow) return { ok: false as const, status: 403, error: 'Only teachers can manage join requests' }
  return { ok: true as const, subject: perm.subject }
}

// GET — pending join requests for a subject (both students and
// co-teachers), teacher-only.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { subjectId } = await params
    const access = await requireTeacher(supabase as any, subjectId, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { data: rows } = await (supabase as any)
      .from('subject_join_requests')
      .select('id, requester_user_id, requester_email, role, created_at')
      .eq('subject_id', subjectId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    const requests = (rows || []).map((row: any) => ({
      id: row.id,
      requesterId: row.requester_user_id,
      email: row.requester_email,
      role: row.role,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ requests })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH — approve or reject a pending request. On approve, adds the
// requester to subject_students or subject_teachers depending on the
// role recorded when they requested to join.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { subjectId } = await params
    const access = await requireTeacher(supabase as any, subjectId, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json().catch(() => ({}))
    const requestId = String(body?.requestId || '')
    const action = String(body?.action || '')
    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'requestId and a valid action are required' }, { status: 400 })
    }

    const { data: joinRequest } = await (supabase as any)
      .from('subject_join_requests')
      .select('id, requester_user_id, role, status')
      .eq('id', requestId)
      .eq('subject_id', subjectId)
      .maybeSingle()

    if (!joinRequest || joinRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Join request not found or already resolved' }, { status: 404 })
    }

    if (action === 'approve') {
      const table = joinRequest.role === 'teacher' ? 'subject_teachers' : 'subject_students'
      const payload = joinRequest.role === 'teacher'
        ? { subject_id: subjectId, teacher_id: joinRequest.requester_user_id, role: 'teacher', permissions: { can_manage_students: true, can_manage_content: true } }
        : { subject_id: subjectId, student_id: joinRequest.requester_user_id, role: 'student', source: 'direct_join' }

      const { error: insertError } = await (supabase as any).from(table).insert(payload)
      if (insertError && insertError.code !== '23505') {
        return NextResponse.json({ error: insertError.message || 'Failed to add member' }, { status: 500 })
      }
    }

    const { error: updateError } = await (supabase as any)
      .from('subject_join_requests')
      .update({ status: action === 'approve' ? 'approved' : 'rejected', resolved_at: new Date().toISOString(), resolved_by: user.id })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to resolve join request' }, { status: 500 })
    }

    await (supabase as any).from('notifications').insert({
      user_id: joinRequest.requester_user_id,
      type: 'subject_join_resolved',
      title: action === 'approve' ? 'Join request approved' : 'Join request declined',
      message: action === 'approve'
        ? `You're now part of "${access.subject.title}"`
        : `Your request to join "${access.subject.title}" was declined`,
      data: { subject_id: subjectId, subject_title: access.subject.title },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
