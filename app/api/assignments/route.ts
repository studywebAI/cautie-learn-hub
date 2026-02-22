import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'

import { createAssignmentSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'


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

    // Use subscription_type as the single source of truth (role column removed)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()

    const userRole = profile?.subscription_type || 'student'

    let assignments: any[] = []

    if (userRole === 'teacher') {
      // Teachers see assignments from ALL their classes (owned OR member)
      // Get classes owned by teacher
      const { data: ownedClasses } = await supabase
        .from('classes')
        .select('id, name')
        .eq('owner_id', user.id)

      // Get classes where teacher is a member
      const { data: memberClasses } = await supabase
        .from('class_members')
        .select('class_id, classes!inner(id, name)')
        .eq('user_id', user.id)
        .in('role', ['teacher', 'management'])

      // Combine all class IDs
      const ownedIds = (ownedClasses || []).map((c: any) => c.id);
      const memberIds = (memberClasses || []).map((m: any) => m.classes?.id).filter(Boolean);
      const allClassIds = [...new Set([...ownedIds, ...memberIds])];

      if (allClassIds.length > 0) {
        // Fetch hierarchical assignments
        const { data: classesWithAssignments } = await supabase
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
          .in('id', allClassIds);

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

        // Fetch direct class assignments
        const { data: directAssignments } = await supabase
          .from('assignments')
          .select(`*, classes!inner(id, name)`)
          .in('class_id', allClassIds)
          .is('paragraph_id', null);

        const processedDirect = (directAssignments || []).map((a: any) => ({
          ...a,
          class_id: a.classes?.id,
          class_name: a.classes?.name,
        }));
        assignments = [...assignments, ...processedDirect];
      }
    } else {
      // Students see assignments from classes they're members of
      const { data: classMembers } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)

      const studentClassIds = (classMembers || []).map((cm: any) => cm.class_id)

      if (studentClassIds.length > 0) {
        // Fetch hierarchical assignments
        const { data: classesWithAssignments } = await supabase
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

        // Fetch direct class assignments
        const { data: directAssignments } = await supabase
          .from('assignments')
          .select(`*, classes!inner(id, name)`)
          .in('class_id', studentClassIds)
          .is('paragraph_id', null);

        const processedDirect = (directAssignments || []).map((a: any) => ({
          ...a,
          class_id: a.classes?.id,
          class_name: a.classes?.name,
        }));
        assignments = [...assignments, ...processedDirect];
      }
    }

    // Sort by scheduled_start_at
    assignments.sort((a, b) => {
      const dateA = a.scheduled_start_at ? new Date(a.scheduled_start_at).getTime() : Infinity;
      const dateB = b.scheduled_start_at ? new Date(b.scheduled_start_at).getTime() : Infinity;
      return dateA - dateB;
    });

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error in assignments GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new assignment
export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, createAssignmentSchema);
    if ('error' in validation) {
      return validation.error;
    }
    const { title, paragraph_id, class_id, assignment_index, type, scheduled_start_at, scheduled_end_at, answers_enabled, description, linked_content } = validation.data;

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use subscription_type as the single source of truth (role column removed)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()

    const userRole = profile?.subscription_type || 'student'

    if (userRole !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create assignments' }, { status: 403 })
    }

    if (paragraph_id) {
      const { data: paragraph } = await (supabase as any)
        .from('paragraphs')
        .select('id, chapters!inner(id, subjects!inner(id, user_id, class_id))')
        .eq('id', paragraph_id)
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
      .eq('paragraph_id', paragraph_id)
      .order('assignment_index', { ascending: false })
      .limit(1)

    const nextIndex = existingAssignments && existingAssignments.length > 0
      ? (existingAssignments[0].assignment_index ?? -1) + 1
      : 0

    const { data: assignment, error: insertError } = await (supabase
      .from('assignments') as any)
      .insert({
        paragraph_id: paragraph_id,
        assignment_index: nextIndex,
        title: title?.trim() || 'Untitled Assignment',
        answers_enabled: answers_enabled ?? false,
        scheduled_start_at: scheduled_start_at,
        scheduled_end_at: scheduled_end_at,
        scheduled_answer_release_at: scheduled_end_at,
        description: description,
        linked_content: linked_content,
        type: type || 'homework',
        class_id: class_id,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

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
