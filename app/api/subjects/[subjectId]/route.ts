import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const resolvedParams = await params;
  const subjectId = resolvedParams.subjectId;

  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the subject
    const { data: subject, error: fetchError } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single();

    if (fetchError || !subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isTeacher = profile?.role === 'teacher';

    // Check access
    let hasAccess = false;

    if (isTeacher) {
      // Teachers: check if they own the subject
      hasAccess = subject.user_id === user.id;
    } else {
      // Students: check if they are a member of any class linked to this subject via class_subjects
      const { data: classSubjectLinks } = await (supabase as any)
        .from('class_subjects')
        .select('class_id')
        .eq('subject_id', subjectId);

      if (classSubjectLinks && classSubjectLinks.length > 0) {
        const classIds = classSubjectLinks.map((cs: any) => cs.class_id);
        const { data: membership } = await supabase
          .from('class_members')
          .select('id')
          .eq('user_id', user.id)
          .in('class_id', classIds)
          .limit(1);
        
        hasAccess = !!(membership && membership.length > 0);
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(subject);

  } catch (err) {
    console.error(`Unexpected error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
