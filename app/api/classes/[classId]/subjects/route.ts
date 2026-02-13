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

    console.log(`[DEBUG] API called with classId: ${classId}`);
    console.log(`[DEBUG] Full URL: ${req.url}`);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log(`[DEBUG] Unauthorized: ${userError?.message || 'no user'}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log(`[DEBUG] Authenticated user: ${user.id}`);
    console.log(`[DEBUG] Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

    // Fetch subjects directly using class_id (subjects have direct class_id foreign key)
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .eq('class_id', classId)
      .order('created_at');

    if (subjectsError) {
      console.error(`Failed to fetch subjects for class ${classId}:`, subjectsError);
      return NextResponse.json({ error: `Supabase error fetching subjects: ${subjectsError.message}` }, { status: 500 });
    }

    console.log(`Found ${subjects?.length || 0} subjects for class ${classId} via direct class_id`);
    
    // Enrich subjects with chapters, paragraphs, and assignments
    const enrichedSubjects = await Promise.all(subjects.map(async (subject: any) => {
      console.log(`Processing subject ${subject.id}: ${subject.title}`);
      
      // Fetch chapters
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id, title, chapter_number')
        .eq('subject_id', subject.id)
        .order('chapter_number', { ascending: true });

      console.log(`Subject ${subject.id} chapters:`, chapters?.length || 0);

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

    console.log('Returning enriched subjects:', JSON.stringify(enrichedSubjects, null, 2));
    return NextResponse.json(enrichedSubjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json({ error: 'Internal server error while fetching subjects' }, { status: 500 });
  }
}
