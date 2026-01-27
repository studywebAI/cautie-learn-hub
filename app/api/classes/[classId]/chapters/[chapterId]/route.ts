import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string; chapterId: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { classId, chapterId } = await params;
    // Check if user has access to the class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, owner_id')
      .eq('id', classId)
      .single();
    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    let hasAccess = classData.owner_id === user.id;
    if (!hasAccess) {
      const { count } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('user_id', user.id);
      hasAccess = (count || 0) > 0;
    }
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Get the chapter
    const { data: chapter, error: chapterError } = await supabase
      .from('class_chapters')
      .select('*')
      .eq('id', chapterId)
      .eq('class_id', classId)
      .single();
    if (chapterError || !chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }
    return NextResponse.json({ chapter });
  } catch (error) {
    console.error('Chapter GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string; chapterId: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { classId, chapterId } = await params;
    const body = await request.json();
    const { title, description, order_index } = body;
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
      return NextResponse.json({ error: 'Only teachers can update chapters' }, { status: 403 });
    }
    // Update the chapter
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (order_index !== undefined) updateData.order_index = order_index;
    const { data, error } = await supabase
      .from('class_chapters')
      .update(updateData)
      .eq('id', chapterId)
      .eq('class_id', classId)
      .select()
      .single();
    if (error) {
      console.error('Error updating chapter:', error);
      return NextResponse.json({ error: 'Failed to update chapter' }, { status: 500 });
    }
    return NextResponse.json({ chapter: data });
  } catch (error) {
    console.error('Chapter PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string; chapterId: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { classId, chapterId } = await params;
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
      return NextResponse.json({ error: 'Only teachers can delete chapters' }, { status: 403 });
    }
    // Delete the chapter (RLS and foreign keys will handle cleanup)
    const { error } = await supabase
      .from('class_chapters')
      .delete()
      .eq('id', chapterId)
      .eq('class_id', classId);
    if (error) {
      console.error('Error deleting chapter:', error);
      return NextResponse.json({ error: 'Failed to delete chapter' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    console.error('Chapter DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}