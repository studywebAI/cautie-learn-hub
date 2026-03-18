import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { makeRequestId, subjectsError, subjectsLog, subjectsWarn } from '@/lib/subjects-log';

export const dynamic = 'force-dynamic';

async function canAccessSubject(supabase: any, userId: string, subjectId: string) {
  const { data: subject } = await (supabase as any)
    .from('subjects')
    .select('id, title, name, description, user_id, class_id')
    .eq('id', subjectId)
    .maybeSingle();

  if (!subject) return { allowed: false, subject: null };

  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('user_id', userId);
  const classIds = (memberships || []).map((m: any) => m.class_id).filter(Boolean);

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

  if (subject.user_id === userId) return { allowed: true, subject };

  return { allowed: false, subject: null };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string }> }
) {
  const requestId = makeRequestId('chapter_overview');
  try {
    const { subjectId, chapterId } = await params;
    subjectsLog('chapter-overview', requestId, 'request.start', { subjectId, chapterId });
    const cookieStore = cookies();
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
            progress_snapshots(
              student_id,
              completion_percent
            )
          `
        )
        .eq('chapter_id', chapterId)
        .order('paragraph_number', { ascending: true }),
    ]);

    const isTeacher = profileResponse.data?.subscription_type === 'teacher';
    subjectsLog('chapter-overview', requestId, 'profile.loaded', {
      isTeacher,
      subscriptionType: profileResponse.data?.subscription_type || null,
    });
    const subjectAccess = await canAccessSubject(supabase, user.id, subjectId);
    if (!subjectAccess.allowed || !subjectAccess.subject) {
      subjectsWarn('chapter-overview', requestId, 'access.denied.subject', { subjectId, userId: user.id });
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const { data: chapter } = await (supabase as any)
      .from('chapters')
      .select('id, title, chapter_number')
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

    const paragraphs = (paragraphsResponse.data || []).map((row: any) => {
      const progressRows = Array.isArray(row.progress_snapshots) ? row.progress_snapshots : [];
      const ownProgress = isTeacher
        ? null
        : progressRows.find((progress: any) => progress.student_id === user.id);
      return {
        id: row.id,
        title: row.title,
        paragraph_number: row.paragraph_number,
        completion_percent: ownProgress?.completion_percent ?? 0,
      };
    });

    const response = {
      subject: {
        id: subjectAccess.subject.id,
        title: subjectAccess.subject.title || subjectAccess.subject.name,
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
