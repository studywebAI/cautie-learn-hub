import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET rubrics for a class
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

  // Check if user owns the class
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('owner_id')
    .eq('id', classId)
    .single()

  if (classError || !classData || classData.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('rubrics' as any)
    .select(`
      *,
      rubric_items (*)
    `)
    .eq('class_id', classId)
    .order('created_at')

  if (error) {
    console.error('Error fetching rubrics:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST create rubric
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const resolvedParams = await params
  const { classId } = resolvedParams
  const { name, description, items } = await request.json()
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user owns the class
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('owner_id')
    .eq('id', classId)
    .single()

  if (classError || !classData || classData.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Start transaction
  const { data: rubric, error: rubricError } = await supabase
    .from('rubrics' as any)
    .insert({
      class_id: classId,
      name,
      description
    })
    .select()
    .single()

  if (rubricError || !rubric) {
    console.error('Error creating rubric:', rubricError)
    return NextResponse.json({ error: rubricError?.message || 'Failed to create rubric' }, { status: 500 })
  }

  // Insert rubric items
  if (items && items.length > 0) {
    const rubricItems = items.map((item: any, index: number) => ({
      rubric_id: rubric.id,
      criterion: item.criterion,
      description: item.description,
      max_score: item.max_score || 4,
      weight: item.weight || 1,
      order_index: index
    }))

    const { error: itemsError } = await supabase
      .from('rubric_items' as any)
      .insert(rubricItems)

    if (itemsError) {
      console.error('Error creating rubric items:', itemsError)
      // Clean up rubric if items failed
      await supabase.from('rubrics' as any).delete().eq('id', rubric.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  // Fetch complete rubric with items
  const { data: completeRubric, error: fetchError } = await supabase
    .from('rubrics' as any)
    .select(`
      *,
      rubric_items (*)
    `)
    .eq('id', rubric.id)
    .single()

  if (fetchError) {
    console.error('Error fetching complete rubric:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json(completeRubric)
}
