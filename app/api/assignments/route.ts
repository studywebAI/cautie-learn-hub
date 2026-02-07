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
                  class_subjects!subjects_class_subjects_subject_id_fkey(
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

// POST disabled - use hierarchical system via subjects/chapters/paragraphs
export async function POST(request: Request) {
  return NextResponse.json({ error: 'Assignments API disabled - use hierarchical subjects system' }, { status: 410 });
}

