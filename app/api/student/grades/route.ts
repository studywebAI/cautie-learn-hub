import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET /api/student/grades?limit=N&classId=X
// Returns the authenticated student's own grades (published grade sets only)
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

    // Query student_grades joined with grade_sets (published only) and classes
    let query = (supabase as any)
      .from('student_grades')
      .select(`
        id,
        grade_value,
        grade_numeric,
        feedback_text,
        status,
        created_at,
        grade_set:grade_sets!inner(
          id,
          title,
          category,
          weight,
          status,
          created_at,
          class:classes(
            id,
            name
          ),
          subject:subjects(
            id,
            title
          )
        )
      `)
      .eq('student_id', user.id)
      .eq('grade_set.status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (classId) {
      query = query.eq('grade_set.class.id', classId)
    }

    const { data, error } = await query

    if (error) {
      // Fallback: simpler query without deep filters
      const fallbackQuery = (supabase as any)
        .from('student_grades')
        .select(`
          id,
          grade_value,
          grade_numeric,
          feedback_text,
          created_at,
          grade_set_id
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      const { data: fallbackData, error: fallbackError } = await fallbackQuery
      if (fallbackError) {
        return NextResponse.json({ grades: [] })
      }

      // For each grade, fetch grade set info separately
      const gradeSetIds = [...new Set((fallbackData || []).map((g: any) => g.grade_set_id).filter(Boolean))]
      let gradeSetsMap: Record<string, { title: string; status: string; class_id: string }> = {}
      let classesMap: Record<string, string> = {}

      if (gradeSetIds.length > 0) {
        const { data: gsData } = await (supabase as any)
          .from('grade_sets')
          .select('id, title, status, class_id')
          .in('id', gradeSetIds)
          .eq('status', 'published')

        for (const gs of gsData || []) {
          gradeSetsMap[gs.id] = gs
        }

        const classIds = [...new Set(Object.values(gradeSetsMap).map((gs: any) => gs.class_id).filter(Boolean))]
        if (classIds.length > 0) {
          const { data: clsData } = await (supabase as any)
            .from('classes')
            .select('id, name')
            .in('id', classIds)
          for (const cls of clsData || []) {
            classesMap[cls.id] = cls.name
          }
        }
      }

      const grades = (fallbackData || [])
        .filter((g: any) => gradeSetsMap[g.grade_set_id])
        .map((g: any) => {
          const gs = gradeSetsMap[g.grade_set_id]
          return {
            id: g.id,
            grade_set_title: gs?.title || 'Unknown',
            class_name: classesMap[gs?.class_id] || 'Unknown',
            class_id: gs?.class_id || null,
            grade_numeric: typeof g.grade_numeric === 'number' ? g.grade_numeric : null,
            grade_value: g.grade_value || null,
            published_at: g.created_at || null,
          }
        })

      return NextResponse.json({ grades })
    }

    const grades = (data || []).map((g: any) => ({
      id: g.id,
      grade_set_title: g.grade_set?.title || 'Unknown',
      class_name: g.grade_set?.class?.name || g.grade_set?.subject?.title || 'Unknown',
      class_id: g.grade_set?.class?.id || null,
      grade_numeric: typeof g.grade_numeric === 'number' ? g.grade_numeric : null,
      grade_value: g.grade_value || null,
      published_at: g.grade_set?.created_at || g.created_at || null,
    }))

    return NextResponse.json({ grades })
  } catch (err) {
    return NextResponse.json({ grades: [] })
  }
}
