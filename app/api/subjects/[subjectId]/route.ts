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

  console.log(`🔍 DETAIL API: GET /api/subjects/${subjectId}`);
  console.log(`🔍 Params resolved:`, resolvedParams);
  console.log(`🔍 SubjectId type:`, typeof subjectId);
  console.log(`🔍 SubjectId length:`, subjectId?.length);

  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    // First check if this subject ID exists at all
    const { data: allSubjects, error: listError } = await supabase
      .from('subjects')
      .select('id, title')
      .limit(10);

    console.log(`🔍 All subjects in DB (first 10):`, allSubjects);
    console.log(`🔍 Looking for ID: "${subjectId}"`);

    // Check exact match
    const exactMatch = allSubjects?.find(s => s.id === subjectId);
    console.log(`🔍 Exact match found:`, exactMatch);

    // Check case-insensitive match
    const caseInsensitiveMatch = allSubjects?.find(s => s.id?.toLowerCase() === subjectId?.toLowerCase());
    console.log(`🔍 Case-insensitive match:`, caseInsensitiveMatch);

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

    const userRole = profile?.role || 'student';
    const isTeacher = userRole === 'teacher';

    // First fetch the subject to check access
    const { data: subject, error: fetchError } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single();

    if (fetchError || !subject) {
      console.log(`❌ Subject not found:`, fetchError);
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    // Check access
    let hasAccess = false;
    if (subject.class_id) {
      if (isTeacher) {
        // Check if teacher owns the class that contains this subject
        const { data: classData } = await supabase
          .from('classes')
          .select('owner_id')
          .eq('id', subject.class_id)
          .maybeSingle();
        hasAccess = classData?.owner_id === user.id;
      } else {
        // Check if student is member of the class
        const { data: membership } = await supabase
          .from('class_members')
          .select('role')
          .eq('class_id', subject.class_id)
          .eq('user_id', user.id)
          .maybeSingle();
        hasAccess = !!membership;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log(`✅ Subject found and access granted:`, subject);
    return NextResponse.json(subject);

  } catch (err) {
    console.error(`💥 Unexpected error:`, err);
    return NextResponse.json({
      error: 'Internal server error',
      subjectId: subjectId,
      errorMessage: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}