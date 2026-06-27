import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'
import { updatePersonalTaskSchema, validateBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// PUT update a personal task
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate request body
  const validation = await validateBody(request, updatePersonalTaskSchema)
  if ('error' in validation) {
    return validation.error
  }

  const updates = validation.data

  // Ensure user owns this task
  const { data: existingTask } = await supabase
    .from('personal_tasks')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existingTask || existingTask.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('personal_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE a personal task
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure user owns this task
  const { data: existingTask } = await supabase
    .from('personal_tasks')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existingTask || existingTask.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
  }

  const { error } = await supabase
    .from('personal_tasks')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
