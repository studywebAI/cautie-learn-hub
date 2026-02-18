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

  // Get user profile to verify teacher role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'teacher') {
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

  // Get user profile to verify teacher role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'teacher') {
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

  // Get teacher ID from email
  const { data: teacherUser, error: teacherError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', (await supabase.rpc('get_user_id_by_email', { email: teacher_email })).data)

  // Alternative: query auth.users directly (requires admin rights)
  // For now, we'll use a simpler approach - ask for teacher user ID directly
  // Or we can create a function to get user ID by email
  
  return NextResponse.json({
    success: false,
    message: 'Teacher email lookup requires additional setup. Please provide teacher user ID instead.'
  }, { status: 501 })
}