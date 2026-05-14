import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function DELETE(
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

    // Verify ownership
    const { data: studyset, error: fetchError } = await (supabase as any)
      .from('studysets')
      .select('id, owner_id')
      .eq('id', params.studysetId)
      .single();

    if (fetchError || !studyset) {
      return NextResponse.json({ error: 'StudySet not found' }, { status: 404 });
    }

    if (studyset.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Soft delete: set status to 'archived'
    const { error: deleteError } = await (supabase as any)
      .from('studysets')
      .update({ status: 'archived' })
      .eq('id', params.studysetId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete studyset' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      studysetId: params.studysetId,
      message: 'StudySet deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting studyset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
