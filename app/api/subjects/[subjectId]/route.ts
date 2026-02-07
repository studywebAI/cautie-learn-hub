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

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isTeacher = profile?.role === 'teacher';

    if (isTeacher) {
      // Teachers: fetch subject directly (they own it, RLS allows)
      const { data: subject, error: fetchError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError || !subject) {
        console.log('Teacher subject not found:', subjectId, fetchError);
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      return NextResponse.json(subject);
    } else {
      // Students: verify access through class_subjects + class_members join
      // First check if student is a member of any class linked to this subject
      const { data: memberships, error: memberError } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id);

      if (memberError || !memberships || memberships.length === 0) {
        console.log('Student has no class memberships:', user.id, memberError);
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      const classIds = memberships.map((m: any) => m.class_id);

      // Check if any of those classes are linked to this subject
      const { data: classSubjectLinks, error: csError } = await (supabase as any)
        .from('class_subjects')
        .select('subject_id')
        .eq('subject_id', subjectId)
        .in('class_id', classIds)
        .limit(1);

      if (csError || !classSubjectLinks || classSubjectLinks.length === 0) {
        console.log('Subject not linked to student classes:', subjectId, classIds, csError);
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      // Student has access - now fetch the subject
      // Use a broad select that works regardless of RLS on subjects table
      const { data: subjects, error: subjectError } = await (supabase as any)
        .from('subjects')
        .select('*')
        .eq('id', subjectId);

      if (subjectError) {
        console.log('Subject fetch error (RLS may be blocking):', subjectError);
        // If RLS blocks direct access, try fetching via a join through class_subjects
        // This is a fallback - get subject data through the relationship
        const { data: subjectViaJoin, error: joinError } = await (supabase as any)
          .from('class_subjects')
          .select('subject_id, subjects:subject_id(id, title, description, cover_type, cover_image_url, user_id, created_at)')
          .eq('subject_id', subjectId)
          .in('class_id', classIds)
          .limit(1);

        if (joinError || !subjectViaJoin || subjectViaJoin.length === 0) {
          console.log('Subject join fetch also failed:', joinError);
          return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        const subject = subjectViaJoin[0]?.subjects;
        if (!subject) {
          return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        return NextResponse.json(subject);
      }

      if (!subjects || subjects.length === 0) {
        // Direct query returned empty - try join fallback
        const { data: subjectViaJoin, error: joinError } = await (supabase as any)
          .from('class_subjects')
          .select('subject_id, subjects:subject_id(id, title, description, cover_type, cover_image_url, user_id, created_at)')
          .eq('subject_id', subjectId)
          .in('class_id', classIds)
          .limit(1);

        if (joinError || !subjectViaJoin || subjectViaJoin.length === 0) {
          console.log('Subject join fetch failed:', joinError);
          return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        const subject = subjectViaJoin[0]?.subjects;
        if (!subject) {
          return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        return NextResponse.json(subject);
      }

      return NextResponse.json(subjects[0]);
    }

  } catch (err) {
    console.error('Unexpected error in subject detail:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
