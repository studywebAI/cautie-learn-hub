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

  if (!member) return { ok: false, status: 403, error: 'Not a class member' as const }
  if (profile?.subscription_type !== 'teacher') return { ok: false, status: 403, error: 'Only teachers can manage teacher invite codes' as const }
  return { ok: true as const }
}

async function getInviteSettings(supabase: any, classId: string) {
  const { data } = await (supabase as any)
    .from('class_preferences')
    .select('invite_allow_teacher_invites')
    .eq('class_id', classId)
    .maybeSingle()

  return {
    invite_allow_teacher_invites: data?.invite_allow_teacher_invites !== false,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await requireTeacherMember(supabase, classId, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const inviteSettings = await getInviteSettings(supabase, classId)

    const { data: codeRows, error } = await (supabase as any)
      .from('class_teacher_invite_codes')
      .select('id, code, issued_by, issued_to_email, status, issued_at, expires_at, used_by, used_at')
      .eq('class_id', classId)
      .order('issued_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userIds = [...new Set((codeRows || []).flatMap((r: any) => [r.issued_by, r.used_by]).filter(Boolean))]
    let userMap = new Map<string, string>()
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
      userMap = new Map((profiles || []).map((p: any) => [p.id, p.email || p.full_name || p.id]))
    }

    const now = Date.now()
    const codes = (codeRows || []).map((row: any) => ({
      ...row,
      issued_by_label: userMap.get(row.issued_by) || row.issued_by,
      used_by_label: row.used_by ? (userMap.get(row.used_by) || row.used_by) : null,
      is_expired: row.status === 'active' && new Date(row.expires_at).getTime() <= now,
    }))

    return NextResponse.json({
      teacher_invites_enabled: inviteSettings.invite_allow_teacher_invites,
      active_codes: codes.filter((c: any) => c.status === 'active' && !c.is_expired),
      recent_codes: codes,
    })
  } catch (error) {
    console.error('teacher invite codes GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await request.json().catch(() => ({}))

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await requireTeacherMember(supabase, classId, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const inviteSettings = await getInviteSettings(supabase, classId)
    if (!inviteSettings.invite_allow_teacher_invites) {
      return NextResponse.json({ error: 'Teacher invites are disabled for this class' }, { status: 403 })
    }

    const expiresInMinutes = Math.max(5, Math.min(24 * 60, Number(body?.expires_in_minutes || 60)))
    const issuedToEmail = body?.issued_to_email ? String(body.issued_to_email).trim().toLowerCase() : null

    const { data: generatedCode } = await (supabase as any).rpc('generate_teacher_join_code')
    const code = String(generatedCode || '').trim()
    if (!code) return NextResponse.json({ error: 'Failed to generate invite code' }, { status: 500 })

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000).toISOString()
    const { data: insertedCode, error: insertError } = await (supabase as any)
      .from('class_teacher_invite_codes')
      .insert([{
        class_id: classId,
        code,
        issued_by: user.id,
        issued_to_email: issuedToEmail,
        status: 'active',
        expires_at: expiresAt,
      }])
      .select('id, code, issued_at, expires_at, issued_to_email')
      .single()

    if (insertError || !insertedCode) {
      return NextResponse.json({ error: insertError?.message || 'Failed to create invite code' }, { status: 500 })
    }

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: 'teacher_invite_code_issued',
      entityType: 'teacher_invite_code',
      entityId: insertedCode.id,
      metadata: {
        issued_to_email: issuedToEmail,
        expires_at: insertedCode.expires_at,
      },
    })

    return NextResponse.json({ success: true, code: insertedCode })
  } catch (error) {
    console.error('teacher invite codes POST failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await request.json().catch(() => ({}))
    const codeId = String(body?.code_id || '')
    const action = String(body?.action || '')

    if (!codeId || action !== 'revoke') {
      return NextResponse.json({ error: 'code_id and action=revoke are required' }, { status: 400 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await requireTeacherMember(supabase, classId, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { error: updateError } = await (supabase as any)
      .from('class_teacher_invite_codes')
      .update({ status: 'revoked' })
      .eq('id', codeId)
      .eq('class_id', classId)
      .eq('status', 'active')

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: 'teacher_invite_code_revoked',
      entityType: 'teacher_invite_code',
      entityId: codeId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('teacher invite codes PATCH failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

