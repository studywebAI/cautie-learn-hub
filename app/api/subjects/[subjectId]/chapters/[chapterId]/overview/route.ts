import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

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
  try {
    const { subjectId, chapterId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    const subjectAccess = await canAccessSubject(supabase, user.id, subjectId);
    if (!subjectAccess.allowed || !subjectAccess.subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const { data: chapter } = await (supabase as any)
      .from('chapters')
      .select('id, title, chapter_number')
      .eq('id', chapterId)
      .eq('subject_id', subjectId)
      .maybeSingle();
    if (!chapter) {
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

    return NextResponse.json({
      subject: {
        id: subjectAccess.subject.id,
        title: subjectAccess.subject.title || subjectAccess.subject.name,
      },
      chapter,
      adjacentChapters,
      paragraphs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
