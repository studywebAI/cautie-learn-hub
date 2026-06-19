import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studysetId: string }> }
) {
  try {
    const { studysetId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: studyset } = await (supabase as any)
      .from('studysets')
      .select('id, user_id')
      .eq('id', studysetId)
      .eq('user_id', user.id)
      .single();

    if (!studyset) {
      return NextResponse.json({ error: 'Studyset not found' }, { status: 404 });
    }

    // Get materials
    const { data: materials, error } = await (supabase as any)
      .from('studyset_materials')
      .select('id, kind, title, file_name, file_size, mime_type, extraction_status, created_at')
      .eq('studyset_id', studysetId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      materials: materials || [],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studysetId: string }> }
) {
  try {
    const { studysetId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: studyset } = await (supabase as any)
      .from('studysets')
      .select('id, user_id')
      .eq('id', studysetId)
      .eq('user_id', user.id)
      .single();

    if (!studyset) {
      return NextResponse.json({ error: 'Studyset not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { kind, title, content, file_name, file_size, mime_type } = body;

    if (!kind || !['text', 'file', 'url', 'onedrive'].includes(kind)) {
      return NextResponse.json({ error: 'Invalid material kind' }, { status: 400 });
    }

    const { data: material, error } = await (supabase as any)
      .from('studyset_materials')
      .insert({
        studyset_id: studysetId,
        user_id: user.id,
        kind,
        title: title || null,
        content: content || null,
        file_name: file_name || null,
        file_size: file_size || null,
        mime_type: mime_type || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      material,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ studysetId: string }> }
) {
  try {
    const { studysetId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await _request.json().catch(() => ({}));
    const materialId = body.id;

    if (!materialId) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 });
    }

    // Verify ownership (user must own the studyset)
    const { data: studyset } = await (supabase as any)
      .from('studysets')
      .select('id, user_id')
      .eq('id', studysetId)
      .eq('user_id', user.id)
      .single();

    if (!studyset) {
      return NextResponse.json({ error: 'Studyset not found' }, { status: 404 });
    }

    // Verify material belongs to this studyset
    const { data: material } = await (supabase as any)
      .from('studyset_materials')
      .select('id')
      .eq('id', materialId)
      .eq('studyset_id', studysetId)
      .single();

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    const { error } = await (supabase as any)
      .from('studyset_materials')
      .delete()
      .eq('id', materialId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
