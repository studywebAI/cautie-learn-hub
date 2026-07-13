import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET /api/dashboard/teacher/pending-grades?classIds=a,b,c&limit=N
// Returns the teacher's draft (unpublished) grade sets across the given
// classes — the "To Grade" list for the teacher dashboard.
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
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '10', 10), 50)

    if (requestedClassIds.length === 0) {
      return NextResponse.json({ gradeSets: [], totalCount: 0 })
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
      return NextResponse.json({ gradeSets: [], totalCount: 0 })
    }

    const { data, error, count } = await (supabase as any)
      .from('grade_sets')
      .select('id, title, class_id, created_at, class:classes(id, name)', { count: 'exact' })
      .in('class_id', ownedClassIds)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ gradeSets: [], totalCount: 0 })
    }

    const gradeSets = (data || []).map((g: any) => ({
      id: g.id,
      title: g.title,
      class_name: g.class?.name || 'Class',
      class_id: g.class_id,
    }))

    return NextResponse.json({ gradeSets, totalCount: count || gradeSets.length })
  } catch (err) {
    return NextResponse.json({ gradeSets: [], totalCount: 0 })
  }
}
