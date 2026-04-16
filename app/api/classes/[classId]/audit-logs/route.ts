import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getClassPermission } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

function labelFromProfile(profile: any, fallbackId: string) {
  return profile?.display_name || profile?.full_name || profile?.email || fallbackId
}

function resolveLogCategory(log: any): 'academic' | 'events' | 'custom_events' | 'roster' {
  const metadataCategory = String(log?.metadata?.log_category || '').toLowerCase()
  if (metadataCategory === 'academic' || metadataCategory === 'events' || metadataCategory === 'custom_events' || metadataCategory === 'roster') {
    return metadataCategory
  }

  const action = String(log?.action || '')
  const entityType = String(log?.entity_type || '')

  if (action.includes('attendance_event_custom') || Boolean(log?.metadata?.custom_message)) return 'custom_events'
  if (action.includes('attendance') || action.includes('event_') || entityType.includes('attendance') || entityType.includes('event')) return 'events'
  if (action.includes('member_') || action.includes('teacher_invite') || action.includes('join_request') || action.includes('role') || entityType.includes('member') || entityType.includes('invite')) return 'roster'
  return 'academic'
}

function resolveLogCode(log: any): string {
  const metadataCode = String(log?.metadata?.log_code || '').trim()
  if (metadataCode) return metadataCode
  const action = String(log?.action || '')
  if (action === 'attendance_state_changed') return 'EVT-ATT-001'
  if (action === 'attendance_event_homework_incomplete') return 'EVT-ATT-002'
  if (action === 'attendance_event_late') return 'EVT-ATT-003'
  if (action === 'attendance_event_custom') return 'EVT-CUS-001'
  if (action === 'member_rename') return 'ROS-MEM-001'
  return 'ACD-EDT-001'
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
    const category = String(searchParams.get('category') || '').toLowerCase()
    const code = String(searchParams.get('code') || '').trim().toUpperCase()

    let query = (supabase as any)
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('class_id', classId)
      .order('created_at', { ascending: false })

    // When category/code filtering is requested, we fetch a broader window first
    // and page after normalization to keep category/code results consistent.
    if (category || code) {
      query = query.limit(1000)
    } else {
      query = query.range(offset, offset + limit - 1)
    }

    if (entityType) query = query.eq('entity_type', entityType)
    if (userId) query = query.eq('user_id', userId)
    if (studentId) query = query.or(`user_id.eq.${studentId},metadata->>student_id.eq.${studentId}`)

    const { data: logs, error, count } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    }
    const filteredByStudent = logs || []
    const filteredByCategoryAndCode = filteredByStudent.filter((log: any) => {
      const resolvedCategory = resolveLogCategory(log)
      const resolvedCode = resolveLogCode(log)
      if (category && category !== 'all' && resolvedCategory !== category) return false
      if (code && resolvedCode !== code) return false
      return true
    })
    const pagedLogs = category || code
      ? filteredByCategoryAndCode.slice(offset, offset + limit)
      : filteredByCategoryAndCode

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
      log_category: resolveLogCategory(log),
      log_code: resolveLogCode(log),
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
        total: category || code ? (filteredByCategoryAndCode || []).length : (count || 0),
        hasNext: category || code
          ? (offset + (enrichedLogs || []).length) < ((filteredByCategoryAndCode || []).length)
          : (offset + (enrichedLogs || []).length) < (count || 0),
      },
    })
  } catch (error) {
    console.error('Audit logs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
