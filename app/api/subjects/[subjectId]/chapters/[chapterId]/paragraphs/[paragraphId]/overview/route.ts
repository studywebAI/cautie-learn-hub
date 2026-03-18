import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { makeRequestId, subjectsError, subjectsLog, subjectsWarn } from '@/lib/subjects-log';

export const dynamic = 'force-dynamic';

function getLetterIndex(index: number): string {
  if (index < 26) return String.fromCharCode(97 + index);
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
}

async function canAccessSubject(supabase: any, userId: string, subjectId: string) {
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

  if (subject.class_id && classIds.includes(subject.class_id)) return true;

  if (classIds.length > 0) {
    const { data: links } = await (supabase as any)
      .from('class_subjects')
      .select('class_id')
      .eq('subject_id', subjectId)
      .in('class_id', classIds)
      .limit(1);
    if (links && links.length > 0) return true;
  }

  if (subject.user_id === userId) return true;

  return false;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  const requestId = makeRequestId('paragraph_overview');
  try {
    const { subjectId, chapterId, paragraphId } = await params;
    subjectsLog('paragraph-overview', requestId, 'request.start', { subjectId, chapterId, paragraphId });
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      subjectsWarn('paragraph-overview', requestId, 'auth.unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    subjectsLog('paragraph-overview', requestId, 'auth.ok', { userId: user.id });
    const profileResult = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle();
    const isTeacher = profileResult.data?.subscription_type === 'teacher';
    const hasAccess = await canAccessSubject(supabase, user.id, subjectId);
    subjectsLog('paragraph-overview', requestId, 'profile.loaded', {
      isTeacher,
      subscriptionType: profileResult.data?.subscription_type || null,
    });
    if (!hasAccess) {
      subjectsWarn('paragraph-overview', requestId, 'access.denied.subject', { subjectId, userId: user.id });
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const { data: paragraphResult } = await (supabase as any)
      .from('paragraphs')
      .select('id, title, paragraph_number, chapter_id')
      .eq('id', paragraphId)
      .maybeSingle();

    if (!paragraphResult) {
      subjectsWarn('paragraph-overview', requestId, 'access.denied.paragraph', { paragraphId, chapterId });
      return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 });
    }

    const canonicalChapterId = paragraphResult.chapter_id as string;
    const { data: chapterCheck } = await (supabase as any)
      .from('chapters')
      .select('id, subject_id')
      .eq('id', canonicalChapterId)
      .maybeSingle();

    if (!chapterCheck || chapterCheck.subject_id !== subjectId) {
      subjectsWarn('paragraph-overview', requestId, 'access.denied.chapter', {
        requestedChapterId: chapterId,
        resolvedChapterId: canonicalChapterId,
        subjectId,
      });
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const [paragraphListResult, assignmentsResult] = await Promise.all([
      (supabase as any)
        .from('paragraphs')
        .select('id, title, paragraph_number')
        .eq('chapter_id', canonicalChapterId)
        .order('paragraph_number', { ascending: true }),
      supabase
        .from('assignments')
        .select('*')
        .eq('paragraph_id', paragraphId)
        .order('assignment_index', { ascending: true }),
    ]);
    subjectsLog('paragraph-overview', requestId, 'hierarchy.valid', {
      chapterId,
      paragraphId,
      canonicalChapterId,
      allParagraphCount: paragraphListResult.data?.length || 0,
    });

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

    const response = {
      paragraph: paragraphResult,
      allParagraphs: paragraphListResult.data || [],
      assignments: transformedAssignments,
      canonicalChapterId,
    };
    subjectsLog('paragraph-overview', requestId, 'response.ready', {
      assignmentCount: response.assignments.length,
      paragraphCount: response.allParagraphs.length,
    });
    return NextResponse.json(response);
  } catch (error: any) {
    subjectsError('paragraph-overview', requestId, 'request.error', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || null,
    });
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
