import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
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
      .select('id, class_id, user_id')
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Authorization: check if user is member of the class or owner
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

    // Get blocks for the material
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('*')
      .eq('material_id', materialId)
      .order('order_index', { ascending: true });

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
      return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 });
    }

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

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const materialId = resolvedParams.materialId;
    const body = await request.json();
    const { content, type, order_index } = body;

    // Check if user has access to the material
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, class_id, user_id')
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Authorization: check if user is member of the class or owner
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

    // Create the block
    const { data, error } = await supabase
      .from('blocks')
      .insert({
        material_id: materialId,
        content,
        type,
        order_index: order_index || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating block:', error);
      return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
    }

    return NextResponse.json({ block: data });
  } catch (error) {
    console.error('Blocks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
