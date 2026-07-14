import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getClassPermission } from '@/lib/auth/class-permissions'
import { computeStudentAnswerStats } from '@/lib/assignments/live-status'

export const dynamic = 'force-dynamic'

// "Possibly left" heuristic: an attempt is still `in_progress` but its most
// recent assignment_events row (any event type — assignment_open, tab_switch,
// fullscreen_exit, suspicious_paste, ...) is older than this window. This is
// NOT true real-time presence (no websockets/heartbeat in this codebase) —
// it's a proxy based on "have we heard anything from this student recently".
// A student who is silently reading/typing without triggering any event for
// a while will also get flagged; teachers should treat this as a hint, not a
// fact.
const POSSIBLY_LEFT_THRESHOLD_MS = 2 * 60_000;

// GET live monitoring status for a test: per-student progress, security
// flags, and whether the test currently counts as "live" at all.
export async function GET(
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

    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, title, class_id')
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

    const { data: attempts } = await supabase
      .from('assignment_attempts')
      .select('*')
      .eq('assignment_id', resolvedParams.assignmentId)
      .order('started_at', { ascending: true })

    const attemptList = attempts || []
    const studentIds = Array.from(new Set(attemptList.map((a: any) => a.student_id).filter(Boolean)))
    const attemptIds = attemptList.map((a: any) => a.id).filter(Boolean)

    const [{ data: profiles }, { data: pasteEvents }, { data: latestEvents }] = await Promise.all([
      studentIds.length > 0
        ? supabase.from('profiles').select('id, full_name, email').in('id', studentIds)
        : Promise.resolve({ data: [] as any[] }),
      attemptIds.length > 0
        ? supabase
            .from('assignment_events')
            .select('attempt_id')
            .eq('assignment_id', resolvedParams.assignmentId)
            .eq('event_type', 'suspicious_paste')
            .in('attempt_id', attemptIds)
        : Promise.resolve({ data: [] as any[] }),
      attemptIds.length > 0
        ? supabase
            .from('assignment_events')
            .select('attempt_id, created_at')
            .eq('assignment_id', resolvedParams.assignmentId)
            .in('attempt_id', attemptIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ])

    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]))
    const pasteCountByAttempt = new Map<string, number>()
    for (const row of pasteEvents || []) {
      const id = (row as any).attempt_id
      if (!id) continue
      pasteCountByAttempt.set(id, (pasteCountByAttempt.get(id) || 0) + 1)
    }
    const lastEventByAttempt = new Map<string, string>()
    for (const row of latestEvents || []) {
      const id = (row as any).attempt_id
      if (!id || lastEventByAttempt.has(id)) continue
      lastEventByAttempt.set(id, (row as any).created_at)
    }

    const now = Date.now()
    const students = await Promise.all(
      attemptList.map(async (attempt: any) => {
        const stats = await computeStudentAnswerStats(supabase, resolvedParams.assignmentId, attempt.student_id)
        const profile = profileById.get(attempt.student_id)
        const lastEventAt = lastEventByAttempt.get(attempt.id) || attempt.started_at
        const lastSeenAgeMs = lastEventAt ? now - new Date(lastEventAt).getTime() : Infinity
        const possiblyLeft = attempt.status === 'in_progress' && lastSeenAgeMs > POSSIBLY_LEFT_THRESHOLD_MS

        return {
          attemptId: attempt.id,
          studentId: attempt.student_id,
          studentName: profile?.full_name || profile?.email || 'Student',
          status: attempt.status,
          startedAt: attempt.started_at,
          submittedAt: attempt.submitted_at,
          dueAt: attempt.due_at,
          correct: stats.correct,
          incorrect: stats.incorrect,
          ungraded: stats.ungraded,
          totalBlocks: stats.totalBlocks,
          score: attempt.score ?? stats.score,
          maxScore: attempt.max_score ?? stats.maxScore,
          tabSwitchCount: attempt.tab_switch_count || 0,
          fullscreenExitCount: attempt.fullscreen_exit_count || 0,
          suspiciousPasteCount: pasteCountByAttempt.get(attempt.id) || 0,
          lastSeenAt: lastEventAt,
          possiblyLeft,
        }
      })
    )

    const isLive = attemptList.some((a: any) => a.status === 'in_progress')

    return NextResponse.json({
      assignmentId: resolvedParams.assignmentId,
      assignmentTitle: (assignment as any).title,
      isLive,
      inProgressCount: attemptList.filter((a: any) => a.status === 'in_progress').length,
      submittedCount: attemptList.filter((a: any) => a.status === 'submitted' || a.status === 'auto_submitted').length,
      students,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
