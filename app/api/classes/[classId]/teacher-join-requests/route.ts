import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

async function requireTeacherMember(supabase: any, classId: string, userId: string) {
  const [{ data: member }, { data: profile }] = await Promise.all([
    supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', userId)
      .maybeSingle(),
  ])

  if (!member) {
    return { ok: false, status: 403, error: 'Not a member of this class' as const }
  }
  if (profile?.subscription_type !== 'teacher') {
    return { ok: false, status: 403, error: 'Only teachers can manage join requests' as const }
  }
  return { ok: true as const }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await requireTeacherMember(supabase, classId, user.id)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { data: rows, error } = await (supabase as any)
      .from('class_teacher_join_requests')
      .select('id, requester_user_id, requester_email, subject_title, status, requested_at, resolved_at, resolved_by')
      .eq('class_id', classId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requests: rows || [] })
  } catch (error) {
    console.error('teacher join requests GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json().catch(() => ({}))

    const requestId = String(body?.request_id || '')
    const decision = String(body?.decision || '')

    if (!requestId || (decision !== 'approve' && decision !== 'reject')) {
      return NextResponse.json({ error: 'request_id and decision(approve|reject) are required' }, { status: 400 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await requireTeacherMember(supabase, classId, user.id)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { data: joinRequest, error: requestError } = await (supabase as any)
      .from('class_teacher_join_requests')
      .select('id, class_id, requester_user_id, requester_email, subject_title, status')
      .eq('id', requestId)
      .eq('class_id', classId)
      .maybeSingle()

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 500 })
    }
    if (!joinRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    if (joinRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request already resolved' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const nextStatus = decision === 'approve' ? 'approved' : 'rejected'

    if (decision === 'approve') {
      const { error: memberInsertError } = await supabase
        .from('class_members')
        .upsert([{ class_id: classId, user_id: joinRequest.requester_user_id }], { onConflict: 'class_id,user_id' })

      if (memberInsertError) {
        return NextResponse.json({ error: memberInsertError.message }, { status: 500 })
      }

      const subjectTitle = String(joinRequest.subject_title || '').trim() || `${(joinRequest.requester_email || 'teacher').split('@')[0]}'s subject`

      const { data: existingOwnedSubject } = await supabase
        .from('subjects')
        .select('id')
        .eq('class_id', classId)
        .eq('user_id', joinRequest.requester_user_id)
        .maybeSingle()

      let subjectId = existingOwnedSubject?.id || null
      if (!subjectId) {
        const { data: createdSubject, error: createdSubjectError } = await supabase
          .from('subjects')
          .insert([{
            title: subjectTitle,
            description: null,
            class_id: classId,
            user_id: joinRequest.requester_user_id,
            class_label: subjectTitle,
          }])
          .select('id')
          .single()
        if (createdSubjectError || !createdSubject) {
          return NextResponse.json({ error: createdSubjectError?.message || 'Failed to create subject for approved teacher' }, { status: 500 })
        }
        subjectId = createdSubject.id
      }

      if (subjectId) {
        const { error: classSubjectError } = await (supabase as any)
          .from('class_subjects')
          .upsert([{ class_id: classId, subject_id: subjectId }], { onConflict: 'class_id,subject_id' })
        if (classSubjectError) {
          return NextResponse.json({ error: classSubjectError.message }, { status: 500 })
        }
      }
    }

    const { error: updateRequestError } = await (supabase as any)
      .from('class_teacher_join_requests')
      .update({
        status: nextStatus,
        resolved_by: user.id,
        resolved_at: nowIso,
      })
      .eq('id', requestId)

    if (updateRequestError) {
      return NextResponse.json({ error: updateRequestError.message }, { status: 500 })
    }

    await (supabase as any).from('notifications').insert({
      user_id: joinRequest.requester_user_id,
      type: 'teacher_join_request_result',
      title: nextStatus === 'approved' ? 'Teacher join approved' : 'Teacher join rejected',
      message:
        nextStatus === 'approved'
          ? `Your request to join class was approved.`
          : `Your request to join class was rejected.`,
      data: {
        class_id: classId,
        request_id: requestId,
        decision: nextStatus,
      },
    })

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: nextStatus === 'approved' ? 'teacher_join_request_approved' : 'teacher_join_request_rejected',
      entityType: 'member',
      entityId: requestId,
      metadata: {
        requester_user_id: joinRequest.requester_user_id,
        requester_email: joinRequest.requester_email,
      },
    })

    return NextResponse.json({ success: true, status: nextStatus })
  } catch (error) {
    console.error('teacher join requests PATCH failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

