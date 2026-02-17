import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

// GET rubrics for a class - any teacher in the class
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const { classId } = await params
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const perm = await getClassPermission(supabase, classId, user.id)
  if (!perm.isTeacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('rubrics' as any)
    .select(`*, rubric_items (*)`)
    .eq('class_id', classId)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST create rubric - any teacher in the class
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const { classId } = await params
  const { name, description, items } = await request.json()
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const perm = await getClassPermission(supabase, classId, user.id)
  if (!perm.isTeacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: rubric, error: rubricError } = await (supabase.from('rubrics' as any) as any)
    .insert({ class_id: classId, name, description })
    .select()
    .single()

  const rubricId = (rubric as any)?.id as string | undefined

  if (rubricError || !rubricId) {
    return NextResponse.json({ error: rubricError?.message || 'Failed to create rubric' }, { status: 500 })
  }

  if (items && items.length > 0) {
    const rubricItems = items.map((item: any, index: number) => ({
      rubric_id: rubricId,
      criterion: item.criterion,
      description: item.description,
      max_score: item.max_score || 4,
      weight: item.weight || 1,
      order_index: index
    }))

    const { error: itemsError } = await supabase.from('rubric_items' as any).insert(rubricItems)
    if (itemsError) {
      await (supabase.from('rubrics' as any) as any).delete().eq('id', rubricId)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  await logAuditEntry(supabase, {
    userId: user.id, classId, action: 'create', entityType: 'rubric',
    entityId: rubricId, changes: { name, description, itemCount: items?.length || 0 }
  })

  const { data: completeRubric, error: fetchError } = await (supabase.from('rubrics' as any) as any)
    .select(`*, rubric_items (*)`)
    .eq('id', rubricId)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json(completeRubric)
}
