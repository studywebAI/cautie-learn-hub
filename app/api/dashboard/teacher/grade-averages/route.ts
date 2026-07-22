import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getTeacherSubjectIds } from '@/lib/auth/subject-permissions'

// GET /api/dashboard/teacher/grade-averages?classIds=a,b,c
// Returns, per class the teacher owns, the average of published grade
// sets (most recent first) — used by the dashboard's expandable stat row.
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
      return NextResponse.json({ classes: [], overallAverage: null })
    }

    const orFilters: string[] = []
    if (ownedClassIds.length > 0) orFilters.push(`class_id.in.(${ownedClassIds.join(',')})`)
    if (teacherSubjectIds.length > 0) orFilters.push(`subject_id.in.(${teacherSubjectIds.join(',')})`)

    const { data: gradeSets, error } = await (supabase as any)
      .from('grade_sets')
      .select('id, title, class_id, subject_id, created_at, class:classes(id, name), subject:subjects(id, title), student_grades(grade_numeric)')
      .or(orFilters.join(','))
      .eq('status', 'published')
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      return NextResponse.json({ classes: [], overallAverage: null })
    }

    const byClass = new Map<string, { className: string; points: { title: string; avg: number }[] }>()
    const allAverages: number[] = []

    for (const gs of gradeSets || []) {
      const nums = (gs.student_grades || [])
        .map((sg: any) => sg.grade_numeric)
        .filter((n: any): n is number => typeof n === 'number')
      if (nums.length === 0) continue
      const avg = nums.reduce((s: number, n: number) => s + n, 0) / nums.length
      allAverages.push(avg)

      // Standalone (class-less) grade sets group by subject_id instead.
      const key = gs.class_id || `subject-${gs.subject_id}`
      if (!byClass.has(key)) {
        byClass.set(key, { className: gs.class?.name || gs.subject?.title || 'Subject', points: [] })
      }
      byClass.get(key)!.points.push({ title: gs.title, avg: Math.round(avg * 10) / 10 })
    }

    const classes = Array.from(byClass.entries()).map(([classId, v]) => ({
      classId,
      className: v.className,
      average: Math.round((v.points.reduce((s, p) => s + p.avg, 0) / v.points.length) * 10) / 10,
      points: v.points.slice(-8),
    }))

    const overallAverage = allAverages.length > 0
      ? Math.round((allAverages.reduce((s, n) => s + n, 0) / allAverages.length) * 10) / 10
      : null

    return NextResponse.json({ classes, overallAverage })
  } catch (err) {
    return NextResponse.json({ classes: [], overallAverage: null })
  }
}
