import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getClassPermission } from '@/lib/auth/class-permissions';
import { parseGradingScale } from '@/ai/flows/parse-grading-scale';

export const dynamic = 'force-dynamic';

// POST /api/classes/[classId]/grading-presets/parse
// Body: { description: string } — pasted text, or text extracted client-side
// from an uploaded file. Returns structured bins for a custom grading-scale
// template (docs/grades-feature-brainstorm.md point 11).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
