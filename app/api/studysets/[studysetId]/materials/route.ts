import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(
  req: NextRequest,
  { params }: { params: { studysetId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { materials } = await req.json();

    // Verify ownership
    const { data: studyset } = await (supabase as any)
      .from('studysets')
      .select('owner_id')
      .eq('id', params.studysetId)
      .single();

    if (!studyset || studyset.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Save materials
    const savedMaterials = [];
    for (const material of materials || []) {
      const { data } = await (supabase as any)
        .from('studyset_materials')
        .insert({
          studyset_id: params.studysetId,
          type: material.type,
          content: material.content,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()
        .catch(() => ({ data: null }));

      if (data) savedMaterials.push(data);
    }

    return NextResponse.json({
      success: true,
      count: savedMaterials.length,
      materials: savedMaterials,
    });
  } catch (error) {
    console.error('POST /api/studysets/[studysetId]/materials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
