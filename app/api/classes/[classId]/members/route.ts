import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

function getDefaultDisplayName(email: string | null | undefined, userId: string) {
  if (email && email.includes('@')) return email.split('@')[0]
  return `user-${userId.slice(0, 8)}`
}

// GET - Get class members (any member can view)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await getClassPermission(supabase, classId, user.id)

    // Allow if user is a member of the class
    if (!perm.isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Prefer admin client for full roster visibility; fallback to user client.
    let dataClient: any = supabase
    try {
      dataClient = createAdminClient()
    } catch {
      dataClient = supabase
    }

    const { data: membersData, error } = await dataClient
      .from('class_members')
      .select('user_id, role')
      .eq('class_id', classId)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    const userIds = (membersData || []).map((member: any) => member.user_id).filter(Boolean)

    const { data: profilesData } = userIds.length > 0
      ? await dataClient
          .from('profiles')
          .select('id, full_name, email, avatar_url, subscription_type')
          .in('id', userIds)
      : { data: [] as any[] }

    const profilesById = new Map<string, any>((profilesData || []).map((profile: any) => [profile.id, profile]))
    const teacherRoles = new Set(['teacher', 'owner', 'admin', 'creator', 'ta'])

    const members = (membersData || []).map((member: any) => {
      const profile = profilesById.get(member.user_id)
      const normalizedRole = String(member?.role || profile?.subscription_type || 'student').toLowerCase()
      const role = teacherRoles.has(normalizedRole) ? 'teacher' : 'student'

      return {
        ...member,
        role,
        profiles: {
          full_name: profile?.full_name || getDefaultDisplayName(profile?.email, member.user_id),
          email: profile?.email || null,
          avatar_url: profile?.avatar_url || null,
          subscription_type: profile?.subscription_type || null,
        },
      }
    })

    return NextResponse.json(members || [])
  } catch (error) {
    console.error('[MEMBERS_GET] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update member display name (teachers only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const body = await request.json()
    const targetUserId = body?.user_id as string | undefined
    const displayNameRaw = body?.display_name as string | undefined
    const displayName = (displayNameRaw || '').trim()

    if (!targetUserId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }
    if (displayName.length > 100) {
      return NextResponse.json({ error: 'display_name is too long' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const actorPerm = await getClassPermission(supabase, classId, user.id)
    if (!actorPerm.isMember || !actorPerm.isTeacher) {
      return NextResponse.json({ error: 'Only teachers can edit member names' }, { status: 403 })
    }

    const { data: targetMembership, error: targetMembershipError } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (targetMembershipError || !targetMembership) {
      return NextResponse.json({ error: 'Target user is not in this class' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: displayName || null })
      .eq('id', targetUserId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await logAuditEntry(supabase, {
      userId: user.id,
      classId,
      action: 'update',
      entityType: 'member_profile',
      entityId: targetUserId,
      metadata: {
        updatedField: 'full_name',
        newValue: displayName || null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MEMBERS_PATCH] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Leave class (student self-leave)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await getClassPermission(supabase, classId, user.id)
    if (!perm.isMember) {
      return NextResponse.json({ error: 'You are not a member of this class' }, { status: 403 })
    }

    if (!perm.isStudent) {
      return NextResponse.json({ error: 'Only students can leave classes from this flow' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('class_members')
      .delete()
      .eq('class_id', classId)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    await logAuditEntry(supabase, {
      userId: user.id,
      classId,
      action: 'leave',
      entityType: 'class_member',
      entityId: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MEMBERS_DELETE] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
