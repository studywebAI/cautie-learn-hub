import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getClassPermission } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

// GET audit logs for a class (teachers/management only)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { classId } = await params
    const perm = await getClassPermission(supabase, classId, user.id)
    if (!perm.isTeacher) {
      return NextResponse.json({ error: 'Only teachers can view audit logs' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')
    const entityType = searchParams.get('entity_type')
    const userId = searchParams.get('user_id')

    let query = (supabase as any)
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (entityType) query = query.eq('entity_type', entityType)
    if (userId) query = query.eq('user_id', userId)

    const { data: logs, error, count } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    }

    const metadataUserIdKeys = ['invited_by_user_id', 'requester_user_id', 'resolved_by', 'used_by', 'issued_by']

    const userIds = [...new Set((logs || []).flatMap((log: any) => {
      const ids = [log.user_id]
      const metadata = log?.metadata || {}
      for (const key of metadataUserIdKeys) {
        if (metadata?.[key]) ids.push(metadata[key])
      }
      return ids
    }).filter(Boolean))]

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', userIds)

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

    const enrichedLogs = (logs || []).map((log: any) => ({
      ...log,
      user: profileMap.get(log.user_id) || { full_name: 'Unknown', avatar_url: null, email: null },
      metadata_user_labels: metadataUserIdKeys.reduce((acc: Record<string, string>, key) => {
        const value = log?.metadata?.[key]
        if (!value) return acc
        const profile = profileMap.get(value)
        acc[key] = profile?.email || profile?.full_name || value
        return acc
      }, {})
    }))

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasNext: (offset + (enrichedLogs || []).length) < (count || 0),
      },
    })
  } catch (error) {
    console.error('Audit logs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
