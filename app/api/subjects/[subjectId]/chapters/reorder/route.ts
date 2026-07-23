import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSubjectPermission } from '@/lib/auth/subject-permissions'

export const dynamic = 'force-dynamic'

// POST — reassigns chapter_number for every chapter in a subject based on
// the given order (drag-to-reorder on the subject page, docs/subjects-
// feature-brainstorm.md section C point 11). Teacher-only.
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

    // Previously only checked the account was *a* teacher, not a teacher of
    // *this* subject -- any teacher on the platform could reorder any other
    // teacher's subject's chapters. Scope it to this subject's own owner/
    // co-teachers instead.
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
    const orderedIds = Array.isArray(body?.orderedIds) ? body.orderedIds.filter((id: any) => typeof id === 'string') : []
    if (orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds is required' }, { status: 400 })
    }

    const { data: existingChapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('subject_id', resolvedParams.subjectId)

    const validIds = new Set((existingChapters || []).map((c: any) => c.id))
    if (!orderedIds.every((id: string) => validIds.has(id)) || orderedIds.length !== validIds.size) {
      return NextResponse.json({ error: 'orderedIds must match this subject\'s chapters exactly' }, { status: 400 })
    }

    for (let i = 0; i < orderedIds.length; i++) {
      await supabase
        .from('chapters')
        .update({ chapter_number: i + 1 })
        .eq('id', orderedIds[i])
        .eq('subject_id', resolvedParams.subjectId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
