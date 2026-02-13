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

    // Check if user has access to this class (owner or member)
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, owner_id')
      .eq('id', classId)
      .maybeSingle();

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const isOwner = classData.owner_id === user.id;
    
    // If not owner, check if user is a member
    let isMember = false;
    if (!isOwner) {
      const { data: memberData } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .maybeSingle();
      isMember = !!memberData;
    }

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Forbidden - you do not have access to this class' }, { status: 403 });
    }

    // Fetch subjects for the class directly (subjects have class_id column)
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('class_id', classId)
      .order('created_at');

    if (error) {
      console.error(`Failed to fetch subjects for class ${classId}:`, error);
      return NextResponse.json({ error: `Supabase error fetching subjects: ${error.message}` }, { status: 500 });
    }

    const subjects = data || [];
    console.log(`Found ${subjects.length} subjects for class ${classId}`);
    
    // Enrich subjects with chapters, paragraphs, and assignments
    const enrichedSubjects = await Promise.all(subjects.map(async (subject: any) => {
      // Fetch chapters
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id, title, chapter_number')
        .eq('subject_id', subject.id)
        .order('chapter_number', { ascending: true });

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
