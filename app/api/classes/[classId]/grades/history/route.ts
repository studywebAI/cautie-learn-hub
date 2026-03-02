import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET /api/classes/[classId]/grades/history - Class grade history timeline
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Teachers who are members of the class can view history.
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .single()

    const isTeacher = userProfile?.subscription_type === 'teacher'

    const { data: classMember } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!isTeacher || !classMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: gradeSets, error: gradeSetsError } = await supabase
      .from('grade_sets')
      .select('id, title')
      .eq('class_id', classId)

    if (gradeSetsError) {
      return NextResponse.json({ error: gradeSetsError.message }, { status: 500 })
    }

    const gradeSetIds = (gradeSets || []).map((gs: any) => gs.id)
    if (gradeSetIds.length === 0) {
      return NextResponse.json({ events: [] })
    }

    const gradeSetTitleById = new Map((gradeSets || []).map((gs: any) => [gs.id, gs.title]))

    const { data: studentGrades, error: studentGradesError } = await supabase
      .from('student_grades')
      .select('id, grade_set_id, student_id')
      .in('grade_set_id', gradeSetIds)

    if (studentGradesError) {
      return NextResponse.json({ error: studentGradesError.message }, { status: 500 })
    }

    const studentGradeIds = (studentGrades || []).map((sg: any) => sg.id)
    if (studentGradeIds.length === 0) {
      return NextResponse.json({ events: [] })
    }

    const studentGradeById = new Map((studentGrades || []).map((sg: any) => [sg.id, sg]))

    const { data: historyRows, error: historyError } = await (supabase as any)
      .from('grade_history')
      .select('id, student_grade_id, old_value, new_value, old_status, new_status, change_reason, change_type, changed_by, created_at')
      .in('student_grade_id', studentGradeIds)
      .order('created_at', { ascending: false })
      .limit(500)

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 })
    }

    const allProfileIds = new Set<string>()
    for (const sg of studentGrades || []) {
      if (sg.student_id) allProfileIds.add(sg.student_id)
    }
    for (const row of historyRows || []) {
      if (row.changed_by) allProfileIds.add(row.changed_by)
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', Array.from(allProfileIds))

    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]))

    const events = (historyRows || []).map((row: any) => {
      const studentGrade = studentGradeById.get(row.student_grade_id)
      const studentProfile = studentGrade?.student_id ? profileById.get(studentGrade.student_id) : null
      const changerProfile = row.changed_by ? profileById.get(row.changed_by) : null

      return {
        id: row.id,
        grade_set_id: studentGrade?.grade_set_id || '',
        grade_set_title: studentGrade?.grade_set_id ? (gradeSetTitleById.get(studentGrade.grade_set_id) || 'Untitled') : 'Untitled',
        student_id: studentGrade?.student_id || '',
        student_name: studentProfile?.full_name || studentProfile?.email || 'Unknown student',
        student_email: studentProfile?.email || null,
        changed_by: row.changed_by,
        changed_by_name: changerProfile?.full_name || changerProfile?.email || 'Unknown user',
        old_value: row.old_value,
        new_value: row.new_value,
        old_status: row.old_status || null,
        new_status: row.new_status || null,
        change_type: row.change_type || 'grade_update',
        change_reason: row.change_reason || null,
        created_at: row.created_at
      }
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error loading grade history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

