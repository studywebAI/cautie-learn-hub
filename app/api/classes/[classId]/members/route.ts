import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

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
      .select('user_id, created_at')
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
          profiles: profile || { full_name: null, email: null, avatar_url: null, subscription_type: null }
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
