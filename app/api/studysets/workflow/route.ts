import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * POST /api/studysets/workflow
 * Create a new studyset from workflow
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, subject, materials, aiGenOptions, agenda, preferences } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Create studyset
    const { data: studyset, error: createError } = await (supabase as any)
      .from('studysets')
      .insert({
        owner_id: user.id,
        name,
        description: description || null,
        subject: subject || null,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Save workflow state
    if (studyset) {
      await (supabase as any)
        .from('studyset_workflow_state')
        .insert({
          studyset_id: studyset.id,
          ai_generation_style: aiGenOptions || 'linear-progress',
          agenda_settings: agenda || {},
          user_preferences: preferences || {},
          materials_count: materials?.length || 0,
        })
        .catch(() => {}); // Ignore if table doesn't exist
    }

    return NextResponse.json({ id: studyset.id, ...studyset });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
