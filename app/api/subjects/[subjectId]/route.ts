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

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Subject detail - auth failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isTeacher = profile?.role === 'teacher';

    if (isTeacher) {
      // Teachers: fetch subject they own
      // Mirrors dashboard: supabase.from('subjects').select(...).eq('user_id', user.id)
      const { data: subject, error: fetchError } = await (supabase as any)
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.log('Teacher subject fetch error:', fetchError.message);
        return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 });
      }

      if (!subject) {
        console.log('Teacher does not own subject:', subjectId);
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      return NextResponse.json(subject);

    } else {
      // Students: verify access through class_members → class_subjects → subjects
      // This mirrors EXACTLY what the working dashboard API does

      // Step 1: Get class IDs the student is a member of
      const { data: memberships, error: memberError } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id);

      if (memberError) {
        console.log('Student memberships fetch error:', memberError.message);
        return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 });
      }

      const classIds = (memberships || []).map((m: any) => m.class_id);

      if (classIds.length === 0) {
        console.log('Student has no class memberships:', user.id);
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      // Step 2: Get subject IDs linked to those classes
      const { data: classSubjectLinks, error: csError } = await (supabase as any)
        .from('class_subjects')
        .select('subject_id')
        .in('class_id', classIds);

      if (csError) {
        console.log('Class subjects fetch error:', csError.message);
        return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 });
      }

      const allowedSubjectIds = [...new Set((classSubjectLinks || []).map((cs: any) => cs.subject_id))];

      if (!allowedSubjectIds.includes(subjectId)) {
        console.log('Student does not have access to subject:', subjectId, 'allowed:', allowedSubjectIds);
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      // Step 3: Fetch the subject - using same pattern as dashboard
      const { data: subjectsData, error: subjectError } = await (supabase as any)
        .from('subjects')
        .select('*')
        .in('id', [subjectId]);

      if (subjectError) {
        console.log('Student subject fetch error:', subjectError.message);
        return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 });
      }

      if (!subjectsData || subjectsData.length === 0) {
        console.log('Subject not found in database:', subjectId);
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      return NextResponse.json(subjectsData[0]);
    }

  } catch (err) {
    console.error('Subject detail - unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
