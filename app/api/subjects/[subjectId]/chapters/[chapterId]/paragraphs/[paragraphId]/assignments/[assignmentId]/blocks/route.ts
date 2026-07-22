import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { applyQuestionSelection, normalizeAssignmentSettings, normalizeBlockSettings } from '@/lib/assignments/settings'
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions'

export const dynamic = 'force-dynamic'

const MISSING_COLUMN_PATTERN = /column .* does not exist/i;

function isMissingColumnError(error: any): boolean {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return MISSING_COLUMN_PATTERN.test(text);
}

// blocks_assignment_id_position_key -- the client computes `position` from
// its own local block list, which can go stale (an autosave retry after a
// block it already created wasn't reflected locally yet, another tab/editor
// session, etc.) and collide with a row that already exists at that
// position. Rather than hard-failing forever, reslot to the next free
// position and let the client's next save reconcile ordering.
function isDuplicatePositionError(error: any): boolean {
  const text = `${error?.message || ''} ${error?.details || ''}`;
  return error?.code === '23505' && /position/i.test(text);
}

async function getNextFreePosition(client: any, assignmentId: string): Promise<number> {
  const { data } = await client
    .from('blocks')
    .select('position')
    .eq('assignment_id', assignmentId)
    .order('position', { ascending: false })
    .limit(1);
  return (data?.[0]?.position ?? -1) + 1;
}

async function userCanEditSubject(supabase: any, userId: string, subjectId: string): Promise<boolean> {
  const { data: subject } = await (supabase as any)
    .from('subjects')
    .select('id, user_id, class_id')
    .eq('id', subjectId)
    .maybeSingle();
  if (!subject) return false;
  if (subject.user_id === userId) return true;

  if (!subject.class_id) return false;
  const { data: membership } = await supabase
    .from('class_members')
    .select('role')
    .eq('class_id', subject.class_id)
    .eq('user_id', userId)
    .maybeSingle();
  const role = String(membership?.role || '').toLowerCase();
  return role === 'teacher' || role === 'owner' || role === 'admin' || role === 'creator';
}

async function userIsTeacherForSubject(supabase: any, userId: string, subjectId: string): Promise<boolean> {
  return userCanEditSubject(supabase, userId, subjectId);
}

// GET blocks for an assignment
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  const resolvedParams = await params;

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasSubjectAccess = await userHasSubjectAccess(supabase, user.id, resolvedParams.subjectId);
    if (!hasSubjectAccess) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    // Verify assignment exists and belongs to the given paragraph
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('id, paragraph_id, settings, is_visible')
      .eq('id', resolvedParams.assignmentId)
      .eq('paragraph_id', resolvedParams.paragraphId)
      .single();

    let resolvedAssignment: any = assignment;
    if (assignmentError || !assignment) {
      const { data: fallbackAssignment } = await supabase
        .from('assignments')
        .select('id, settings, is_visible')
        .eq('id', resolvedParams.assignmentId)
        .maybeSingle();
      if (!fallbackAssignment) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }
      resolvedAssignment = fallbackAssignment;
    }

    // Fetch blocks for this assignment
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('*')
      .eq('assignment_id', resolvedParams.assignmentId)
      .order('position', { ascending: true });

    if (blocksError) {
      return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 });
    }

    const normalized = (blocks || []).map((b: any) => ({
      ...b,
      settings: normalizeBlockSettings(b.settings || b.data?.settings || {}),
    }));
    const isTeacher = await userIsTeacherForSubject(supabase, user.id, resolvedParams.subjectId);
    if (isTeacher) {
      return NextResponse.json(normalized);
    }

    // Hidden/unpublished assignments (esp. tests before they're scheduled)
    // must not leak their questions to non-teachers via a direct/guessed URL.
    if (resolvedAssignment?.is_visible === false) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const assignmentSettings = normalizeAssignmentSettings((resolvedAssignment as any)?.settings || {});
    const selected = applyQuestionSelection(
      normalized,
      assignmentSettings,
      `${resolvedParams.assignmentId}:${user.id}`,
    );
    return NextResponse.json(selected);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error while loading blocks' }, { status: 500 });
  }
}

// POST create a new block
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  const resolvedParams = await params

  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, position, data: blockData, locked, show_feedback, ai_grading_override, settings, attached_to_block_id } = body
    const normalizedSettings = normalizeBlockSettings(settings || blockData?.settings || {});

    if (!type || position === undefined || !blockData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // First just verify assignment exists
    const { data: simpleAssignment, error: simpleError } = await supabase
      .from('assignments')
      .select('id, paragraph_id')
      .eq('id', resolvedParams.assignmentId)
      .single()

    if (simpleError || !simpleAssignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const canEdit = await userCanEditSubject(supabase, user.id, resolvedParams.subjectId);
    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied - subject not found' }, { status: 404 })
    }

    const extendedInsert = {
      assignment_id: resolvedParams.assignmentId,
      type,
      position,
      data: blockData,
      settings: normalizedSettings,
      locked: locked || false,
      show_feedback: show_feedback || false,
      ai_grading_override: ai_grading_override || null,
      attached_to_block_id: attached_to_block_id || null,
    };
    const baseInsert = {
      assignment_id: resolvedParams.assignmentId,
      type,
      position,
      data: blockData,
    };

    const insertWith = async (client: any, payload: Record<string, any>) =>
      client
        .from('blocks')
        .insert(payload)
        .select()
        .single();

    let { data: newBlock, error: insertError } = await insertWith(supabase as any, extendedInsert);
    if (insertError && isMissingColumnError(insertError)) {
      ({ data: newBlock, error: insertError } = await insertWith(supabase as any, baseInsert));
    }
    if (insertError) {
      const admin = createAdminClient();
      ({ data: newBlock, error: insertError } = await insertWith(admin as any, extendedInsert));
      if (insertError && isMissingColumnError(insertError)) {
        ({ data: newBlock, error: insertError } = await insertWith(admin as any, baseInsert));
      }
      if (insertError && isDuplicatePositionError(insertError)) {
        const freePosition = await getNextFreePosition(admin as any, resolvedParams.assignmentId);
        ({ data: newBlock, error: insertError } = await insertWith(admin as any, { ...extendedInsert, position: freePosition }));
        if (insertError && isMissingColumnError(insertError)) {
          ({ data: newBlock, error: insertError } = await insertWith(admin as any, { ...baseInsert, position: freePosition }));
        }
      }
    }

    if (insertError) {
      console.error('[blocks POST] insert failed after fallbacks', {
        assignmentId: resolvedParams.assignmentId,
        type,
        message: insertError.message,
        details: (insertError as any)?.details,
        hint: (insertError as any)?.hint,
        code: (insertError as any)?.code,
      })
      return NextResponse.json(
        { error: `Failed to create block: ${insertError.message || 'unknown error'}` },
        { status: 500 }
      )
    }

    return NextResponse.json(newBlock)
  } catch (error: any) {
    console.error('[blocks POST] unhandled exception', error)
    return NextResponse.json({ error: `Internal server error: ${error?.message || 'unknown'}` }, { status: 500 })
  }
}
