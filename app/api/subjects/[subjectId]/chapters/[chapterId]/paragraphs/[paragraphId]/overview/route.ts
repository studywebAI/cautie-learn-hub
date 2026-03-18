import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function getLetterIndex(index: number): string {
  if (index < 26) return String.fromCharCode(97 + index);
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
}

async function canAccessSubject(supabase: any, userId: string, subjectId: string, isTeacher: boolean) {
  const { data: subject } = await (supabase as any)
    .from('subjects')
    .select('id, user_id, class_id')
    .eq('id', subjectId)
    .maybeSingle();

  if (!subject) return false;

  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('user_id', userId);
  const classIds = (memberships || []).map((m: any) => m.class_id).filter(Boolean);

  if (isTeacher) {
    if (subject.user_id === userId) return true;
    if (subject.class_id && classIds.includes(subject.class_id)) return true;
  } else if (subject.class_id && classIds.includes(subject.class_id)) {
    return true;
  }

  if (classIds.length > 0) {
    const { data: links } = await (supabase as any)
      .from('class_subjects')
      .select('class_id')
      .eq('subject_id', subjectId)
      .in('class_id', classIds)
      .limit(1);
    if (links && links.length > 0) return true;
  }

  return false;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  try {
    const { subjectId, chapterId, paragraphId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const profileResult = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle();
    const isTeacher = profileResult.data?.subscription_type === 'teacher';
    const hasAccess = await canAccessSubject(supabase, user.id, subjectId, isTeacher);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const [chapterCheck, paragraphResult, paragraphListResult, assignmentsResult] = await Promise.all([
      (supabase as any)
        .from('chapters')
        .select('id')
        .eq('id', chapterId)
        .eq('subject_id', subjectId)
        .maybeSingle(),
      (supabase as any)
        .from('paragraphs')
        .select('id, title, paragraph_number, chapter_id')
        .eq('id', paragraphId)
        .eq('chapter_id', chapterId)
        .maybeSingle(),
      (supabase as any)
        .from('paragraphs')
        .select('id, title, paragraph_number')
        .eq('chapter_id', chapterId)
        .order('paragraph_number', { ascending: true }),
      supabase
        .from('assignments')
        .select('*')
        .eq('paragraph_id', paragraphId)
        .order('assignment_index', { ascending: true }),
    ]);

    if (!chapterCheck.data) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }
    if (!paragraphResult.data) {
      return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 });
    }

    const assignments = assignmentsResult.data || [];
    const assignmentIds = assignments.map((assignment: any) => assignment.id).filter(Boolean);
    let blocksByAssignment = new Map<string, number>();
    let answersByAssignment = new Map<string, { total: number; correct: number }>();

    if (assignmentIds.length > 0) {
      const { data: blockRows } = await supabase
        .from('blocks')
        .select('assignment_id')
        .in('assignment_id', assignmentIds);

      blocksByAssignment = (blockRows || []).reduce((acc: Map<string, number>, row: any) => {
        const assignmentId = row.assignment_id as string;
        if (!assignmentId) return acc;
        acc.set(assignmentId, (acc.get(assignmentId) || 0) + 1);
        return acc;
      }, new Map<string, number>());

      const { data: answerRows } = await supabase
        .from('student_answers')
        .select('assignment_id, is_correct')
        .eq('student_id', user.id)
        .in('assignment_id', assignmentIds);

      answersByAssignment = (answerRows || []).reduce(
        (acc: Map<string, { total: number; correct: number }>, row: any) => {
          const assignmentId = row.assignment_id as string;
          if (!assignmentId) return acc;
          const previous = acc.get(assignmentId) || { total: 0, correct: 0 };
          acc.set(assignmentId, {
            total: previous.total + 1,
            correct: previous.correct + (row.is_correct === true ? 1 : 0),
          });
          return acc;
        },
        new Map<string, { total: number; correct: number }>()
      );
    }

    const transformedAssignments = assignments.map((assignment: any) => {
      const totalBlocks = blocksByAssignment.get(assignment.id) || 0;
      const answerStats = answersByAssignment.get(assignment.id) || { total: 0, correct: 0 };
      return {
        ...assignment,
        letter_index: assignment.letter_index || getLetterIndex(assignment.assignment_index || 0),
        block_count: totalBlocks,
        progress_percent: totalBlocks > 0 ? Math.ceil((answerStats.total / totalBlocks) * 100) : 0,
        correct_percent: totalBlocks > 0 ? Math.ceil((answerStats.correct / totalBlocks) * 100) : 0,
      };
    });

    return NextResponse.json({
      paragraph: paragraphResult.data,
      allParagraphs: paragraphListResult.data || [],
      assignments: transformedAssignments,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
