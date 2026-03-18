import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const subjectResponse = await fetch(new URL(`/api/subjects/${subjectId}`, request.url), {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
    });

    if (!subjectResponse.ok) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: subjectResponse.status }
      );
    }

    const subject = await subjectResponse.json();

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle();
    const isTeacher = profile?.subscription_type === 'teacher';

    const { data: chapters, error: chapterError } = await (supabase as any)
      .from('chapters')
      .select('id, title, chapter_number, description')
      .eq('subject_id', subjectId)
      .order('chapter_number', { ascending: true });

    if (chapterError) {
      return NextResponse.json({ error: chapterError.message }, { status: 500 });
    }

    const chapterIds = (chapters || []).map((chapter: any) => chapter.id).filter(Boolean);

    const { data: paragraphRows, error: paragraphError } =
      chapterIds.length > 0
        ? await (supabase as any)
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
            .order('paragraph_number', { ascending: true })
        : { data: [], error: null };

    if (paragraphError) {
      return NextResponse.json({ error: paragraphError.message }, { status: 500 });
    }

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

    return NextResponse.json({
      subject: {
        id: subject.id,
        name: subject.title || subject.name,
        description: subject.description || null,
      },
      chapters: chaptersWithParagraphs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
