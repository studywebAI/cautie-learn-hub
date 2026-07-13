import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET /api/student/grades/pending?limit=N&classId=X
// Returns the authenticated student's published grade sets that don't have
// a score back yet (student_grades row exists but grade_value/grade_numeric
// are both still null) — the "to grade" list for the student dashboard.
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10), 100)
    const classId = req.nextUrl.searchParams.get('classId')

    let query = (supabase as any)
      .from('student_grades')
      .select(`
        id,
        created_at,
        grade_set:grade_sets!inner(
          id,
          title,
          category,
          status,
          created_at,
          class:classes!inner(
            id,
            name
          )
        )
      `)
      .eq('student_id', user.id)
      .is('grade_value', null)
      .is('grade_numeric', null)
      .eq('grade_set.status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (classId) {
      query = query.eq('grade_set.class.id', classId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ grades: [] })
    }

    const grades = (data || []).map((g: any) => ({
      id: g.id,
      grade_set_title: g.grade_set?.title || 'Unknown',
      class_name: g.grade_set?.class?.name || 'Unknown',
      created_at: g.grade_set?.created_at || g.created_at || null,
    }))

    return NextResponse.json({ grades })
  } catch (err) {
    return NextResponse.json({ grades: [] })
  }
}
