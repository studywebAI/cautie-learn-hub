import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions';

export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = ['test', 'quiz', 'homework', 'project', 'exam', 'assignment', 'other'];

// Mirrors app/api/classes/[classId]/category-weights/route.ts, keyed on
// subject_id instead of class_id.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: presets } = await supabase
      .from('class_grading_presets')
      .select('id, config')
      .eq('subject_id', subjectId);

    const row = (presets || []).find((p: any) => p.config?.templateType === 'category_weights');
    return NextResponse.json({ weights: row?.config?.weights || null, preset_id: row?.id || null });
  } catch (err) {
    return NextResponse.json({ weights: null, preset_id: null });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const weights = body?.weights;
    if (!weights || typeof weights !== 'object' || Array.isArray(weights)) {
      return NextResponse.json({ error: 'weights must be an object of category -> number' }, { status: 400 });
    }
    const cleanWeights: Record<string, number> = {};
    for (const [category, value] of Object.entries(weights)) {
      if (!ALLOWED_CATEGORIES.includes(category)) continue;
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        return NextResponse.json({ error: `Invalid weight for ${category}` }, { status: 400 });
      }
      if (num > 0) cleanWeights[category] = num;
    }

    const { data: existing } = await supabase
      .from('class_grading_presets')
      .select('id, config')
      .eq('subject_id', subjectId);
    const existingRow = (existing || []).find((p: any) => p.config?.templateType === 'category_weights');

    const config = { templateType: 'category_weights', weights: cleanWeights };

    if (existingRow) {
      const { data: updated, error } = await supabase
        .from('class_grading_presets')
        .update({ config })
        .eq('id', (existingRow as any).id)
        .select('id, config')
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ weights: updated?.config?.weights || cleanWeights, preset_id: updated?.id });
    }

    const { data: created, error } = await supabase
      .from('class_grading_presets')
      .insert({ subject_id: subjectId, name: 'Category weights', kind: 'freeform', config, created_by: user.id })
      .select('id, config')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ weights: created?.config?.weights || cleanWeights, preset_id: created?.id });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
