import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET grading categories for a class
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const resolvedParams = await params
  const { classId } = resolvedParams
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is a teacher member of the class
  // (owner_id column was removed - all teachers are equal via class_members)
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', user.id)
    .single()

  const isTeacher = userProfile?.subscription_type === 'teacher'

  // Also check if user is a member of this class
  const { data: classMember } = await supabase
    .from('class_members')
    .select('user_id')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  // Teachers who are members of the class can access grading categories
  if (!isTeacher || !classMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('grading_categories' as any)
    .select('*')
    .eq('class_id', classId)
    .order('created_at')

  if (error) {
    console.error('Error fetching grading categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST create grading category
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const resolvedParams = await params
  const { classId } = resolvedParams
  const { name, description, weight, color } = await request.json()
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is a teacher member of the class
  // (owner_id column was removed - all teachers are equal via class_members)
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', user.id)
    .single()

  const isTeacher = userProfile?.subscription_type === 'teacher'

  // Also check if user is a member of this class
  const { data: classMember } = await supabase
    .from('class_members')
    .select('user_id')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  // Teachers who are members of the class can create grading categories
  if (!isTeacher || !classMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('grading_categories' as any)
    .insert({
      class_id: classId,
      name,
      description,
      weight,
      color
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating grading category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
