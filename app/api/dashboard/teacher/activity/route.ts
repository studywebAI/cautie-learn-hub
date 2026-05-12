import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET /api/dashboard/teacher/activity?limit=20&type=all|messages|results|attendance
// Returns recent activity items for the teacher's dashboard feed
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ items: [] }, { status: 401 })
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10), 50)
    const typeFilter = req.nextUrl.searchParams.get('type') || 'all'

    // Fetch recent notifications for this teacher (submissions, attendance, quiz results, messages)
    let query = (supabase as any)
      .from('notifications')
      .select('id, type, title, message, data, created_at, read')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by category
    if (typeFilter === 'messages') {
      query = query.in('type', ['new_message', 'class_message', 'direct_message'])
    } else if (typeFilter === 'results') {
      query = query.in('type', ['assignment_submitted', 'quiz_completed', 'grade_set_published', 'idea_submitted'])
    } else if (typeFilter === 'attendance') {
      query = query.in('type', ['attendance_marked', 'absence_reported', 'late_reported'])
    }
    // 'all' = no additional filter

    const { data: notifications, error } = await query

    if (error) {
      return NextResponse.json({ items: [] })
    }

    // Normalize notifications into feed items
    const items = (notifications || []).map((n: any) => ({
      id: n.id,
      type: n.type || 'info',
      title: n.title || '',
      message: n.message || '',
      data: n.data || {},
      created_at: n.created_at,
      read: n.read ?? false,
      // Derive feed category for UI
      category: deriveFeedCategory(n.type),
    }))

    // Also fetch recent assignment submissions from the last 48h as fallback activity
    // if notifications are sparse — this gives teachers live data even before notification setup
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const { data: submissions } = await (supabase as any)
      .from('assignment_submissions')
      .select(`
        id,
        student_id,
        submitted_at,
        assignment:assignments!inner(
          id,
          title,
          class:classes!inner(id, name, owner_id)
        )
      `)
      .gte('submitted_at', cutoff)
      .eq('assignment.class.owner_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(10)

    const submissionItems = (submissions || [])
      .filter((s: any) => s.assignment?.class?.owner_id === user.id)
      .map((s: any) => ({
        id: `sub_${s.id}`,
        type: 'assignment_submitted',
        title: 'Assignment submitted',
        message: `${s.assignment?.title || 'Assignment'} · ${s.assignment?.class?.name || 'Class'}`,
        data: { student_id: s.student_id, assignment_id: s.assignment?.id, class_id: s.assignment?.class?.id },
        created_at: s.submitted_at,
        read: true,
        category: 'results' as const,
      }))

    // Merge, deduplicate by id, sort by date
    const allItems = [...items, ...submissionItems]
      .filter((item, idx, arr) => arr.findIndex(x => x.id === item.id) === idx)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)

    // Apply category filter to merged results
    const filtered = typeFilter === 'all'
      ? allItems
      : allItems.filter(i => i.category === typeFilter)

    return NextResponse.json({ items: filtered })
  } catch (err) {
    console.error('GET /api/dashboard/teacher/activity error:', err)
    return NextResponse.json({ items: [] })
  }
}

function deriveFeedCategory(type: string): 'messages' | 'results' | 'attendance' | 'info' {
  if (!type) return 'info'
  if (type.includes('message')) return 'messages'
  if (type.includes('submission') || type.includes('submitted') || type.includes('quiz') || type.includes('grade') || type.includes('idea')) return 'results'
  if (type.includes('attendance') || type.includes('absent') || type.includes('late')) return 'attendance'
  return 'info'
}
