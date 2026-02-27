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
      console.log('[DASHBOARD] GET - No user in auth.getUser() result')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[DASHBOARD] GET - Authenticated user details:', {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      created_at: user.created_at
    });

    // Fetch profile first to determine subscription type/tier and get preferences
    // Use ONLY subscription_type - role column has been removed
    let { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_type, subscription_tier, language, theme, high_contrast, dyslexia_font, reduced_motion, quiz_usage_today, quiz_usage_date, classes_created')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[DASHBOARD] GET - Profile fetch error:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint
      });
    }

    // Create profile if it doesn't exist (defaults to free student)
    if (!profileData) {
      console.log('[DASHBOARD] GET - Profile not found, creating new profile with defaults')
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          subscription_type: 'student',
          subscription_tier: 'free',
          full_name: user.user_metadata?.full_name || '',
          avatar_url: user.user_metadata?.avatar_url || null,
          language: 'en',
          theme: 'light',
          high_contrast: false,
          dyslexia_font: false,
          reduced_motion: false,
          quiz_usage_today: 0,
          quiz_usage_date: new Date().toISOString().split('T')[0],
          classes_created: 0
        })

      if (insertError) {
        console.error('[DASHBOARD] GET - Profile creation failed:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        })
      } else {
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('subscription_type, subscription_tier, language, theme, high_contrast, dyslexia_font, reduced_motion, quiz_usage_today, quiz_usage_date, classes_created')
          .eq('id', user.id)
          .maybeSingle()
        profileData = newProfile as any
      }
    }

    // Use subscription_type as the single source of truth
    const subscriptionType = profileData?.subscription_type || 'student';
    const subscriptionTier = profileData?.subscription_tier || 'free';
    const role = subscriptionType; // Keep for API response compatibility (alias)
    const isTeacher = subscriptionType === 'teacher';
    
    console.log('[DASHBOARD] User subscription details:', {
      subscriptionType,
      subscriptionTier,
      isTeacher,
      classesCreated: profileData?.classes_created || 0
    });
    
    // Get usage data for limits
    const quizUsage = profileData?.quiz_usage_today || 0;
    const quizDate = profileData?.quiz_usage_date;
    const classesCreated = profileData?.classes_created || 0;
    
    // Check if quiz usage should be reset (new day)
    const today = new Date().toISOString().split('T')[0];
    const isNewQuizDay = quizDate !== today;
    const currentQuizUsage = isNewQuizDay ? 0 : quizUsage;

    // Fetch data based on role
    let classes: any[] = []
    let subjects: any[] = []
    let students: any[] = []
    let assignments: any[] = []

    if (isTeacher) {
      const { data: membershipData } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id);

      const teacherClassIds = Array.from(new Set((membershipData || []).map((m: any) => m.class_id)));

      const classesPromise = teacherClassIds.length > 0
        ? supabase.from('classes').select('*').in('id', teacherClassIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[], error: null });

      const subjectsPromise = (supabase as any).from('subjects')
        .select(`*, class_subjects(classes:class_id(id, name))`)
        .or(`user_id.eq.${user.id},id.in.(SELECT subject_id FROM subject_teachers WHERE teacher_id = '${user.id}')`)
        .order('created_at', { ascending: false });

      const personalTasksPromise = supabase
        .from('personal_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const [classesResult, subjectsResult, personalTasksResult] = await Promise.all([
        classesPromise,
        subjectsPromise,
        personalTasksPromise,
      ]);

      classes = classesResult?.data || [];

      subjects = (subjectsResult.data || []).map((s: any) => ({
        ...s,
        classes: s.class_subjects ? s.class_subjects.map((cs: any) => cs.classes).filter(Boolean) : []
      }));

      if (teacherClassIds.length > 0 && teacherClassIds.length <= 50) {
        const { data: studentsData } = await supabase
          .from('class_members')
          .select('user_id, profiles(*)')
          .in('class_id', teacherClassIds);

        if (studentsData) {
          students = Array.from(new Set(studentsData.map((s: any) => s.user_id)))
            .map(id => studentsData.find((s: any) => s.user_id === id))
            .filter(Boolean)
        }
      }

      assignments = [];
      if (teacherClassIds.length > 0) {
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
          .in('id', teacherClassIds);

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

        const { data: directAssignments, error: directError } = await supabase
          .from('assignments')
          .select(`
            *,
            classes!inner(
              id,
              name
            )
          `)
          .in('class_id', teacherClassIds)
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

        assignments.sort((a, b) => {
          const dateA = a.scheduled_start_at ? new Date(a.scheduled_start_at).getTime() : Infinity;
          const dateB = b.scheduled_start_at ? new Date(b.scheduled_start_at).getTime() : Infinity;
          return dateA - dateB;
        });
      }

      const classLimit = subscriptionTier === 'pro' ? 20 : subscriptionTier === 'premium' ? 5 : 0;
      const canCreateClass = classesCreated < classLimit;

      return NextResponse.json({
        classes,
        subjects,
        assignments,
        personalTasks: personalTasksResult.data || [],
        students,
        role,
        subscription: {
          type: subscriptionType,
          tier: subscriptionTier,
          quizUsage: currentQuizUsage,
          quizLimit: subscriptionType === 'student' ? (subscriptionTier === 'pro' ? 999999 : subscriptionTier === 'premium' ? 30 : 5) : 999999,
          classesCreated: classesCreated,
          classLimit: classLimit,
          canCreateClass: canCreateClass
        },
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

      // Calculate quiz limits for students
      const quizLimit = subscriptionTier === 'pro' ? 999999 : subscriptionTier === 'premium' ? 30 : 5;

      return NextResponse.json({
        classes,
        subjects,
        assignments,
        personalTasks: personalTasksResult.data || [],
        students: [],
        role,
        subscription: {
          type: subscriptionType,
          tier: subscriptionTier,
          quizUsage: currentQuizUsage,
          quizLimit: quizLimit,
          classesCreated: classesCreated,
          classLimit: 0,
          canCreateClass: false
        },
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
