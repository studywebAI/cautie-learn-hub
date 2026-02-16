import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch profile first to determine role and get preferences
    let { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, language, theme, high_contrast, dyslexia_font, reduced_motion')
      .eq('id', user.id)
      .maybeSingle()

    // Create profile if it doesn't exist
    if (!profileData) {
      console.log('Profile not found, creating new profile')
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          role: 'student',
          full_name: user.user_metadata?.full_name || '',
          avatar_url: user.user_metadata?.avatar_url || null,
          language: 'en',
          theme: 'light',
          high_contrast: false,
          dyslexia_font: false,
          reduced_motion: false
        })

      if (insertError) {
        console.error('Profile creation failed:', insertError)
      } else {
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('role, language, theme, high_contrast, dyslexia_font, reduced_motion')
          .eq('id', user.id)
          .maybeSingle()
        profileData = newProfile as any
      }
    }

    const role = profileData?.role || 'student'
    const isTeacher = role === 'teacher'

    // Fetch data based on role
    let classes: any[] = []
    let subjects: any[] = []
    let students: any[] = []
    let assignments: any[] = []

    if (isTeacher) {
      // Teachers: get classes they own + subjects they created
      const [classesResult, subjectsResult, personalTasksResult] = await Promise.all([
        supabase.from('classes').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
        (supabase as any).from('subjects')
          .select(`*, class_subjects(classes:class_id(id, name))`)
          .eq('user_id', user.id),
        supabase.from('personal_tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      classes = classesResult.data || []
      
      // Transform subjects to include classes array
      subjects = (subjectsResult.data || []).map((s: any) => ({
        ...s,
        classes: s.class_subjects ? s.class_subjects.map((cs: any) => cs.classes).filter(Boolean) : []
      }))

      // Get students across all owned classes
      if (classes.length > 0) {
        const ownedClassIds = classes.map((c: any) => c.id)
        if (ownedClassIds.length <= 50) {
          const { data: studentsData } = await supabase
            .from('class_members')
            .select('user_id, profiles(*)')
            .in('class_id', ownedClassIds)

          if (studentsData) {
            students = Array.from(new Set(studentsData.map((s: any) => s.user_id)))
              .map(id => studentsData.find((s: any) => s.user_id === id))
              .filter(Boolean)
          }
        }
      }

      // Fetch assignments for all owned classes (including hierarchical and direct)
      let assignments: any[] = []
      if (classes.length > 0) {
        // Fetch hierarchical assignments through classes -> subjects -> chapters -> paragraphs -> assignments
        const { data: classesWithAssignments, error: hierarchicalError } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            subjects!subjects_class_id_fkey(
              chapters(
                paragraphs(
                  assignments(*)
                )
              )
            )
          `)
          .in('id', classes.map((c: any) => c.id));

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
          .in('class_id', classes.map((c: any) => c.id))
          .is('paragraph_id', null)
          .order('scheduled_start_at', { ascending: true });

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
      }

      return NextResponse.json({
        classes,
        subjects,
        assignments,
        personalTasks: personalTasksResult.data || [],
        students,
        role,
        preferences: {
          language: profileData?.language || 'en',
          theme: profileData?.theme || 'light',
          high_contrast: profileData?.high_contrast || false,
          dyslexia_font: profileData?.dyslexia_font || false,
          reduced_motion: profileData?.reduced_motion || false,
        }
      })
    } else {
      // Students: get classes they are a MEMBER of + subjects linked to those classes
      const [membershipsResult, personalTasksResult] = await Promise.all([
        supabase.from('class_members').select('class_id').eq('user_id', user.id),
        supabase.from('personal_tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      const classIds = (membershipsResult.data || []).map((m: any) => m.class_id)

      if (classIds.length > 0) {
        // Fetch the actual class details + linked subjects in parallel
        const [classesResult, classSubjectsResult] = await Promise.all([
          supabase.from('classes').select('*').in('id', classIds).order('created_at', { ascending: false }),
          (supabase as any).from('class_subjects').select('subject_id').in('class_id', classIds),
        ])

        classes = classesResult.data || []

        // Get unique subject IDs
        const subjectIds = [...new Set((classSubjectsResult.data || []).map((cs: any) => cs.subject_id))]

        if (subjectIds.length > 0) {
          const { data: subjectsData } = await (supabase as any).from('subjects')
            .select(`*, class_subjects(classes:class_id(id, name))`)
            .in('id', subjectIds)

          subjects = (subjectsData || []).map((s: any) => ({
            ...s,
            classes: s.class_subjects ? s.class_subjects.map((cs: any) => cs.classes).filter(Boolean) : []
          }))
        }

        // Fetch assignments for all classes the student is a member of (including hierarchical and direct)
        // Fetch hierarchical assignments through classes -> subjects -> chapters -> paragraphs -> assignments
        const { data: classesWithAssignments, error: hierarchicalError } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            subjects!subjects_class_id_fkey(
              chapters(
                paragraphs(
                  assignments(*)
                )
              )
            )
          `)
          .in('id', classIds);

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
          .in('class_id', classIds)
          .is('paragraph_id', null)
          .order('scheduled_start_at', { ascending: true });

        if (directError) {
          console.error('Error fetching direct assignments for student:', directError);
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
      }

      return NextResponse.json({
        classes,
        subjects,
        assignments,
        personalTasks: personalTasksResult.data || [],
        students: [],
        role,
        preferences: {
          language: profileData?.language || 'en',
          theme: profileData?.theme || 'light',
          high_contrast: profileData?.high_contrast || false,
          dyslexia_font: profileData?.dyslexia_font || false,
          reduced_motion: profileData?.reduced_motion || false,
        }
      })
    }

  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}