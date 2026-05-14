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

    const body = await req.json();
    const { knowledgeLevel, studyDays, workflowSetting, workflowType } = body;

    // Verify ownership
    const { data: studyset } = await (supabase as any)
      .from('studysets')
      .select('id')
      .eq('id', params.studysetId)
      .single();

    if (!studyset) {
      return NextResponse.json({ error: 'StudySet not found' }, { status: 404 });
    }

    // Save or update workflow settings
    const { data: saved, error } = await (supabase as any)
      .from('studyset_workflow_settings')
      .upsert({
        user_id: user.id,
        studyset_id: params.studysetId,
        workflow_type: workflowType,
        knowledge_level: knowledgeLevel,
        study_days: studyDays,
        workflow_setting: workflowSetting,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'studyset_id',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: saved.id,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
