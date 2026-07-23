import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSubjectPermission } from '@/lib/auth/subject-permissions'

export const dynamic = 'force-dynamic'

// POST — toggle archived_at on a subject (B8, docs/subjects-feature-brainstorm.md).
// Body: { archived: boolean }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await getSubjectPermission(supabase as any, resolvedParams.subjectId, user.id)
    if (!perm.hasAccess || !perm.subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    if (!perm.isOwner) {
      const { data: teacherRow } = await (supabase as any)
        .from('subject_teachers')
        .select('teacher_id')
        .eq('subject_id', resolvedParams.subjectId)
        .eq('teacher_id', user.id)
        .maybeSingle()
      if (!teacherRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const archived = body?.archived === true

    const { data: updated, error } = await supabase
      .from('subjects')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', resolvedParams.subjectId)
      .select('id, archived_at')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ subject: updated })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
