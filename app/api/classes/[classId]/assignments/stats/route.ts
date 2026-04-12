import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getClassPermission } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const perm = await getClassPermission(supabase as any, classId, user.id)
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: assignmentRows, error: assignmentError } = await supabase
      .from('assignments')
      .select('id')
      .eq('class_id', classId)
    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 })
    }

    const assignmentIds = (assignmentRows || []).map((a: any) => a.id)

    const { data: memberRows, error: membersError } = await supabase
      .from('class_members')
      .select('user_id, role')
      .eq('class_id', classId)
    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    const studentIds = (memberRows || [])
      .filter((m: any) => String(m.role || '').toLowerCase() === 'student' || !m.role)
      .map((m: any) => m.user_id)

    let submissions: any[] = []
    if (assignmentIds.length > 0 && studentIds.length > 0) {
      const { data: submissionRows, error: submissionError } = await supabase
        .from('submissions')
        .select('assignment_id, user_id, status')
        .in('assignment_id', assignmentIds)
        .in('user_id', studentIds)

      if (submissionError) {
        return NextResponse.json({ error: submissionError.message }, { status: 500 })
      }
      submissions = submissionRows || []
    }

    const submissionsByAssignment: Record<string, number> = {}
    for (const sub of submissions) {
      submissionsByAssignment[sub.assignment_id] = (submissionsByAssignment[sub.assignment_id] || 0) + 1
    }

    return NextResponse.json({
      classId,
      totalStudents: studentIds.length,
      assignmentStats: assignmentIds.map((assignmentId: string) => ({
        assignmentId,
        submissions: submissionsByAssignment[assignmentId] || 0,
        submissionRate:
          studentIds.length > 0
            ? Math.round(((submissionsByAssignment[assignmentId] || 0) / studentIds.length) * 100)
            : 0,
      })),
    })
  } catch (error) {
    console.error('[assignment-stats] GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

