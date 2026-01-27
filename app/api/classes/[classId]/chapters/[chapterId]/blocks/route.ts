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
    // Get blocks for this chapter
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('order_index', { ascending: true });
    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
      return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 });
    }
    return NextResponse.json({ blocks: blocks || [] });
  } catch (error) {
    console.error('Chapter blocks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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
    const { content, type } = body;
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
      return NextResponse.json({ error: 'Only teachers can add blocks' }, { status: 403 });
    }
    // Get the highest order_index for this chapter
    const { data: lastBlock } = await supabase
      .from('blocks')
      .select('order_index')
      .eq('chapter_id', chapterId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();
    const nextOrderIndex = (lastBlock?.order_index || 0) + 1;
    // Add the block
    const { data, error } = await supabase
      .from('blocks')
      .insert({
        chapter_id: chapterId,
        content: content,
        type: type,
        order_index: nextOrderIndex,
      })
      .select()
      .single();
    if (error) {
      console.error('Error adding block:', error);
      return NextResponse.json({ error: 'Failed to add block' }, { status: 500 });
    }
    return NextResponse.json({ block: data });
  } catch (error) {
    console.error('Chapter blocks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}