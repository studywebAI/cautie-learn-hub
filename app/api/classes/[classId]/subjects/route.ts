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

    // Strategy: Get subjects via BOTH direct class_id AND class_subjects join table
    // to support both linking methods that may exist in the database
    const [directSubjectsResult, joinSubjectsResult] = await Promise.all([
      // 1. Direct query: subjects with class_id = classId
      supabase.from('subjects').select('*').eq('class_id', classId).order('created_at'),
      
      // 2. Join query: subjects linked via class_subjects
      (supabase as any).from('class_subjects')
        .select('subjects(*)')
        .eq('class_id', classId)
    ]);

    const directSubjects = directSubjectsResult.data || [];
    const joinSubjects = (joinSubjectsResult.data || []).map((item: any) => item.subjects).filter(Boolean);
    
    // Combine and deduplicate by subject ID
    const subjectMap = new Map<string, any>();
    directSubjects.forEach((s: any) => subjectMap.set(s.id, s));
    joinSubjects.forEach((s: any) => {
      if (!subjectMap.has(s.id)) {
        subjectMap.set(s.id, s);
      }
    });
    
    const subjects = Array.from(subjectMap.values());
    
    console.log(`Found ${directSubjects.length} subjects via direct class_id`);
    console.log(`Found ${joinSubjects.length} subjects via class_subjects join`);
    console.log(`Total unique subjects: ${subjects.length}`);
    
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

export async function POST(req: Request, { params }: { params: { classId: string } }) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const resolvedParams = await params;
    const { classId } = resolvedParams;

    console.log(`[DEBUG] POST creating subject for classId: ${classId}`);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log(`[DEBUG] Unauthorized: ${userError?.message || 'no user'}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the class exists and user has permission
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, owner_id')
      .eq('id', classId)
      .maybeSingle();

    if (classError || !classData) {
      console.log(`[DEBUG] Class not found or error: ${classError?.message}`);
      return NextResponse.json({ error: 'Class not found or access denied' }, { status: 404 });
    }

    // Check if user is the class owner or a member
    const isOwner = classData.owner_id === user.id;
    const { data: membership } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle();

    const isMember = !!membership;

    if (!isOwner && !isMember) {
      console.log(`[DEBUG] User ${user.id} not authorized for class ${classId}`);
      return NextResponse.json({ error: 'Forbidden: You must be the class owner or a member' }, { status: 403 });
    }

    const json = await req.json();

    if (!json.title) {
      return NextResponse.json({
        error: 'Missing required field: title'
      }, { status: 400 });
    }

    // Create the subject with class_id directly set
    const { data: subjectData, error: subjectError } = await supabase
      .from('subjects')
      .insert([{
        title: json.title,
        description: json.description || null,
        class_id: classId,
        user_id: user.id,
        class_label: json.class_label || json.title,
        cover_type: json.cover_type || 'ai_icons',
        cover_image_url: json.cover_image_url || null,
        ai_icon_seed: json.ai_icon_seed || null,
      }])
      .select();

    if (subjectError) {
      console.error(`[DEBUG] Subject creation error:`, subjectError);
      return NextResponse.json({
        error: `Failed to create subject: ${subjectError.message}`
      }, { status: 500 });
    }

    if (!subjectData || subjectData.length === 0) {
      return NextResponse.json({
        error: 'Failed to create subject: No data returned'
      }, { status: 500 });
    }

    const newSubject = subjectData[0];

    console.log(`[DEBUG] Created subject ${newSubject.id} for class ${classId}`);

    // Return the created subject (without needing to link via class_subjects since class_id is already set)
    return NextResponse.json(newSubject, { status: 201 });
  } catch (error) {
    console.error('Error creating subject for class:', error);
    return NextResponse.json({ error: 'Internal server error while creating subject' }, { status: 500 });
  }
}
