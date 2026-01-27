import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string; chapterId: string; blockId: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId, chapterId, blockId } = await params;
    const body = await request.json();
    const { content, type, order_index } = body;

    // Check if user is teacher
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, owner_id')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    let isTeacher = classData.owner_id === user.id;
    if (!isTeacher) {
      const { data: memberData } = await supabase
        .from('class_members')
        .select('role')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .single();

      isTeacher = memberData?.role === 'teacher';
    }

    if (!isTeacher) {
      return NextResponse.json({ error: 'Only teachers can update blocks' }, { status: 403 });
    }

    // Update the block
    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (order_index !== undefined) updateData.order_index = order_index;

    const { data, error } = await supabase
      .from('blocks')
      .update(updateData)
      .eq('id', blockId)
      .eq('chapter_id', chapterId)
      .select()
      .single();

    if (error) {
      console.error('Error updating block:', error);
      return NextResponse.json({ error: 'Failed to update block' }, { status: 500 });
    }

    return NextResponse.json({ block: data });
  } catch (error) {
    console.error('Block PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string; chapterId: string; blockId: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId, chapterId, blockId } = await params;

    // Check if user is teacher
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, owner_id')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    let isTeacher = classData.owner_id === user.id;
    if (!isTeacher) {
      const { data: memberData } = await supabase
        .from('class_members')
        .select('role')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .single();

      isTeacher = memberData?.role === 'teacher';
    }

    if (!isTeacher) {
      return NextResponse.json({ error: 'Only teachers can delete blocks' }, { status: 403 });
    }

    // Delete embedded assignments first
    const { error: assignmentError } = await supabase
      .from('assignments')
      .delete()
      .eq('block_id', blockId);

    if (assignmentError) {
      console.error('Error deleting embedded assignments:', assignmentError);
      return NextResponse.json({ error: 'Failed to delete embedded assignments' }, { status: 500 });
    }

    // Delete the block
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', blockId)
      .eq('chapter_id', chapterId);

    if (error) {
      console.error('Error deleting block:', error);
      return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Block deleted successfully' });
  } catch (error) {
    console.error('Block DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}