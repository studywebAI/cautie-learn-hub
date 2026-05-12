import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { getClassPermission } from '@/lib/auth/class-permissions'

// GET /api/classes/[classId]/grades/student
// Returns the current student's own published grades for this class.
export async function GET(
  _req: NextRequest,
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
    if (!perm.isMember) {
      return NextResponse.json({ error: 'Not a member of this class' }, { status: 403 })
    }

    let dataClient: any = supabase
    try { dataClient = createAdminClient() } catch { /* use user client */ }

    // Fetch published grade sets with the student's grade entry
    const { data: gradeSets, error: setsError } = await dataClient
      .from('grade_sets')
      .select(`
        id,
        title,
        status,
        created_at,
        published_at,
        subject:subjects(id, title),
        student_grades!inner(
          id,
          student_id,
          grade_value,
          grade_numeric,
          status
        )
      `)
      .eq('class_id', classId)
      .eq('status', 'published')
      .eq('student_grades.student_id', user.id)
      .order('published_at', { ascending: false })

    if (setsError) {
      // Fallback without join if schema is older
      const { data: fallbackSets } = await dataClient
        .from('grade_sets')
        .select('id, title, status, created_at, published_at, subject_id')
        .eq('class_id', classId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (!fallbackSets) {
        return NextResponse.json({ grades: [] })
      }

      const setIds = fallbackSets.map((s: any) => s.id)
      const { data: studentGrades } = await dataClient
        .from('student_grades')
        .select('id, grade_set_id, grade_value, grade_numeric, student_id')
        .eq('student_id', user.id)
        .in('grade_set_id', setIds)

      const gradeMap = new Map((studentGrades || []).map((g: any) => [g.grade_set_id, g]))

      // Fetch subjects
      const subjectIds = [...new Set(fallbackSets.map((s: any) => s.subject_id).filter(Boolean))]
      let subjectMap = new Map<string, string>()
      if (subjectIds.length > 0) {
        const { data: subjects } = await dataClient
          .from('subjects')
          .select('id, title')
          .in('id', subjectIds)
        subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.title]))
      }

      const grades = fallbackSets.map((gs: any) => {
        const entry = gradeMap.get(gs.id) as any
        const numericGrade = entry?.grade_numeric ?? (parseFloat(entry?.grade_value) || null)
        return {
          id: (entry?.id as string | undefined) || gs.id,
          gradeSetId: gs.id,
          gradeSetName: gs.title,
          subject: gs.subject_id ? (subjectMap.get(gs.subject_id) || null) : null,
          grade: numericGrade,
          publishedAt: gs.published_at || gs.created_at,
        }
      }).filter((g: any) => g.grade !== null)

      return NextResponse.json({ grades })
    }

    // Normal path with join
    const grades = (gradeSets || []).map((gs: any) => {
      const entry = Array.isArray(gs.student_grades) ? gs.student_grades[0] : gs.student_grades
      const numericGrade = entry?.grade_numeric ?? (parseFloat(entry?.grade_value) || null)
      return {
        id: entry?.id || gs.id,
        gradeSetId: gs.id,
        gradeSetName: gs.title,
        subject: gs.subject?.title || null,
        grade: numericGrade,
        publishedAt: gs.published_at || gs.created_at,
      }
    }).filter((g: any) => g.grade !== null)

    return NextResponse.json({ grades })
  } catch (err) {
    console.error('[CLASS_GRADES_STUDENT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
