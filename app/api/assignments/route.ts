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
        
        // Get assignments through class_subjects join table
        const { data: teacherAssignments, error: assignmentsError } = await supabase
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
                      name
                    )
                  )
                )
              )
            )
          `)
          .in('paragraphs.chapters.subjects.class_subjects.classes.id', classIds)

        if (assignmentsError) {
          console.error('Error fetching teacher assignments:', assignmentsError)
        } else {
          assignments = teacherAssignments || []
        }
      }
    } else {
      // Students see assignments from classes they're members of
      const { data: studentAssignments, error } = await (supabase as any)
        .from('class_members')
        .select(`
          classes!inner(
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
        // Flatten the nested structure
        assignments = studentAssignments?.flatMap((member: any) =>
          member.classes?.subjects?.flatMap((subject: any) =>
            subject.chapters?.flatMap((chapter: any) =>
              chapter.paragraphs?.flatMap((paragraph: any) =>
                paragraph.assignments || []
              ) || []
            ) || []
          ) || []
        ) || []
      }
    }

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

