import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { normalizeAssignmentSettings } from '@/lib/assignments/settings'
import { getClassPermission } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

// Share codes: uppercase alphanumeric, excluding visually-ambiguous chars (0/O, 1/I).
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 7;
const MAX_GENERATION_ATTEMPTS = 8;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// POST — generate (or return the existing) share code for a test assignment.
// G3 (docs/subjects-feature-brainstorm.md): another teacher uses this code to import
// a fully independent copy via POST /api/tests/import.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('id, class_id, type, settings')
      .eq('id', resolvedParams.assignmentId)
      .eq('paragraph_id', resolvedParams.paragraphId)
      .maybeSingle();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const perm = await getClassPermission(supabase as any, (assignment as any).class_id, user.id);
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Sharing was originally test-only (docs/subjects-feature-brainstorm.md
    // G3); extended in section H to any assignment type.
    const currentSettings = normalizeAssignmentSettings((assignment as any).settings || {});

    // Idempotent: reuse an existing code rather than invalidating a link already shared.
    if (currentSettings.sharing.code) {
      return NextResponse.json({
        code: currentSettings.sharing.code,
        importPath: `/tests/import/${currentSettings.sharing.code}`,
      });
    }

    let code: string | null = null;
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const candidate = generateCode();
      const { data: collision } = await (supabase as any)
        .from('assignments')
        .select('id')
        .filter('settings->sharing->>code', 'eq', candidate)
        .limit(1)
        .maybeSingle();
      if (!collision) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      return NextResponse.json({ error: 'Could not generate a unique share code, try again' }, { status: 500 });
    }

    const updatedSettings = normalizeAssignmentSettings({
      ...currentSettings,
      sharing: { code },
    });

    const { error: updateError } = await supabase
      .from('assignments')
      .update({ settings: updatedSettings as any })
      .eq('id', resolvedParams.assignmentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      code,
      importPath: `/tests/import/${code}`,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
