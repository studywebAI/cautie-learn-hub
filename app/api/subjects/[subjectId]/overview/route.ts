import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { makeRequestId, subjectsError, subjectsLog, subjectsWarn } from '@/lib/subjects-log';

export const dynamic = 'force-dynamic';

async function canAccessSubject(supabase: any, userId: string, subjectId: string) {
  const { data: subject, error } = await (supabase as any)
    .from('subjects')
    .select('id, title, description, user_id, class_id')
    .eq('id', subjectId)
    .maybeSingle();

  if (error) return { allowed: false, subject: null, error: error.message };
  if (!subject) return { allowed: false, subject: null };

  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('user_id', userId);
  const classIds = (memberships || []).map((m: any) => m.class_id).filter(Boolean);

  // Primary access model: any class member of a linked class can access.
  if (subject.class_id && classIds.includes(subject.class_id)) return { allowed: true, subject };

  if (classIds.length > 0) {
    const { data: links } = await (supabase as any)
      .from('class_subjects')
      .select('class_id')
      .eq('subject_id', subjectId)
      .in('class_id', classIds)
      .limit(1);
    if (links && links.length > 0) return { allowed: true, subject };
  }

  // Fallback for legacy/unlinked records.
  if (subject.user_id === userId) return { allowed: true, subject };

  return { allowed: false, subject: null };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const requestId = makeRequestId('subject_overview');
  try {
    const { subjectId } = await params;
    subjectsLog('subject-overview', requestId, 'request.start', {
      subjectId,
      url: request.url,
    });
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      subjectsWarn('subject-overview', requestId, 'auth.unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    subjectsLog('subject-overview', requestId, 'auth.ok', { userId: user.id });

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle();
    const isTeacher = profile?.subscription_type === 'teacher';
    subjectsLog('subject-overview', requestId, 'profile.loaded', {
      isTeacher,
      subscriptionType: profile?.subscription_type || null,
    });
    const subjectAccess = await canAccessSubject(supabase, user.id, subjectId);
    if ((subjectAccess as any).error) {
      subjectsError('subject-overview', requestId, 'subject.query.error', {
        message: (subjectAccess as any).error,
      });
      return NextResponse.json({ error: 'Failed to fetch subject access' }, { status: 500 });
    }
    if (!subjectAccess.allowed || !subjectAccess.subject) {
      subjectsWarn('subject-overview', requestId, 'access.denied', { subjectId, userId: user.id });
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    const subject = subjectAccess.subject;
    subjectsLog('subject-overview', requestId, 'access.allowed', {
      subjectId: subject.id,
      classId: subject.class_id ?? null,
      subjectUserId: subject.user_id ?? null,
    });

    const { data: chapters, error: chapterError } = await (supabase as any)
      .from('chapters')
      .select('id, title, chapter_number')
      .eq('subject_id', subjectId)
      .order('chapter_number', { ascending: true });

    if (chapterError) {
      subjectsError('subject-overview', requestId, 'chapters.query.error', {
        message: chapterError.message,
      });
      return NextResponse.json({ error: chapterError.message }, { status: 500 });
    }
    subjectsLog('subject-overview', requestId, 'chapters.query.ok', {
      chapterCount: chapters?.length || 0,
    });

    const chapterIds = (chapters || []).map((chapter: any) => chapter.id).filter(Boolean);

    let paragraphRows: any[] = [];
    if (chapterIds.length > 0) {
      const paragraphWithProgressResult = await (supabase as any)
        .from('paragraphs')
        .select(
          `
            id,
            title,
            paragraph_number,
            chapter_id,
            progress_snapshots(
              student_id,
              completion_percent
            )
          `
        )
        .in('chapter_id', chapterIds)
        .order('paragraph_number', { ascending: true });

      if (paragraphWithProgressResult.error) {
        subjectsWarn('subject-overview', requestId, 'paragraphs.query.with_progress.failed', {
          message: paragraphWithProgressResult.error.message,
        });
        const paragraphFallbackResult = await (supabase as any)
          .from('paragraphs')
          .select('id, title, paragraph_number, chapter_id')
          .in('chapter_id', chapterIds)
          .order('paragraph_number', { ascending: true });

        if (paragraphFallbackResult.error) {
          subjectsError('subject-overview', requestId, 'paragraphs.query.fallback.error', {
            message: paragraphFallbackResult.error.message,
          });
          return NextResponse.json({ error: paragraphFallbackResult.error.message }, { status: 500 });
        }

        paragraphRows = (paragraphFallbackResult.data || []).map((row: any) => ({
          ...row,
          progress_snapshots: [],
        }));
      } else {
        paragraphRows = paragraphWithProgressResult.data || [];
      }
    }
    subjectsLog('subject-overview', requestId, 'paragraphs.query.ok', {
      paragraphCount: paragraphRows.length || 0,
    });

    const paragraphsByChapter = (paragraphRows || []).reduce((acc: Record<string, any[]>, row: any) => {
      const chapterId = row.chapter_id as string;
      if (!chapterId) return acc;
      if (!acc[chapterId]) acc[chapterId] = [];
      const progressRows = Array.isArray(row.progress_snapshots) ? row.progress_snapshots : [];
      const ownProgress = isTeacher
        ? null
        : progressRows.find((progress: any) => progress.student_id === user.id);
      acc[chapterId].push({
        id: row.id,
        title: row.title,
        paragraph_number: row.paragraph_number,
        assignment_count: 0,
        answers_enabled: false,
        progress_percent: ownProgress?.completion_percent ?? 0,
      });
      return acc;
    }, {});

    const chaptersWithParagraphs = (chapters || []).map((chapter: any) => ({
      ...chapter,
      paragraphs: paragraphsByChapter[chapter.id] || [],
    }));

    const response = {
      subject: {
        id: subject.id,
        name: subject.title,
        description: subject.description || null,
      },
      chapters: chaptersWithParagraphs,
    };
    subjectsLog('subject-overview', requestId, 'response.ready', {
      chapterCount: response.chapters.length,
    });
    return NextResponse.json(response);
  } catch (error: any) {
    subjectsError('subject-overview', requestId, 'request.error', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || null,
    });
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
