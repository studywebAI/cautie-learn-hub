import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { applyQuestionSelection, normalizeAssignmentSettings, normalizeBlockSettings } from '@/lib/assignments/settings'

export const dynamic = 'force-dynamic'

async function userHasSubjectAccess(supabase: any, userId: string, subjectId: string): Promise<boolean> {
  const { data: subject } = await (supabase as any)
    .from('subjects')
    .select('id, user_id, class_id')
    .eq('id', subjectId)
    .maybeSingle();
  if (!subject) return false;
  if (subject.user_id === userId) return true;

  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('user_id', userId);
  const classIds = (memberships || []).map((m: any) => m.class_id).filter(Boolean);
  if (classIds.length === 0) return false;
  if (subject.class_id && classIds.includes(subject.class_id)) return true;

  const { data: links } = await (supabase as any)
    .from('class_subjects')
    .select('subject_id')
    .eq('subject_id', subjectId)
    .in('class_id', classIds)
    .limit(1);
  return !!(links && links.length > 0);
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
    const cookieStore = cookies();
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
      .select('id, paragraph_id, settings')
      .eq('id', resolvedParams.assignmentId)
      .eq('paragraph_id', resolvedParams.paragraphId)
      .single();

    if (assignmentError || !assignment) {
      const { data: fallbackAssignment } = await supabase
        .from('assignments')
        .select('id, settings')
        .eq('id', resolvedParams.assignmentId)
        .maybeSingle();
      if (!fallbackAssignment) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }
    }

    // Fetch blocks for this assignment
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('*')
      .eq('assignment_id', resolvedParams.assignmentId)
      .order('position', { ascending: true });

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
      return NextResponse.json([]); // Return empty array to prevent infinite loading
    }

    const normalized = (blocks || []).map((b: any) => ({
      ...b,
      settings: normalizeBlockSettings(b.settings || b.data?.settings || {}),
    }));
    const isTeacher = await userIsTeacherForSubject(supabase, user.id, resolvedParams.subjectId);
    if (isTeacher) {
      return NextResponse.json(normalized);
    }

    const assignmentSettings = normalizeAssignmentSettings((assignment as any)?.settings || {});
    const selected = applyQuestionSelection(
      normalized,
      assignmentSettings,
      `${resolvedParams.assignmentId}:${user.id}`,
    );
    return NextResponse.json(selected);
  } catch (error) {
    console.error('Unexpected error in blocks GET:', error);
    return NextResponse.json([], { status: 200 }); // Graceful fallback
  }
}

// POST create a new block
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  const resolvedParams = await params

  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, position, data: blockData, locked, show_feedback, ai_grading_override, settings } = body
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

    // Insert the new block
    const { data: newBlock, error: insertError } = await supabase
      .from('blocks')
      .insert({
        assignment_id: resolvedParams.assignmentId,
        type,
        position,
        data: blockData,
        settings: normalizedSettings,
        locked: locked || false,
        show_feedback: show_feedback || false,
        ai_grading_override: ai_grading_override || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating block:', insertError)
      return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })
    }

    return NextResponse.json(newBlock)
  } catch (error) {
    console.error('Unexpected error in blocks POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
