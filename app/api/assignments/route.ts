import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'


export const dynamic = 'force-dynamic'

// GET assignments for current user
export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const userRole = profile?.role || 'student'

    let assignments: any[] = []

    if (userRole === 'teacher') {
      // Teachers see assignments from their classes' subjects
      // Get all classes owned by the teacher
      const { data: teacherClasses, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('owner_id', user.id)

      if (classesError) {
        console.error('Error fetching teacher classes:', classesError)
      } else if (teacherClasses && teacherClasses.length > 0) {
        const classIds = teacherClasses.map((c: any) => c.id)
        
        // Fetch hierarchical assignments through classes -> subjects -> chapters -> paragraphs -> assignments
        const { data: classesWithAssignments, error: hierarchicalError } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            subjects(
              chapters(
                paragraphs(
                  assignments(*)
                )
              )
            )
          `)
          .in('id', classIds);

        if (hierarchicalError) {
          console.error('Error fetching hierarchical assignments for teacher:', hierarchicalError);
        } else {
          const hierarchical = (classesWithAssignments || []).flatMap((cls: any) =>
            (cls.subjects || []).flatMap((subject: any) =>
              (subject.chapters || []).flatMap((chapter: any) =>
                (chapter.paragraphs || []).flatMap((paragraph: any) =>
                  (paragraph.assignments || []).map((assignment: any) => ({
                    ...assignment,
                    class_id: cls.id,
                    class_name: cls.name,
                    chapter_id: chapter.id,
                  }))
                ) || []
              ) || []
            ) || []
          );
          assignments = [...assignments, ...hierarchical];
        }

        // Fetch direct class assignments (paragraph_id is null)
        const { data: directAssignments, error: directError } = await supabase
          .from('assignments')
          .select(`
            *,
            classes!inner(
              id,
              name
            )
          `)
          .in('class_id', classIds)
          .is('paragraph_id', null);

        if (directError) {
          console.error('Error fetching direct assignments for teacher:', directError);
        } else {
          const processedDirect = (directAssignments || []).map((assignment: any) => ({
            ...assignment,
            class_id: assignment.classes?.id,
            class_name: assignment.classes?.name,
          }));
          assignments = [...assignments, ...processedDirect];
        }

        // Sort combined assignments by scheduled_start_at
        assignments.sort((a, b) => {
          const dateA = a.scheduled_start_at ? new Date(a.scheduled_start_at).getTime() : Infinity;
          const dateB = b.scheduled_start_at ? new Date(b.scheduled_start_at).getTime() : Infinity;
          return dateA - dateB;
        });

        // Removed debug logs
      }
    } else {
      // Students see assignments from classes they're members of
      // First get the classes the student is a member of
      const { data: classMembers, error: membersError } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)

      if (membersError) {
        console.error('Error fetching student class members:', membersError)
      } else if (classMembers && classMembers.length > 0) {
        const studentClassIds = classMembers.map((cm: any) => cm.class_id)
        
        // Fetch classes with full details including subjects, chapters, paragraphs, and assignments
        const { data: classesWithAssignments, error: hierarchicalError } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            subjects(
              chapters(
                paragraphs(
                  assignments(*)
                )
              )
            )
          `)
          .in('id', studentClassIds);

        if (hierarchicalError) {
          console.error('Error fetching hierarchical assignments for student:', hierarchicalError);
        } else {
          const hierarchical = (classesWithAssignments || []).flatMap((cls: any) =>
            (cls.subjects || []).flatMap((subject: any) =>
              (subject.chapters || []).flatMap((chapter: any) =>
                (chapter.paragraphs || []).flatMap((paragraph: any) =>
                  (paragraph.assignments || []).map((assignment: any) => ({
                    ...assignment,
                    class_id: cls.id,
                    class_name: cls.name,
                    chapter_id: chapter.id,
                  }))
                ) || []
              ) || []
            ) || []
          );
          assignments = [...assignments, ...hierarchical];
        }

        // Fetch direct class assignments (paragraph_id is null)
        const { data: directAssignments, error: directError } = await supabase
          .from('assignments')
          .select(`
            *,
            classes!inner(
              id,
              name
            )
          `)
          .in('class_id', studentClassIds)
          .is('paragraph_id', null);

        if (directError) {
          console.error('Error fetching direct class assignments for student:', directError);
        } else {
          const processedDirect = (directAssignments || []).map((assignment: any) => ({
            ...assignment,
            class_id: assignment.classes?.id,
            class_name: assignment.classes?.name,
          }));
          assignments = [...assignments, ...processedDirect];
        }

        // Sort combined assignments by scheduled_start_at
        assignments.sort((a, b) => {
          const dateA = a.scheduled_start_at ? new Date(a.scheduled_start_at).getTime() : Infinity;
          const dateB = b.scheduled_start_at ? new Date(b.scheduled_start_at).getTime() : Infinity;
          return dateA - dateB;
        });
      } else {
        console.log('Student is not a member of any classes')
      }
    }

    // Removed debug logs

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error in assignments GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new assignment (also supports linking to existing paragraphs/blocks)
export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const json = await request.json()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const userRole = profile?.role || 'student'

    // Allow assignment creation if:
    // 1. User is a teacher and creating for their own content
    // 2. User provides paragraph_id and has access through class membership
    if (userRole !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create assignments' }, { status: 403 })
    }

    // Verify paragraph exists and user has access
    if (json.paragraph_id) {
      const { data: paragraph } = await (supabase as any)
        .from('paragraphs')
        .select('id, chapters!inner(id, subjects!inner(id, user_id, class_id))')
        .eq('id', json.paragraph_id)
        .single()

      if (!paragraph) {
        return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 })
      }

      const chapter = paragraph.chapters
      const subject = chapter?.subjects

      if (subject?.user_id !== user.id) {
        return NextResponse.json({ error: 'Access denied to this paragraph' }, { status: 403 })
      }
    }

    // Get max assignment index for this paragraph
    const { data: existingAssignments } = await supabase
      .from('assignments')
      .select('assignment_index')
      .eq('paragraph_id', json.paragraph_id)
      .order('assignment_index', { ascending: false })
      .limit(1)

    const nextIndex = existingAssignments && existingAssignments.length > 0
      ? (existingAssignments[0].assignment_index ?? -1) + 1
      : 0

    // Create the assignment with scheduling information
    const { data: assignment, error: insertError } = await (supabase
      .from('assignments') as any)
      .insert({
        paragraph_id: json.paragraph_id,
        assignment_index: nextIndex,
        title: json.title?.trim() || 'Untitled Assignment',
        answers_enabled: json.answers_enabled ?? false,
        scheduled_start_at: json.scheduled_start_at,
        scheduled_end_at: json.scheduled_end_at,
        scheduled_answer_release_at: json.scheduled_answer_release_at,
        description: json.description,
        linked_content: json.linked_content,
        type: json.type || 'homework', // Store the assignment type
        class_id: json.class_id, // Include class_id for direct class assignments
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Helper to get letter index
    const getLetterIndex = (index: number): string => {
      if (index < 26) return String.fromCharCode(97 + index);
      const first = Math.floor(index / 26) - 1;
      const second = index % 26;
      return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
    };

    return NextResponse.json({
      ...assignment,
      letter_index: getLetterIndex(assignment.assignment_index),
      block_count: 0,
      progress_percent: 0,
      correct_percent: 0,
    })
  } catch (error) {
    console.error('Error creating assignment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

