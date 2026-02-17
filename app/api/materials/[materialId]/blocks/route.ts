import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getClassPermission } from '@/lib/auth/class-permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { materialId } = await params;

    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, class_id, user_id')
      .eq('id', materialId)
      .single();

    if (materialError || !material) return NextResponse.json({ error: 'Material not found' }, { status: 404 });

    // Auth: class material = any member, personal = owner only
    if (material.class_id) {
      const perm = await getClassPermission(supabase, material.class_id as string, user.id);
      if (!perm.isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if ((material as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('*')
      .eq('material_id', materialId)
      .order('position', { ascending: true });

    if (blocksError) return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 });
    return NextResponse.json({ blocks });
  } catch (error) {
    console.error('Blocks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { materialId } = await params;
    const body = await request.json();
    const { data: content, type, position, locked, show_feedback, ai_grading_override } = body;

    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, class_id, user_id')
      .eq('id', materialId)
      .single();

    if (materialError || !material) return NextResponse.json({ error: 'Material not found' }, { status: 404 });

    // Auth: class material = any teacher, personal = owner only
    if (material.class_id) {
      const perm = await getClassPermission(supabase, material.class_id as string, user.id);
      if (!perm.isTeacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if ((material as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await (supabase as any)
      .from('blocks')
      .insert({
        material_id: materialId,
        data: content,
        type,
        position: position || 0,
        locked: locked || false,
        show_feedback: show_feedback || false,
        ai_grading_override: ai_grading_override || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
    return NextResponse.json({ block: data });
  } catch (error) {
    console.error('Blocks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
