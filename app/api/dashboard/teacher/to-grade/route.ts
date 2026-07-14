import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/dashboard/teacher/to-grade?classIds=a,b,c&limit=N
// Aggregated "nog becijferen" queue across classes for the dashboard To
// Grade card: nakijken is done (or wasn't needed), but no grade released
// yet. Deliberately excludes grade sets still pending nakijken — those
// belong to the separate "nog nakijken" flow, not the dashboard.
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
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '4', 10), 50)

    if (requestedClassIds.length === 0) {
      return NextResponse.json({ items: [], totalCount: 0 })
    }

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
      return NextResponse.json({ items: [], totalCount: 0 })
    }

    const { data: gradeSets } = await (supabase as any)
      .from('grade_sets')
      .select('id, title, class_id, assignment_id, grade_released_at, class:classes(id, name), student_grades(id)')
      .in('class_id', ownedClassIds)
      .is('grade_released_at', null)

    const rows = gradeSets || []
    const linkedAssignmentIds = rows.map((g: any) => g.assignment_id).filter(Boolean)

    let pendingByAssignment = new Map<string, number>()
    if (linkedAssignmentIds.length > 0) {
      const { data: openBlocks } = await supabase
        .from('blocks')
        .select('id, assignment_id')
        .in('assignment_id', linkedAssignmentIds)
        .eq('type', 'open_question')

      const blockIds = (openBlocks || []).map((b: any) => b.id)
      const blockToAssignment = new Map((openBlocks || []).map((b: any) => [b.id, b.assignment_id]))

      if (blockIds.length > 0) {
        const { data: pendingAnswers } = await supabase
          .from('student_answers')
          .select('block_id')
          .in('block_id', blockIds)
          .is('score', null)

        for (const answer of pendingAnswers || []) {
          const assignmentId = blockToAssignment.get((answer as any).block_id)
          if (!assignmentId) continue
          pendingByAssignment.set(assignmentId, (pendingByAssignment.get(assignmentId) || 0) + 1)
        }
      }
    }

    const items = rows
      .filter((g: any) => !g.assignment_id || (pendingByAssignment.get(g.assignment_id) || 0) === 0)
      .map((g: any) => ({
        id: g.id,
        title: g.title,
        class_id: g.class_id,
        class_name: g.class?.name || 'Class',
      }))
      .sort((a: any, b: any) => a.title.localeCompare(b.title))

    return NextResponse.json({ items: items.slice(0, limit), totalCount: items.length })
  } catch (err) {
    return NextResponse.json({ items: [], totalCount: 0 })
  }
}
