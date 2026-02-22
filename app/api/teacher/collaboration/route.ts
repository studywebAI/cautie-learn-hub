import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use subscription_type as the single source of truth (role column removed)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.subscription_type !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can access collaboration features' }, { status: 403 })
  }

  // Get all subjects the teacher has access to (owned + collaborative)
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select(`
      *,
      class:classes (id, name),
      owner:profiles!subjects_owner_id_fkey (id, full_name),
      subject_teachers (
        teacher_id,
        role,
        permissions,
        joined_at,
        teacher:profiles!subject_teachers_teacher_id_fkey (id, full_name, avatar_url)
      )
    `)
    .or(`owner_id.eq.${user.id},id.in.(
      SELECT subject_id FROM subject_teachers WHERE teacher_id = '${user.id}'
    )`)
    .order('created_at', { ascending: false })

  if (subjectsError) {
    console.error('Error fetching collaborative subjects:', subjectsError)
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
  }

  // Transform data to include collaboration info
  const transformedSubjects = subjects?.map(subject => {
    const isOwner = subject.owner_id === user.id
    const collaboration = subject.subject_teachers?.[0]
    
    return {
      ...subject,
      is_owner: isOwner,
      collaboration: collaboration ? {
        role: collaboration.role,
        permissions: collaboration.permissions,
        collaborator: collaboration.teacher
      } : null,
      collaborators: subject.subject_teachers?.map((st: any) => ({
        teacher: st.teacher,
        role: st.role,
        permissions: st.permissions,
        joined_at: st.joined_at
      })) || []
    }
  }) || []

  return NextResponse.json({
    subjects: transformedSubjects,
    total: transformedSubjects.length
  })
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use subscription_type as the single source of truth (role column removed)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.subscription_type !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can share subjects' }, { status: 403 })
  }

  const { subject_id, teacher_email, role, permissions } = await request.json()

  if (!subject_id || !teacher_email) {
    return NextResponse.json(
      { error: 'Subject ID and teacher email are required' },
      { status: 400 }
    )
  }

  // Verify subject exists and user is owner
  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .select('id, owner_id')
    .eq('id', subject_id)
    .maybeSingle()

  if (subjectError || !subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
  }

  if (subject.owner_id !== user.id) {
    return NextResponse.json({ error: 'Only subject owner can share' }, { status: 403 })
  }

  // Look up teacher by email using auth.users
  // Since we can't directly query auth.users, we'll check if there's a profile with this email
  // by using a case-insensitive search on the email stored in profiles
  const { data: teacherProfiles, error: lookupError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .ilike('email', teacher_email)

  if (lookupError) {
    console.error('Error looking up teacher:', lookupError)
    return NextResponse.json({ error: 'Failed to look up teacher' }, { status: 500 })
  }

  if (!teacherProfiles || teacherProfiles.length === 0) {
    return NextResponse.json({ 
      error: 'Teacher not found. They may not have an account yet.' 
    }, { status: 404 })
  }

  const teacherUser = teacherProfiles[0]

  // Verify the teacher has subscription_type = 'teacher'
  const { data: teacherProfile, error: teacherProfileError } = await supabase
    .from('profiles')
    .select('subscription_type, full_name')
    .eq('id', teacherUser.id)
    .single()

  if (teacherProfileError || teacherProfile.subscription_type !== 'teacher') {
    return NextResponse.json({ 
      error: 'The user must be a teacher to be added as a collaborator' 
    }, { status: 400 })
  }

  // Check if already a collaborator
  const { data: existing } = await supabase
    .from('subject_teachers')
    .select('id')
    .eq('subject_id', subject_id)
    .eq('teacher_id', teacherUser.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ 
      error: 'This teacher is already a collaborator on this subject' 
    }, { status: 400 })
  }

  // Add the teacher as a collaborator
  const { data: collaborator, error: insertError } = await supabase
    .from('subject_teachers')
    .insert({
      subject_id,
      teacher_id: teacherUser.id,
      role: role || 'collaborator',
      permissions: permissions || { can_edit: true, can_view: true, can_manage_assignments: false }
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error adding collaborator:', insertError)
    return NextResponse.json({ error: 'Failed to add collaborator' }, { status: 500 })
  }

  // Create a notification for the invited teacher
  await supabase.from('notifications').insert({
    user_id: teacherUser.id,
    type: 'collaboration_invite',
    title: 'New Collaboration Invitation',
    message: `You have been invited to collaborate on "${subject_id}" by ${teacherProfile.full_name || 'a teacher'}`,
    data: {
      subjectId: subject_id,
      role: role || 'collaborator',
      permissions: permissions || { can_edit: true, can_view: true, can_manage_assignments: false }
    }
  })

  return NextResponse.json({
    success: true,
    message: `Successfully added ${teacherProfile.full_name || teacher_email} as a collaborator`,
    collaborator: {
      ...collaborator,
      teacher: {
        id: teacherUser.id,
        full_name: teacherProfile.full_name,
        email: teacherUser.email
      }
    }
  })
}
