import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { blockIds } = body; // array of block IDs in new order

    if (!Array.isArray(blockIds)) {
      return NextResponse.json({ error: 'blockIds must be an array' }, { status: 400 });
    }

    // Get the first block to determine the material_id or chapter_id
    const { data: firstBlock, error: blockError } = await supabase
      .from('blocks')
      .select('material_id, chapter_id')
      .eq('id', blockIds[0])
      .single();

    if (blockError || !firstBlock) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    let hasAccess = false;

    if (firstBlock.material_id) {
      // Material blocks
      const { data: material, error: materialError } = await supabase
        .from('materials')
        .select('id, class_id, user_id')
        .eq('id', firstBlock.material_id)
        .single();

      if (materialError || !material) {
        return NextResponse.json({ error: 'Material not found' }, { status: 404 });
      }

      // Authorization for material
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
    } else if (firstBlock.chapter_id) {
      // Chapter blocks - use chapters table with subjects join
      const { data: chapter, error: chapterError } = await (supabase as any)
        .from('chapters')
        .select('id, subject_id, subjects(class_id)')
        .eq('id', firstBlock.chapter_id)
        .single();

      if (chapterError || !chapter) {
        return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
      }

      // Authorization for chapter
      const chapterClassId = chapter.subjects?.class_id;
      const { data: classData } = await supabase
        .from('classes')
        .select('owner_id')
        .eq('id', chapterClassId)
        .single();

      if (classData?.owner_id === user.id) {
        hasAccess = true;
      } else {
        const { count } = await supabase
          .from('class_members')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', chapterClassId)
          .eq('user_id', user.id);

        if (count && count > 0) {
          hasAccess = true;
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid block configuration' }, { status: 400 });
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update order_index for each block
    const updates = blockIds.map((blockId, index) => ({
      id: blockId,
      order_index: index,
      updated_at: new Date().toISOString(),
    }));

    // Use a transaction-like approach with individual updates
    for (const update of updates) {
      const { error } = await supabase
        .from('blocks')
        .update({ order_index: update.order_index, updated_at: update.updated_at })
        .eq('id', update.id);

      if (error) {
        console.error('Error updating block order:', error);
        return NextResponse.json({ error: 'Failed to reorder blocks' }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Blocks reordered successfully' });
  } catch (error) {
    console.error('Blocks reorder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
