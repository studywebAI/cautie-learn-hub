import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const materialId = resolvedParams.materialId;

    // Check if user has access to the material
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, class_id, user_id, content, type')
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Authorization
    let hasAccess = false;
    if (material.class_id) {
      const { data: classData } = await supabase
        .from('classes')
        .select('owner_id')
        .eq('id', material.class_id)
        .single();

      if (classData?.owner_id === user.id) {
        hasAccess = true;
      } else {
        const { count } = await supabase
          .from('class_members')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', material.class_id)
          .eq('user_id', user.id);

        if (count && count > 0) {
          hasAccess = true;
        }
      }
    } else if (material.user_id === user.id) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if blocks already exist for this material
    const { count: existingBlocks } = await supabase
      .from('blocks')
      .select('*', { count: 'exact', head: true })
      .eq('material_id', materialId);

    if (existingBlocks && existingBlocks > 0) {
      return NextResponse.json({ error: 'Material already has blocks' }, { status: 400 });
    }

    // Migrate content to blocks
    // For simplicity, create a single block with the entire content
    const { data, error } = await (supabase as any)
      .from('blocks')
      .insert({
        material_id: materialId,
        data: material.content,
        type: material.type || 'text',
        position: 0,
        order_index: 0,
      })
      .select();

    if (error) {
      console.error('Error migrating material to blocks:', error);
      return NextResponse.json({ error: 'Failed to migrate material' }, { status: 500 });
    }

    return NextResponse.json({ blocks: data, message: 'Material migrated to blocks successfully' });
  } catch (error) {
    console.error('Material migrate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
