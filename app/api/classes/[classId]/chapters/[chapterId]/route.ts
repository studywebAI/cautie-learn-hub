import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string; chapterId: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { classId, chapterId } = await params;
    const perm = await getClassPermission(supabase, classId, user.id);
    if (!perm.isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: chapter, error: chapterError } = await (supabase as any)
      .from('chapters')
      .select('*, subjects!inner(class_id)')
      .eq('id', chapterId)
      .single();

    if (chapterError || !chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { classId, chapterId } = await params;
    const body = await request.json();
    const { title, description, chapter_number } = body;

    // Any teacher in the class can update chapters
    const perm = await getClassPermission(supabase, classId, user.id);
    if (!perm.isTeacher) return NextResponse.json({ error: 'Only teachers can update chapters' }, { status: 403 });

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (chapter_number !== undefined) updateData.chapter_number = chapter_number;

    const { data, error } = await (supabase as any)
      .from('chapters')
      .update(updateData)
      .eq('id', chapterId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to update chapter' }, { status: 500 });

    await logAuditEntry(supabase, {
      userId: user.id, classId, action: 'update', entityType: 'chapter',
      entityId: chapterId, changes: updateData
    });

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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { classId, chapterId } = await params;
    const perm = await getClassPermission(supabase, classId, user.id);
    if (!perm.isTeacher) return NextResponse.json({ error: 'Only teachers can delete chapters' }, { status: 403 });

    const { error } = await (supabase as any).from('chapters').delete().eq('id', chapterId);
    if (error) return NextResponse.json({ error: 'Failed to delete chapter' }, { status: 500 });

    await logAuditEntry(supabase, {
      userId: user.id, classId, action: 'delete', entityType: 'chapter', entityId: chapterId
    });

    return NextResponse.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    console.error('Chapter DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
