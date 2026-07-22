import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { makeRequestId, subjectsError, subjectsLog, subjectsWarn } from '@/lib/subjects-log';
import { canAccessSubject } from '@/lib/auth/subject-permissions';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string }> }
) {
  const requestId = makeRequestId('chapter_overview');
  try {
    const { subjectId, chapterId } = await params;
    subjectsLog('chapter-overview', requestId, 'request.start', { subjectId, chapterId });
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      subjectsWarn('chapter-overview', requestId, 'auth.unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    subjectsLog('chapter-overview', requestId, 'auth.ok', { userId: user.id });

    const [profileResponse, chaptersResponse, paragraphsResponse] = await Promise.all([
      supabase.from('profiles').select('subscription_type').eq('id', user.id).maybeSingle(),
      (supabase as any)
        .from('chapters')
        .select('id, title, chapter_number')
        .eq('subject_id', subjectId)
        .order('chapter_number', { ascending: true }),
      (supabase as any)
        .from('paragraphs')
        .select(
          `
            id,
            title,
            paragraph_number,
            chapter_id,
            prerequisite_paragraph_id,
            progress_snapshots(
              student_id,
              completion_percent
            )
          `
        )
        .eq('chapter_id', chapterId)
        .order('paragraph_number', { ascending: true }),
    ]);

    const isTeacher = ['teacher', 'owner', 'admin', 'creator'].includes(String(profileResponse.data?.subscription_type || '').toLowerCase());
    subjectsLog('chapter-overview', requestId, 'profile.loaded', {
      isTeacher,
      subscriptionType: profileResponse.data?.subscription_type || null,
    });
    const subjectAccess = await canAccessSubject(supabase, user.id, subjectId);
    if ((subjectAccess as any).error) {
      subjectsError('chapter-overview', requestId, 'subject.query.error', {
        message: (subjectAccess as any).error,
      });
      return NextResponse.json({ error: 'Failed to fetch subject access' }, { status: 500 });
    }
    if (!subjectAccess.allowed || !subjectAccess.subject) {
      subjectsWarn('chapter-overview', requestId, 'access.denied.subject', { subjectId, userId: user.id });
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const { data: chapter } = await (supabase as any)
      .from('chapters')
      .select('id, title, chapter_number, is_tests_chapter')
      .eq('id', chapterId)
      .eq('subject_id', subjectId)
      .maybeSingle();
    if (!chapter) {
      subjectsWarn('chapter-overview', requestId, 'access.denied.chapter', { chapterId, subjectId });
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const chapters = chaptersResponse.data || [];
    const currentIndex = chapters.findIndex((row: any) => row.id === chapterId);
    const adjacentChapters = {
      prev: currentIndex > 0 ? chapters[currentIndex - 1] : undefined,
      next: currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : undefined,
    };

    const paragraphRows = paragraphsResponse.data || [];
    const paragraphIds = paragraphRows.map((row: any) => row.id).filter(Boolean);
    const assignmentCountByParagraph: Record<string, number> = {};
    if (paragraphIds.length > 0) {
      const { data: assignmentRows, error: assignmentError } = await supabase
        .from('assignments')
        .select('paragraph_id')
        .in('paragraph_id', paragraphIds);
      if (assignmentError) {
        subjectsWarn('chapter-overview', requestId, 'assignments.count.failed', {
          message: assignmentError.message,
        });
      } else {
        for (const row of (assignmentRows || [])) {
          const pid = (row as any).paragraph_id as string;
          if (!pid) continue;
          assignmentCountByParagraph[pid] = (assignmentCountByParagraph[pid] || 0) + 1;
        }
      }
    }

    // A paragraph is locked for students if its prerequisite (docs/subjects-
    // feature-brainstorm.md D15) isn't fully completed yet — same soft-gate
    // logic as the subject-level overview route.
    const progressById: Record<string, number> = {};
    for (const row of paragraphRows) {
      const progressRows = Array.isArray(row.progress_snapshots) ? row.progress_snapshots : [];
      const ownProgress = isTeacher ? null : progressRows.find((progress: any) => progress.student_id === user.id);
      progressById[row.id] = ownProgress?.completion_percent ?? 0;
    }

    const paragraphs = paragraphRows.map((row: any) => {
      const prerequisiteId = row.prerequisite_paragraph_id || null;
      const locked = !isTeacher && !!prerequisiteId && (progressById[prerequisiteId] ?? 0) < 100;
      return {
        id: row.id,
        title: row.title,
        paragraph_number: row.paragraph_number,
        completion_percent: progressById[row.id] ?? 0,
        assignment_count: assignmentCountByParagraph[row.id] || 0,
        prerequisite_paragraph_id: prerequisiteId,
        locked,
      };
    });

    const response = {
      subject: {
        id: subjectAccess.subject.id,
        title: subjectAccess.subject.title,
      },
      chapter,
      adjacentChapters,
      paragraphs,
    };
    subjectsLog('chapter-overview', requestId, 'response.ready', {
      chapterId: chapter.id,
      paragraphCount: paragraphs.length,
      hasPrev: Boolean(adjacentChapters.prev),
      hasNext: Boolean(adjacentChapters.next),
    });
    return NextResponse.json(response);
  } catch (error: any) {
    subjectsError('chapter-overview', requestId, 'request.error', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || null,
    });
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
