import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/dashboard/teacher/live-tests?classIds=a,b,c
// Lightweight "do any of my tests currently have a student in progress"
// check for the teacher dashboard widget — polled every ~30s while mounted.
// Only returns tests that have at least one in_progress attempt right now.
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const classIdsParam = req.nextUrl.searchParams.get('classIds') || ''
    const requestedClassIds = classIdsParam.split(',').map(s => s.trim()).filter(Boolean)

    if (requestedClassIds.length === 0) {
      return NextResponse.json({ liveTests: [] })
    }

    // Only include classes this user actually teaches.
    const { data: memberships } = await (supabase as any)
      .from('class_members')
      .select('class_id, role')
      .eq('user_id', user.id)
      .in('class_id', requestedClassIds)

    const teacherRoles = new Set(['teacher', 'owner', 'admin', 'creator', 'ta'])
    const ownedClassIds = (memberships || [])
      .filter((m: any) => teacherRoles.has(String(m.role || '').toLowerCase()))
      .map((m: any) => m.class_id)

    if (ownedClassIds.length === 0) {
      return NextResponse.json({ liveTests: [] })
    }

    const { data: assignments } = await (supabase as any)
      .from('assignments')
      .select('id, title, class_id, type, paragraph_id, class:classes(id, name), paragraphs(id, chapter_id, chapters(id, subject_id))')
      .in('class_id', ownedClassIds)
      .in('type', ['small_test', 'big_test'])

    const assignmentList = assignments || []
    if (assignmentList.length === 0) {
      return NextResponse.json({ liveTests: [] })
    }

    const assignmentIds = assignmentList.map((a: any) => a.id)
    const { data: attempts } = await supabase
      .from('assignment_attempts')
      .select('assignment_id, status')
      .in('assignment_id', assignmentIds)

    const countsByAssignment = new Map<string, { inProgress: number; submitted: number }>()
    for (const attempt of attempts || []) {
      const id = (attempt as any).assignment_id
      const entry = countsByAssignment.get(id) || { inProgress: 0, submitted: 0 }
      if ((attempt as any).status === 'in_progress') entry.inProgress += 1
      else if ((attempt as any).status === 'submitted' || (attempt as any).status === 'auto_submitted') entry.submitted += 1
      countsByAssignment.set(id, entry)
    }

    const liveTests = assignmentList
      .map((a: any) => {
        const counts = countsByAssignment.get(a.id) || { inProgress: 0, submitted: 0 }
        return {
          assignmentId: a.id,
          title: a.title,
          className: a.class?.name || 'Class',
          classId: a.class_id,
          subjectId: a.paragraphs?.chapters?.subject_id || null,
          chapterId: a.paragraphs?.chapter_id || null,
          paragraphId: a.paragraph_id,
          inProgressCount: counts.inProgress,
          submittedCount: counts.submitted,
        }
      })
      .filter((t: any) => t.inProgressCount > 0 && t.subjectId && t.chapterId && t.paragraphId)

    return NextResponse.json({ liveTests })
  } catch (err) {
    return NextResponse.json({ liveTests: [] })
  }
}
