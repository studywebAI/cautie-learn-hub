import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Get class members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params

    // Check if user has access to this class (owner or member)
    const { data: membership, error: memberError } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', resolvedParams.classId)
      .eq('user_id', user.id)
      .single()

    const { data: classData } = await supabase
      .from('classes')
      .select('owner_id')
      .eq('id', resolvedParams.classId)
      .single()

    const isOwner = classData?.owner_id === user.id
    const isMember = !!membership

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all members with profile info
    const { data: membersData, error } = await supabase
      .from('class_members')
      .select(`
        id,
        user_id,
        role,
        created_at
      `)
      .eq('class_id', resolvedParams.classId)

    if (error) {
      console.error('Error fetching members:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Get profile info separately
    const members = await Promise.all(
      (membersData || []).map(async (member) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', member.user_id)
          .single()

        return {
          ...member,
          profiles: profile || { full_name: null, avatar_url: null }
        }
      })
    )

    if (error) {
      console.error('Error fetching members:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    return NextResponse.json(members || [])

  } catch (error) {
    console.error('Unexpected error in class members GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
