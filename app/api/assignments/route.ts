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
      // Get all subjects that belong to the teacher's classes
      const { data: teacherClasses, error: classesError } = await supabase
        .from('classes')
        .select('id')
        .eq('owner_id', user.id)

      if (classesError) {
        console.error('Error fetching teacher classes:', classesError)
      } else if (teacherClasses && teacherClasses.length > 0) {
        const classIds = teacherClasses.map((c: any) => c.id)
        
        // Fetch assignments with paragraphs (through hierarchical structure)
        const { data: hierarchicalAssignments, error: hierarchicalError } = await supabase
          .from('assignments')
          .select(`
            *,
            paragraphs!inner(
              title,
              chapters!inner(
                title,
                subjects!inner(
                  title,
                  class_subjects(
                    classes!inner(
                      id,
                      name
                    )
                  )
                )
              )
            )
          `)
          .in('paragraphs.chapters.subjects.class_subjects.classes.id', classIds)

        // Also fetch assignments that are directly linked to a class (paragraph_id is null)
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
          .is('paragraph_id', null)

        if (hierarchicalError) {
          console.error('Error fetching hierarchical assignments:', hierarchicalError)
        }
        if (directError) {
          console.error('Error fetching direct assignments:', directError)
        }
        
        // Process hierarchical assignments to extract class_id and chapter_id
        const processedHierarchical = (hierarchicalAssignments || []).map((assignment: any) => {
          // Extract class_id from the nested structure
          const classSubject = assignment.paragraphs?.chapters?.subjects?.class_subjects?.[0];
          const classInfo = classSubject?.classes;
          const chapterId = assignment.paragraphs?.chapters?.id;
          if (classInfo) {
            return {
              ...assignment,
              class_id: classInfo.id,
              class_name: classInfo.name,
              chapter_id: chapterId,
            };
          }
          return assignment;
        });
        
        // Process direct assignments to add class_id and class_name
        const processedDirect = (directAssignments || []).map((assignment: any) => ({
          ...assignment,
          class_id: assignment.classes?.id,
          class_name: assignment.classes?.name,
        }));
        
        assignments = [...processedHierarchical, ...processedDirect]
        
        // DEBUG: Log teacher assignments
        console.log(`[Assignments API] Teacher: Returning ${assignments.length} assignments`);
        assignments.forEach((a, i) => {
          console.log(`  ${i}: ${a.title} - class_id: ${a.class_id}, scheduled_start_at: ${a.scheduled_start_at}`);
        });
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
        
        // Fetch hierarchical assignments (through subjects/chapters/paragraphs)
        const { data: studentAssignments, error } = await (supabase as any)
          .from('class_members')
          .select(`
            classes!inner(
              id,
              name,
              subjects(
                chapters(
                  paragraphs(
                    assignments(*)
                  )
                )
              )
            )
          `)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error fetching student assignments:', error)
        } else {
          // Flatten the nested structure and extract class_id
          assignments = studentAssignments?.flatMap((member: any) =>
            member.classes?.subjects?.flatMap((subject: any) =>
              subject.chapters?.flatMap((chapter: any) =>
                chapter.paragraphs?.flatMap((paragraph: any) =>
                  (paragraph.assignments || []).map((assignment: any) => ({
                    ...assignment,
                    class_id: member.classes.id,
                    class_name: member.classes.name,
                    chapter_id: chapter.id,
                  }))
                ) || []
              ) || []
            ) || []
          ) || []
        }

        // Also fetch direct class assignments (paragraph_id is null)
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
          .is('paragraph_id', null)

        if (directError) {
          console.error('Error fetching direct class assignments:', directError)
        } else {
          // Add class_id and class_name to direct assignments
          const processedDirect = (directAssignments || []).map((assignment: any) => ({
            ...assignment,
            class_id: assignment.classes?.id,
            class_name: assignment.classes?.name,
          }));
          assignments = [...assignments, ...processedDirect]
        }
      } else {
        console.log('Student is not a member of any classes')
      }
    }

    // DEBUG: Log assignments before returning
    console.log(`[Assignments API] Returning ${assignments.length} assignments for user ${user.id} (role: ${userRole})`);
    assignments.forEach((a, i) => {
      console.log(`  ${i}: ${a.title} - class_id: ${a.class_id}, scheduled_start_at: ${a.scheduled_start_at}`);
    });

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

