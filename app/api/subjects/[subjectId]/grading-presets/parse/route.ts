import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions';
import { parseGradingScale } from '@/ai/flows/parse-grading-scale';

export const dynamic = 'force-dynamic';

// Mirrors app/api/classes/[classId]/grading-presets/parse/route.ts, keyed
// on subject_id instead of class_id.
export async function POST(
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
    const description = String(body?.description || '').trim();
    if (!description) return NextResponse.json({ error: 'description is required' }, { status: 400 });
    if (description.length > 8000) return NextResponse.json({ error: 'description too long' }, { status: 400 });

    const result = await parseGradingScale(description);
    return NextResponse.json({ system: result.system, bins: result.bins });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
