import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const blockId = resolvedParams.blockId;
    const body = await request.json();
    const { data, type, position, locked, show_feedback, ai_grading_override } = body;

    // Get the block and check access
    const { data: block, error: blockError } = await supabase
      .from('blocks')
      .select('material_id')
      .eq('id', blockId)
      .single();

    if (blockError || !block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    const materialId = (block as any).material_id as string | null;
    if (!materialId) {
      return NextResponse.json({ error: 'Block is missing material_id' }, { status: 400 });
    }

    // Check access to the material
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, class_id, user_id')
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

    // Update the block
    const updateData: any = {};
    if (data !== undefined) updateData.data = data;
    if (type !== undefined) updateData.type = type;
    if (position !== undefined) updateData.position = position;
    if (locked !== undefined) updateData.locked = locked;
    if (show_feedback !== undefined) updateData.show_feedback = show_feedback;
    if (ai_grading_override !== undefined) updateData.ai_grading_override = ai_grading_override;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedBlock, error } = await supabase
      .from('blocks')
      .update(updateData)
      .eq('id', blockId)
      .select()
      .single();

    if (error) {
      console.error('Error updating block:', error);
      return NextResponse.json({ error: 'Failed to update block' }, { status: 500 });
    }

    return NextResponse.json({ block: updatedBlock });
  } catch (error) {
    console.error('Blocks PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const blockId = resolvedParams.blockId;

    // Get the block and check access
    const { data: block, error: blockError } = await supabase
      .from('blocks')
      .select('material_id')
      .eq('id', blockId)
      .single();

    if (blockError || !block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    const materialId = (block as any).material_id as string | null;
    if (!materialId) {
      return NextResponse.json({ error: 'Block is missing material_id' }, { status: 400 });
    }

    // Check access to the material
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, class_id, user_id')
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

    // Delete the block
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', blockId);

    if (error) {
      console.error('Error deleting block:', error);
      return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Block deleted successfully' });
  } catch (error) {
    console.error('Blocks DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
