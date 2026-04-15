import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getClassPermission } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

function labelFromProfile(profile: any, fallbackId: string) {
  return profile?.display_name || profile?.full_name || profile?.email || fallbackId
}

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
    const studentId = searchParams.get('student_id')

    let query = (supabase as any)
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (entityType) query = query.eq('entity_type', entityType)
    if (userId) query = query.eq('user_id', userId)
    if (studentId) query = query.or(`user_id.eq.${studentId},metadata->>student_id.eq.${studentId}`)

    const { data: logs, error, count } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    }
    const filteredByStudent = logs || []
    const pagedLogs = filteredByStudent

    const metadataUserIdKeys = ['invited_by_user_id', 'requester_user_id', 'resolved_by', 'used_by', 'issued_by', 'student_id', 'created_by']

    const userIds = [...new Set((pagedLogs || []).flatMap((log: any) => {
      const ids = [log.user_id]
      const metadata = log?.metadata || {}
      for (const key of metadataUserIdKeys) {
        if (metadata?.[key]) ids.push(metadata[key])
      }
      return ids
    }).filter(Boolean))]

    const [{ data: profiles }, { data: classMembers }] = await Promise.all([
      supabase
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, email')
      .in('id', userIds),
      supabase
        .from('class_members')
        .select('user_id, display_name')
        .eq('class_id', classId)
        .in('user_id', userIds),
    ])

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
    const classAliasMap = new Map(
      (classMembers || [])
        .filter((member: any) => String(member?.display_name || '').trim().length > 0)
        .map((member: any) => [member.user_id, String(member.display_name).trim()])
    )

    const enrichedLogs = (pagedLogs || []).map((log: any) => ({
      ...log,
      user: profileMap.get(log.user_id) || { display_name: null, full_name: 'Unknown', avatar_url: null, email: null },
      metadata_user_labels: metadataUserIdKeys.reduce((acc: Record<string, string>, key) => {
        const value = log?.metadata?.[key]
        if (!value) return acc
        const classAlias = classAliasMap.get(value)
        if (classAlias) {
          acc[key] = classAlias
          return acc
        }
        const profile = profileMap.get(value)
        acc[key] = labelFromProfile(profile, value)
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
