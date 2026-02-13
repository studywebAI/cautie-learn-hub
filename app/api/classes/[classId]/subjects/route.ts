import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

type SubjectCreateRequest = {
  title: string;
  class_label?: string;
  cover_type?: string;
  cover_image_url?: string;
  ai_icon_seed?: string;
}

export async function GET(req: Request, { params }: { params: { classId: string } }) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const resolvedParams = await params;
    const { classId } = resolvedParams;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch subjects for the class through class_subjects join table
    const { data, error } = await (supabase as any)
      .from('class_subjects')
      .select('subjects(*)')
      .eq('class_id', classId)
      .order('created_at');

    if (error) {
      return NextResponse.json({ error: `Supabase error fetching subjects: ${error.message}` }, { status: 500 });
    }

    // Extract subjects
    const subjects = (data || []).map((item: any) => item.subjects).filter(Boolean);
    
    // Enrich subjects with chapters, paragraphs, and assignments
    const enrichedSubjects = await Promise.all(subjects.map(async (subject: any) => {
      // Fetch chapters
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id, title, order_index')
        .eq('subject_id', subject.id)
        .order('order_index', { ascending: true });

      if (!chapters || chapters.length === 0) {
        return { ...subject, chapters: [] };
      }

      // Fetch paragraphs for all chapters
      const chapterIds = chapters.map((c: any) => c.id);
      const { data: paragraphs } = await supabase
        .from('paragraphs')
        .select('id, title, paragraph_number, chapter_id')
        .in('chapter_id', chapterIds)
        .order('paragraph_number', { ascending: true });

      // Fetch assignments for all paragraphs
      const paragraphIds = (paragraphs || []).map((p: any) => p.id);
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, title, assignment_index, paragraph_id')
        .in('paragraph_id', paragraphIds)
        .order('assignment_index', { ascending: true });

      // Build hierarchy
      const chaptersWithParagraphs = chapters.map((chapter: any) => {
        const chapterParagraphs = paragraphs?.filter((p: any) => p.chapter_id === chapter.id) || [];
        const paragraphsWithAssignments = chapterParagraphs.map((paragraph: any) => {
          const paragraphAssignments = assignments?.filter((a: any) => a.paragraph_id === paragraph.id) || [];
          return { ...paragraph, assignments: paragraphAssignments };
        });
        return { ...chapter, paragraphs: paragraphsWithAssignments };
      });

      return { ...subject, chapters: chaptersWithParagraphs };
    }));

    return NextResponse.json(enrichedSubjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json({ error: 'Internal server error while fetching subjects' }, { status: 500 });
  }
}
