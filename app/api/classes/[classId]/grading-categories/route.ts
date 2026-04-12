import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getClassPermission } from '@/lib/auth/class-permissions'

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

  const perm = await getClassPermission(supabase as any, classId, user.id)
  if (!perm.isMember || !perm.isTeacher) {
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

  const perm = await getClassPermission(supabase as any, classId, user.id)
  if (!perm.isMember || !perm.isTeacher) {
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
