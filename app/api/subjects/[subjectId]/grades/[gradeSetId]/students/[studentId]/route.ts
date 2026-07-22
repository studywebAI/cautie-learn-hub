import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions';

// Mirrors app/api/classes/[classId]/grades/[gradeSetId]/students/[studentId]/route.ts,
// keyed on subject_id instead of class_id.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string; gradeSetId: string; studentId: string }> }
) {
  try {
    const { subjectId, gradeSetId, studentId } = await params;
    const body = await req.json();
    const { grade } = body;

    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Only subject teachers can grade' }, { status: 403 });
    }

    const { data: gradeSet, error: gsError } = await supabase
      .from('grade_sets')
      .select('id')
      .eq('id', gradeSetId)
      .eq('subject_id', subjectId)
      .maybeSingle();

    if (gsError) {
      return NextResponse.json({ error: gsError.message }, { status: 500 });
    }
    if (!gradeSet) {
      return NextResponse.json({ error: 'Grade set not found' }, { status: 404 });
    }

    const { data: existingGrade } = await supabase
      .from('student_grades')
      .select('id')
      .eq('grade_set_id', gradeSetId)
      .eq('student_id', studentId)
      .maybeSingle();

    let result;
    if (existingGrade) {
      result = await supabase
        .from('student_grades')
        .update({
          grade_numeric: grade !== null && grade !== undefined ? parseFloat(grade) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingGrade.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('student_grades')
        .insert([{
          grade_set_id: gradeSetId,
          student_id: studentId,
          grade_numeric: grade !== null && grade !== undefined ? parseFloat(grade) : null,
          status: 'draft',
        }])
        .select()
        .single();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, grade: result.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string; gradeSetId: string; studentId: string }> }
) {
  try {
    const { gradeSetId, studentId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: grade, error } = await supabase
      .from('student_grades')
      .select()
      .eq('grade_set_id', gradeSetId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ grade: grade || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
