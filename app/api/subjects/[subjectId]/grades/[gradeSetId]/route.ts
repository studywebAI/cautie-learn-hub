import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions'

// Mirrors app/api/classes/[classId]/grades/[gradeSetId]/route.ts, keyed on
// subject_id instead of class_id. See that file for the class-scoped
// original this was translated from (Phase 2.6b, grades subject-first).

// GET /api/subjects/[subjectId]/grades/[gradeSetId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string; gradeSetId: string }> }
) {
  try {
    const { subjectId, gradeSetId } = await params
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: gradeSet, error } = await (supabase as any)
      .from('grade_sets')
      .select(`
        *,
        subject:subjects(id, title),
        grading_preset:class_grading_presets(id, name, kind, config, is_default),
        student_grades(
          id, student_id, grade_value, grade_numeric, max_points,
          feedback_text, status, tag, updated_at
        )
      `)
      .eq('id', gradeSetId)
      .eq('subject_id', subjectId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!gradeSet) {
      return NextResponse.json({ error: 'Grade set not found' }, { status: 404 })
    }

    const rawStudentGrades = gradeSet.student_grades || []
    const studentIds = Array.from(new Set(rawStudentGrades.map((g: any) => g.student_id).filter(Boolean)))

    let profileById = new Map<string, { id: string; full_name: string | null; email: string | null }>()
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)
      profileById = new Map((profiles || []).map((p: any) => [p.id, p]))
    }

    const hydratedGrades = rawStudentGrades.map((g: any) => {
      const profile = profileById.get(g.student_id)
      const email = profile?.email || null
      const fullName = profile?.full_name && profile.full_name.trim()
        ? profile.full_name
        : (email && email.includes('@') ? email.split('@')[0] : `user-${String(g.student_id).slice(0, 8)}`)
      return { ...g, student: { id: g.student_id, full_name: fullName, email } }
    })

    const sortedGrades = hydratedGrades.sort((a: any, b: any) =>
      (a.student?.full_name || '').localeCompare(b.student?.full_name || '')
    )

    const gradedCount = sortedGrades.filter((g: any) => {
      const hasNumeric = typeof g.grade_numeric === 'number' && !Number.isNaN(g.grade_numeric)
      const hasText = g.grade_value !== null && g.grade_value !== ''
      return hasNumeric || hasText || g.status === 'final' || g.status === 'excused'
    }).length

    let average: number | null = null
    const numericGrades = sortedGrades
      .map((g: any) => {
        if (typeof g.grade_numeric === 'number' && !Number.isNaN(g.grade_numeric)) return g.grade_numeric
        if (g.grade_value && !Number.isNaN(parseFloat(g.grade_value))) return parseFloat(g.grade_value)
        return null
      })
      .filter((v: number | null) => v !== null)
    if (numericGrades.length > 0) {
      average = numericGrades.reduce((a: number, b: number) => a + (b as number), 0) / numericGrades.length
    }

    return NextResponse.json({
      grade_set: {
        ...gradeSet,
        student_grades: sortedGrades,
        total_students: sortedGrades.length,
        graded_count: gradedCount,
        average: average ? Math.round(average * 10) / 10 : null,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/subjects/[subjectId]/grades/[gradeSetId] - Update grade set or student grades
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string; gradeSetId: string }> }
) {
  try {
    const { subjectId, gradeSetId } = await params
    const body = await req.json()
    const { action, title, description, category, weight, status, release_date, student_grades, grading_preset_id } = body

    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (action === 'update_grade_set') {
      const allowedCategories = new Set(['test', 'quiz', 'homework', 'project', 'exam', 'assignment', 'other'])
      const allowedStatuses = new Set(['draft', 'published', 'archived'])

      if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 200)) {
        return NextResponse.json({ error: 'Title must be between 1 and 200 characters' }, { status: 400 })
      }
      if (category !== undefined && !allowedCategories.has(category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
      if (status !== undefined && !allowedStatuses.has(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      if (weight !== undefined) {
        const parsedWeight = Number(weight)
        if (!Number.isFinite(parsedWeight) || parsedWeight <= 0 || parsedWeight > 100) {
          return NextResponse.json({ error: 'Weight must be a number between 0 and 100' }, { status: 400 })
        }
      }

      const updateData: any = { updated_at: new Date().toISOString() }
      if (title !== undefined) updateData.title = title.trim()
      if (description !== undefined) updateData.description = description
      if (category !== undefined) updateData.category = category
      if (weight !== undefined) updateData.weight = weight
      if (status !== undefined) updateData.status = status
      if (release_date !== undefined) updateData.release_date = release_date
      if (grading_preset_id !== undefined) updateData.grading_preset_id = grading_preset_id

      const { data: updatedGradeSet, error } = await supabase
        .from('grade_sets')
        .update(updateData)
        .eq('id', gradeSetId)
        .eq('subject_id', subjectId)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ grade_set: updatedGradeSet })
    }

    if (action === 'update_student_grades' && student_grades) {
      if (!Array.isArray(student_grades)) {
        return NextResponse.json({ error: 'student_grades must be an array' }, { status: 400 })
      }

      const ids = student_grades.map((sg: any) => sg?.id).filter((id: any) => typeof id === 'string')
      if (ids.length !== student_grades.length || ids.length === 0) {
        return NextResponse.json({ error: 'Each student grade update must include a valid id' }, { status: 400 })
      }

      const { data: existingRows, error: existingError } = await supabase
        .from('student_grades')
        .select('id, grade_set_id')
        .in('id', ids)
        .eq('grade_set_id', gradeSetId)

      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
      if (!existingRows || existingRows.length !== ids.length) {
        return NextResponse.json({ error: 'One or more grade rows are invalid for this grade set' }, { status: 400 })
      }

      let updates: any[] = []
      try {
        updates = student_grades.map((sg: any) => {
          const parsedNumeric = sg.grade_numeric === null || sg.grade_numeric === undefined || sg.grade_numeric === ''
            ? null
            : Number(sg.grade_numeric)
          if (parsedNumeric !== null && !Number.isFinite(parsedNumeric)) {
            throw new Error(`Invalid grade_numeric for row ${sg.id}`)
          }
          const normalizedGradeValue = (sg.grade_value ?? (parsedNumeric !== null ? String(parsedNumeric) : null))
          const normalizedValue = normalizedGradeValue === null || normalizedGradeValue === undefined || String(normalizedGradeValue).trim() === ''
            ? null
            : String(normalizedGradeValue).trim()
          return {
            id: sg.id,
            grade_numeric: normalizedValue === null ? null : parsedNumeric,
            grade_value: normalizedValue,
            feedback_text: sg.feedback_text,
            tag: sg.tag,
            updated_at: new Date().toISOString(),
          }
        })
      } catch (normalizeError: any) {
        return NextResponse.json({ error: normalizeError.message || 'Invalid student grade payload' }, { status: 400 })
      }

      const updatedRows: any[] = []
      for (const row of updates) {
        const { data: updated, error: updateError } = await supabase
          .from('student_grades')
          .update({
            grade_numeric: row.grade_numeric,
            grade_value: row.grade_value,
            feedback_text: row.feedback_text,
            tag: row.tag,
            updated_at: row.updated_at,
          })
          .eq('id', row.id)
          .eq('grade_set_id', gradeSetId)
          .select()
          .single()

        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
        if (updated) updatedRows.push(updated)
      }

      return NextResponse.json({ student_grades: updatedRows })
    }

    if (action === 'upsert_student_grade') {
      const studentId = String(body?.student_id || '').trim()
      if (!studentId) {
        return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
      }
      const gradeNumericRaw = body?.grade_numeric
      const gradeNumeric = gradeNumericRaw === null || gradeNumericRaw === undefined || gradeNumericRaw === ''
        ? null
        : Number(gradeNumericRaw)
      const gradeValue = body?.grade_value != null ? String(body.grade_value).trim() || null : null

      const { data: existing } = await supabase
        .from('student_grades')
        .select('id')
        .eq('grade_set_id', gradeSetId)
        .eq('student_id', studentId)
        .maybeSingle()

      if (existing) {
        const { data: updated, error: updateErr } = await supabase
          .from('student_grades')
          .update({ grade_numeric: gradeNumeric, grade_value: gradeValue, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single()
        if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
        return NextResponse.json({ student_grade: updated })
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('student_grades')
          .insert({ grade_set_id: gradeSetId, student_id: studentId, grade_numeric: gradeNumeric, grade_value: gradeValue })
          .select()
          .single()
        if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
        return NextResponse.json({ student_grade: inserted })
      }
    }

    if (action === 'publish') {
      const { data: updatedGradeSet, error } = await supabase
        .from('grade_sets')
        .update({ status: 'published', release_date: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', gradeSetId)
        .eq('subject_id', subjectId)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ grade_set: updatedGradeSet })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/subjects/[subjectId]/grades/[gradeSetId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string; gradeSetId: string }> }
) {
  try {
    const { subjectId, gradeSetId } = await params
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('grade_sets')
      .delete()
      .eq('id', gradeSetId)
      .eq('subject_id', subjectId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: 'Grade set deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
