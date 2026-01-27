import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

// DELETE an assignment
export async function DELETE(request: Request, { params }: { params: { assignmentId: string } }) {
  const { assignmentId } = params;
  const { searchParams } = new URL(request.url);
  const guestId = searchParams.get('guestId');

  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !guestId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check ownership
  let query = supabase
    .from('assignments')
    .select('class_id')
    .eq('id', assignmentId)
    .single();

  const { data: assignment, error: fetchError } = await query;
  if (fetchError || !assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const classId = assignment.class_id;

  // Check if user owns the class
  if (user) {
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('user_id, owner_id')
      .eq('id', classId)
      .single();

    if (classError || !classData || (classData.user_id !== user.id && classData.owner_id !== user.id)) {
      return NextResponse.json({ error: 'Forbidden. You are not the owner of this class.' }, { status: 403 });
    }
  } else if (guestId) {
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('guest_id')
      .eq('id', classId)
      .eq('owner_type', 'guest')
      .single();

    if (classError || !classData || classData.guest_id !== guestId) {
      return NextResponse.json({ error: 'Forbidden. You are not the owner of this class.' }, { status: 403 });
    }
  }

  // Delete the assignment
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PUT to update an assignment
export async function PUT(request: Request, { params }: { params: { assignmentId: string } }) {
  const { assignmentId } = params;
  const { title, due_date, chapter_id, block_id, guestId, type, content, files } = await request.json();
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !guestId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check ownership
  let query = supabase
    .from('assignments')
    .select('class_id')
    .eq('id', assignmentId)
    .single();

  const { data: assignment, error: fetchError } = await query;
  if (fetchError || !assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const classId = assignment.class_id;

  // Check if user owns the class
  if (user) {
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('user_id, owner_id')
      .eq('id', classId)
      .single();

    if (classError || !classData || (classData.user_id !== user.id && classData.owner_id !== user.id)) {
      return NextResponse.json({ error: 'Forbidden. You are not the owner of this class.' }, { status: 403 });
    }
  } else if (guestId) {
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('guest_id')
      .eq('id', classId)
      .eq('owner_type', 'guest')
      .single();

    if (classError || !classData || classData.guest_id !== guestId) {
      return NextResponse.json({ error: 'Forbidden. You are not the owner of this class.' }, { status: 403 });
    }
  }

  // Validate chapter_id if provided
  if (chapter_id) {
    const { data: chapter, error: chapterError } = await supabase
      .from('class_chapters')
      .select('class_id')
      .eq('id', chapter_id)
      .single();

    if (chapterError || !chapter || chapter.class_id !== classId) {
      return NextResponse.json({ error: 'Invalid chapter_id' }, { status: 400 });
    }
  }

  // Validate block_id if provided
  if (block_id) {
    const { data: block, error: blockError } = await supabase
      .from('blocks')
      .select('chapter_id')
      .eq('id', block_id)
      .single();

    if (blockError || !block || block.chapter_id !== chapter_id) {
      return NextResponse.json({ error: 'Invalid block_id' }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from('assignments')
    .update({
      title,
      due_date,
      chapter_id,
      block_id,
      type,
      content,
      files,
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}