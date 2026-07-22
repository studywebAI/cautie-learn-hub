import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getTeacherSubjectIds } from '@/lib/auth/subject-permissions'

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

    let ownedClassIds: string[] = []
    if (requestedClassIds.length > 0) {
      // Only include classes this user actually teaches.
      const { data: memberships } = await (supabase as any)
        .from('class_members')
        .select('class_id, role')
        .eq('user_id', user.id)
        .in('class_id', requestedClassIds)

      const teacherRoles = new Set(['teacher', 'owner', 'admin', 'creator', 'ta'])
      ownedClassIds = (memberships || [])
        .filter((m: any) => teacherRoles.has(String(m.role || '').toLowerCase()))
        .map((m: any) => m.class_id)
    }

    const teacherSubjectIds = await getTeacherSubjectIds(supabase, user.id)

    if (ownedClassIds.length === 0 && teacherSubjectIds.length === 0) {
      return NextResponse.json({ liveTests: [] })
    }

    const assignmentSelect = 'id, title, class_id, type, paragraph_id, class:classes(id, name), paragraphs(id, chapter_id, chapters(id, subject_id))'

    const [byClassResult, bySubjectResult] = await Promise.all([
      ownedClassIds.length > 0
        ? (supabase as any).from('assignments').select(assignmentSelect).in('class_id', ownedClassIds).in('type', ['small_test', 'big_test'])
        : Promise.resolve({ data: [] }),
      // Standalone (class-less) assignments have class_id = null, so they're
      // only reachable through their paragraph's chapter -> subject_id chain.
      teacherSubjectIds.length > 0
        ? (supabase as any)
            .from('assignments')
            .select(assignmentSelect)
            .is('class_id', null)
            .in('type', ['small_test', 'big_test'])
            .in('paragraphs.chapters.subject_id', teacherSubjectIds)
        : Promise.resolve({ data: [] }),
    ])

    const seen = new Set<string>()
    const assignmentList = [...(byClassResult.data || []), ...(bySubjectResult.data || [])]
      // The nested .in() filter above only prunes rows whose relation
      // actually matches -- rows where the relation join comes back null
      // still pass through, so filter defensively on the resolved subject_id.
      .filter((a: any) => a.class_id ? true : teacherSubjectIds.includes(a.paragraphs?.chapters?.subject_id))
      .filter((a: any) => {
        if (seen.has(a.id)) return false
        seen.add(a.id)
        return true
      })

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
