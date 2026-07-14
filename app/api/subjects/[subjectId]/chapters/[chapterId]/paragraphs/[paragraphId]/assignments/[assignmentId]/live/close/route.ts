import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getClassPermission } from '@/lib/auth/class-permissions'
import { markAttemptSubmitted } from '@/lib/assignments/attempts'
import { computeStudentAnswerStats } from '@/lib/assignments/live-status'
import { ensureGradeSetForAssignment } from '@/lib/grades/grade-sets'

export const dynamic = 'force-dynamic'

// POST force-close a live test — either one student's attempt or every
// currently in_progress attempt for this assignment. There is no
// 'teacher_closed' attempt status (the assignment_attempts.status CHECK
// constraint only allows in_progress/submitted/auto_submitted/expired), so a
// teacher-forced close reuses 'auto_submitted' — same value the codebase
// already uses for timeout auto-submits, and semantically the closest fit.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const attemptId = typeof body?.attemptId === 'string' ? body.attemptId : null
    const closeAll = body?.all === true

    if (!attemptId && !closeAll) {
      return NextResponse.json({ error: 'Provide attemptId or all: true' }, { status: 400 })
    }

    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, class_id')
      .eq('id', resolvedParams.assignmentId)
      .maybeSingle()

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (!(assignment as any).class_id) {
      return NextResponse.json({ error: 'Assignment has no class' }, { status: 400 })
    }

    const permission = await getClassPermission(supabase, (assignment as any).class_id, user.id)
    if (!permission.isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let query = supabase
      .from('assignment_attempts')
      .select('id, student_id, status')
      .eq('assignment_id', resolvedParams.assignmentId)
      .eq('status', 'in_progress')

    if (attemptId) {
      query = query.eq('id', attemptId)
    }

    const { data: targets } = await query

    const targetAttempts = targets || []
    if (targetAttempts.length === 0) {
      return NextResponse.json({ success: true, closedCount: 0 })
    }

    for (const attempt of targetAttempts) {
      const stats = await computeStudentAnswerStats(supabase, resolvedParams.assignmentId, (attempt as any).student_id)
      await markAttemptSubmitted(supabase, (attempt as any).id, stats.score, stats.maxScore, 'auto_submitted')
    }

    if (targetAttempts.length > 0) {
      await ensureGradeSetForAssignment(supabase, resolvedParams.assignmentId)
    }

    return NextResponse.json({ success: true, closedCount: targetAttempts.length })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
