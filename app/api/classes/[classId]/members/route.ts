import { createClient } from '@/lib/supabase/server'
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
    console.log(`\n🌐 [MEMBERS_GET] Fetching members for class: ${classId}`)
    
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    console.log('[MEMBERS_GET] User:', user?.id)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await getClassPermission(supabase, classId, user.id)
    console.log('[MEMBERS_GET] Permission:', perm)
    
    // Allow if user is a member of the class
    if (!perm.isMember) {
      console.log('[MEMBERS_GET] ❌ Access denied - not a member')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all members
    const { data: membersData, error } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)

    console.log('[MEMBERS_GET] Members query result:', { count: membersData?.length, error })
    if (error) {
      console.error('[MEMBERS_GET] Error fetching members:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Get profile info separately (including subscription_type to determine teacher/student role)
    const members = await Promise.all(
      (membersData || []).map(async (member: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url, subscription_type')
          .eq('id', member.user_id)
          .single()

        return {
          ...member,
          role: profile?.subscription_type || 'student', // Use global subscription_type as role
          profiles: {
            full_name: profile?.full_name || getDefaultDisplayName(profile?.email, member.user_id),
            email: profile?.email || null,
            avatar_url: profile?.avatar_url || null,
            subscription_type: profile?.subscription_type || null
          }
        }
      })
    )

    console.log('[MEMBERS_GET] Returning members:', members.length)
    return NextResponse.json(members || [])
  } catch (error) {
    console.error('❌ [MEMBERS_GET] Unexpected error:', error)
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
    console.error('❌ [MEMBERS_PATCH] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
