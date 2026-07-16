import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function userHasSubjectAccess(supabase: any, userId: string, subjectId: string): Promise<boolean> {
  const { data: subject } = await supabase
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

  const { data: links } = await supabase
    .from('class_subjects')
    .select('subject_id')
    .eq('subject_id', subjectId)
    .in('class_id', classIds)
    .limit(1);
  return !!(links && links.length > 0);
}

// POST — move an assignment to a different paragraph, possibly under a
// different chapter/subject entirely (docs/subjects-feature-brainstorm.md
// section H, Settings tab "Verplaats naar..."). Teacher-only, requires
// access to both the source and target subject.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { targetSubjectId, targetChapterId, targetParagraphId } = await request.json();

    if (!targetSubjectId || !targetChapterId || !targetParagraphId) {
      return NextResponse.json({ error: 'targetSubjectId, targetChapterId and targetParagraphId are required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.subscription_type !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [hasSourceAccess, hasTargetAccess] = await Promise.all([
      userHasSubjectAccess(supabase, user.id, resolvedParams.subjectId),
      userHasSubjectAccess(supabase, user.id, targetSubjectId),
    ]);
    if (!hasSourceAccess || !hasTargetAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: assignment } = await (supabase as any)
      .from('assignments')
      .select('id, paragraph_id')
      .eq('id', resolvedParams.assignmentId)
      .eq('paragraph_id', resolvedParams.paragraphId)
      .maybeSingle();
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Validate the target paragraph really belongs to the target chapter/subject.
    const { data: targetParagraph } = await (supabase as any)
      .from('paragraphs')
      .select('id, chapter_id, chapters!inner(id, subject_id, subjects!inner(id, class_id))')
      .eq('id', targetParagraphId)
      .eq('chapter_id', targetChapterId)
      .maybeSingle();
    if (!targetParagraph || (targetParagraph as any).chapters?.subject_id !== targetSubjectId) {
      return NextResponse.json({ error: 'Invalid target paragraph' }, { status: 400 });
    }

    const targetClassId = (targetParagraph as any).chapters?.subjects?.class_id || null;

    const { data: existingAssignments } = await supabase
      .from('assignments')
      .select('assignment_index')
      .eq('paragraph_id', targetParagraphId)
      .order('assignment_index', { ascending: false })
      .limit(1);
    const nextIndex = existingAssignments && existingAssignments.length > 0
      ? (existingAssignments[0].assignment_index ?? -1) + 1
      : 0;

    const { error: updateError } = await (supabase as any)
      .from('assignments')
      .update({
        paragraph_id: targetParagraphId,
        class_id: targetClassId,
        assignment_index: nextIndex,
      })
      .eq('id', resolvedParams.assignmentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      redirectTo: `/subjects/${targetSubjectId}/chapters/${targetChapterId}/paragraphs/${targetParagraphId}/assignments/${resolvedParams.assignmentId}`,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
