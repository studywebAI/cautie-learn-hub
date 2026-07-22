import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions'

// Mirrors app/api/classes/[classId]/grades/route.ts, keyed on subject_id
// instead of class_id -- see that file for the original class-scoped
// implementation this was translated from. Built for Phase 2.6b (grades
// subject-first) to unblock grade sets on standalone (class-less) subjects.

// GET /api/subjects/[subjectId]/grades - Get all grade sets for a subject
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params

    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Only subject teachers can view grades' }, { status: 403 })
    }

    let { data: gradeSets, error } = await (supabase as any)
      .from('grade_sets')
      .select(`
        *,
        subject:subjects(id, title),
        grading_preset:class_grading_presets(id, name, kind, config, is_default),
        student_grades(id, student_id, grade_value, grade_numeric, status, tag)
      `)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false })

    if (error) {
      // Migration-safe fallback, mirroring the class-scoped route's pattern.
      const fallbackResult = await (supabase as any)
        .from('grade_sets')
        .select('id, class_id, subject_id, title, description, category, weight, created_at, status, student_grades(id, student_id, grade_value, grade_numeric, status, tag)')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false })

      if (fallbackResult.error) {
        return NextResponse.json({ grade_sets: [] })
      }
      gradeSets = fallbackResult.data || []
    }

    const enrichedGradeSets = (gradeSets || []).map((gs: any) => {
      const grades = gs.student_grades || []
      const gradedCount = grades.filter((g: any) => {
        const hasNumeric = typeof g.grade_numeric === 'number' && !Number.isNaN(g.grade_numeric)
        const hasText = g.grade_value !== null && g.grade_value !== ''
        return hasNumeric || hasText || g.status === 'final' || g.status === 'excused'
      }).length

      let average: number | null = null
      const numericGrades = grades
        .map((g: any) => {
          if (typeof g.grade_numeric === 'number' && !Number.isNaN(g.grade_numeric)) return g.grade_numeric
          if (g.grade_value && !Number.isNaN(parseFloat(g.grade_value))) return parseFloat(g.grade_value)
          return null
        })
        .filter((v: number | null) => v !== null)

      if (numericGrades.length > 0) {
        average = numericGrades.reduce((a: number, b: number) => a + (b as number), 0) / numericGrades.length
      }

      return {
        ...gs,
        total_students: grades.length,
        graded_count: gradedCount,
        average: average ? Math.round(average * 10) / 10 : null,
      }
    })

    return NextResponse.json({ grade_sets: enrichedGradeSets })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/subjects/[subjectId]/grades - Create a new grade set for a
// standalone (class-less) subject. class_id stays null; the student roster
// comes from subject_students instead of class_members.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params
    const body = await req.json()
    const { title, description, category, weight, grading_preset_id } = body
    const allowedCategories = new Set(['test', 'quiz', 'homework', 'project', 'exam', 'assignment', 'other'])

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (title.trim().length > 200) {
      return NextResponse.json({ error: 'Title is too long (max 200 chars)' }, { status: 400 })
    }

    const parsedWeight = Number(weight ?? 1)
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0 || parsedWeight > 100) {
      return NextResponse.json({ error: 'Weight must be a number between 0 and 100' }, { status: 400 })
    }

    const normalizedCategory = allowedCategories.has(category) ? category : 'test'

    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Only subject teachers can create grade sets' }, { status: 403 })
    }

    const { data: gradeSet, error } = await supabase
      .from('grade_sets')
      .insert([{
        class_id: null,
        subject_id: subjectId,
        title: title.trim(),
        description: description || null,
        category: normalizedCategory,
        weight: parsedWeight,
        grading_preset_id: grading_preset_id || null,
        status: 'draft',
        created_by: user.id,
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-create empty grade entries for every student already enrolled in
    // the subject directly (subject_students) -- mirrors the class route's
    // "seed a row per class member" behavior.
    const { data: subjectStudents } = await (supabase as any)
      .from('subject_students')
      .select('student_id')
      .eq('subject_id', subjectId)

    const studentIds = (subjectStudents || []).map((row: any) => row.student_id).filter(Boolean)

    if (studentIds.length > 0) {
      const gradeEntries = studentIds.map((studentId: string) => ({
        grade_set_id: gradeSet.id,
        student_id: studentId,
        grade_numeric: null,
        grade_value: null,
        status: 'draft',
      }))
      await supabase.from('student_grades').insert(gradeEntries)
    }

    return NextResponse.json({
      grade_set: gradeSet,
      students_count: studentIds.length,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
