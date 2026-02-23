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
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { classId } = await params
    const perm = await getClassPermission(supabase, classId, user.id)
    if (!perm.isMember) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    // Get all members
    const { data: membersData, error } = await (supabase as any)
      .from('class_members')
      .select('user_id, role, created_at')
      .eq('class_id', classId)

    if (error) return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })

    // Get profile info separately
    const members = await Promise.all(
      (membersData || []).map(async (member: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', member.user_id)
          .single()

        return {
          ...member,
          profiles: profile || { full_name: null, avatar_url: null }
        }
      })
    )

    return NextResponse.json(members || [])
  } catch (error) {
    console.error('Unexpected error in class members GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
