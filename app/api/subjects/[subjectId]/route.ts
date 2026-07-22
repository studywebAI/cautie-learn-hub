import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSubjectPermission } from '@/lib/auth/subject-permissions'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const resolvedParams = await params
  const subjectId = resolvedParams.subjectId

  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const perm = await getSubjectPermission(supabase as any, subjectId, user.id)
    if (perm.error) return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 })
    if (!perm.hasAccess || !perm.subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const { data: subject, error: fetchError } = await (supabase as any)
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .maybeSingle()

    if (fetchError || !subject) {
      return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 })
    }

    return NextResponse.json(subject)
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Mirrors app/api/classes/[classId]/route.ts's PATCH action shape
// (update_profile / regenerate_codes), scoped to subjects instead.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const resolvedParams = await params
  const subjectId = resolvedParams.subjectId

  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const perm = await getSubjectPermission(supabase as any, subjectId, user.id)
    if (!perm.hasAccess || !perm.subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    if (!perm.isOwner) {
      const { data: teacherRow } = await (supabase as any)
        .from('subject_teachers')
        .select('teacher_id')
        .eq('subject_id', subjectId)
        .eq('teacher_id', user.id)
        .maybeSingle()
      if (!teacherRow) return NextResponse.json({ error: 'Only teachers can update subject settings' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const action = String(body?.action || '')

    if (action === 'update_profile') {
      const nextTitle = String(body?.title || '').trim()
      const rawDescription = body?.description
      const nextDescription = typeof rawDescription === 'string' ? rawDescription.trim() : ''

      if (!nextTitle || nextTitle.length < 2 || nextTitle.length > 120) {
        return NextResponse.json({ error: 'title must be between 2 and 120 characters' }, { status: 400 })
      }

      const { error: updateError } = await (supabase as any)
        .from('subjects')
        .update({ title: nextTitle, description: nextDescription || null })
        .eq('id', subjectId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message || 'Failed to update subject' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'regenerate_join_code') {
      const { data: newCode } = await (supabase as any).rpc('generate_subject_join_code')
      if (!newCode) {
        return NextResponse.json({ error: 'Failed to generate new join code' }, { status: 500 })
      }

      const { error: updateError } = await (supabase as any)
        .from('subjects')
        .update({ join_code: newCode })
        .eq('id', subjectId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message || 'Failed to update join code' }, { status: 500 })
      }

      return NextResponse.json({ join_code: newCode })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
