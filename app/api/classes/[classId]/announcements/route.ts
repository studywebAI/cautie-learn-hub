import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

function logAnnouncements(...args: any[]) {
  console.log('[CLASS_ANNOUNCEMENTS]', ...args)
}

function formatDbError(error: any) {
  if (!error) return null
  return {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint
  }
}

// GET all announcements for a specific class
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const resolvedParams = await params
  const classId = resolvedParams.classId
  const requestId = crypto.randomUUID()
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    logAnnouncements('GET - Auth failed', { requestId, classId, authError: formatDbError(authError) })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Security check: Ensure the requesting user is a member of the class
  // (owner_id column was removed - all teachers are equal via class_members)
  
  // Get user's subscription_type to check if they're a teacher
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', user.id)
    .single()

  if (profileError) {
    logAnnouncements('GET - Profile lookup failed', { requestId, classId, userId: user.id, profileError: formatDbError(profileError) })
    return NextResponse.json({ error: 'Failed to resolve user role' }, { status: 500 })
  }

  const isTeacher = userProfile?.subscription_type === 'teacher'

  // Also check if user is a member of this class
  const { data: memberData, error: memberError } = await supabase
    .from('class_members')
    .select('user_id')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError) {
    logAnnouncements('GET - Membership lookup failed', { requestId, classId, userId: user.id, memberError: formatDbError(memberError) })
    return NextResponse.json({ error: 'Failed to validate class membership' }, { status: 500 })
  }

  const isMember = !!memberData

  // Any class member can view announcements.
  if (!isMember) {
    logAnnouncements('GET - Forbidden', { requestId, classId, userId: user.id, isTeacher, isMember })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch announcements
  const { data: announcements, error: announcementsError } = await (supabase as any)
    .from('announcements')
    .select(`
      id,
      title,
      content,
      created_at,
      created_by,
      profiles!announcements_created_by_fkey (
        full_name,
        avatar_url
      )
    `)
    .eq('class_id', classId)
    .order('created_at', { ascending: false })

  if (announcementsError) {
    logAnnouncements('GET - Fetch announcements failed', {
      requestId,
      classId,
      userId: user.id,
      announcementsError: formatDbError(announcementsError)
    })
    return NextResponse.json({ error: 'Failed to load announcements' }, { status: 500 })
  }

  logAnnouncements('GET - Success', { requestId, classId, userId: user.id, count: announcements?.length || 0 })
  return NextResponse.json(announcements)
}

// POST create a new announcement
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const resolvedParams = await params
  const classId = resolvedParams.classId
  const requestId = crypto.randomUUID()
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    logAnnouncements('POST - Auth failed', { requestId, classId, authError: formatDbError(authError) })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Security check: Ensure the requesting user is a teacher who is a member of the class
  // (owner_id column was removed - all teachers are equal via class_members)
  
  // Get user's subscription_type to check if they're a teacher
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', user.id)
    .single()

  if (profileError) {
    logAnnouncements('POST - Profile lookup failed', { requestId, classId, userId: user.id, profileError: formatDbError(profileError) })
    return NextResponse.json({ error: 'Failed to resolve user role' }, { status: 500 })
  }

  const isTeacher = userProfile?.subscription_type === 'teacher'

  // Also check if user is a member of this class
  const { data: memberData, error: memberError } = await supabase
    .from('class_members')
    .select('user_id')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError) {
    logAnnouncements('POST - Membership lookup failed', { requestId, classId, userId: user.id, memberError: formatDbError(memberError) })
    return NextResponse.json({ error: 'Failed to validate class membership' }, { status: 500 })
  }

  const isMember = !!memberData

  // Teachers who are members of the class can create announcements
  if (!isMember || !isTeacher) {
    logAnnouncements('POST - Forbidden', { requestId, classId, userId: user.id, isTeacher, isMember })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, content } = await request.json()

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const { data: announcement, error: insertError } = await (supabase as any)
    .from('announcements')
    .insert({
      class_id: classId,
      title,
      content,
      created_by: user.id
    })
    .select()
    .single()

  if (insertError) {
    logAnnouncements('POST - Insert failed', {
      requestId,
      classId,
      userId: user.id,
      insertError: formatDbError(insertError)
    })
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }

  logAnnouncements('POST - Success', { requestId, classId, userId: user.id, announcementId: announcement?.id })
  return NextResponse.json(announcement)
}
