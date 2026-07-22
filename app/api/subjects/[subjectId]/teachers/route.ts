import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSubjectPermission } from '@/lib/auth/subject-permissions'

export const dynamic = 'force-dynamic'

// Lists everyone with teacher-level access to a subject: its owner
// (subjects.user_id) plus any co-teacher rows in subject_teachers.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { subjectId } = resolvedParams

    const perm = await getSubjectPermission(supabase as any, subjectId, user.id)
    if (!perm.hasAccess || !perm.subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    const { data: teacherRows } = await (supabase as any)
      .from('subject_teachers')
      .select('teacher_id')
      .eq('subject_id', subjectId)

    const teacherIds = Array.from(new Set([perm.subject.user_id, ...(teacherRows || []).map((row: any) => row.teacher_id)].filter(Boolean)))

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, email')
      .in('id', teacherIds)

    const teachers = teacherIds.map((id) => {
      const profile = (profiles || []).find((p: any) => p.id === id)
      return {
        id,
        name: profile?.display_name || profile?.full_name || profile?.email || id,
        isOwner: id === perm.subject!.user_id,
      }
    })

    return NextResponse.json({ teachers })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
