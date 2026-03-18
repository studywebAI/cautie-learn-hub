import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string }> }
) {
  try {
    const { subjectId, chapterId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const chapterResponse = await fetch(
      new URL(`/api/subjects/${subjectId}/chapters/${chapterId}`, request.url),
      {
        headers: { cookie: request.headers.get('cookie') || '' },
        cache: 'no-store',
      }
    );

    if (!chapterResponse.ok) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: chapterResponse.status });
    }

    const [subjectResponse, profileResponse, chaptersResponse, paragraphsResponse] = await Promise.all([
      fetch(new URL(`/api/subjects/${subjectId}`, request.url), {
        headers: { cookie: request.headers.get('cookie') || '' },
        cache: 'no-store',
      }),
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

    const chapter = await chapterResponse.json();
    const subject = subjectResponse.ok ? await subjectResponse.json() : null;
    const isTeacher = profileResponse.data?.subscription_type === 'teacher';

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

    return NextResponse.json({
      subject: subject
        ? {
            id: subject.id,
            title: subject.title || subject.name,
          }
        : null,
      chapter,
      adjacentChapters,
      paragraphs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
