import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getClassPermission } from '@/lib/auth/class-permissions';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; gradeSetId: string; studentId: string }> }
) {
  try {
    const { classId, gradeSetId, studentId } = await params;
    const body = await req.json();
    const { grade } = body;

    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Auth check
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission check
    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isTeacher) {
      return NextResponse.json({ error: 'Only teachers can grade' }, { status: 403 });
    }

    // Verify grade set belongs to this class
    const { data: gradeSet, error: gsError } = await supabase
      .from('grade_sets')
      .select('id')
      .eq('id', gradeSetId)
      .eq('class_id', classId)
      .maybeSingle();

    if (gsError) {
      return NextResponse.json({ error: gsError.message }, { status: 500 });
    }

    if (!gradeSet) {
      return NextResponse.json({ error: 'Grade set not found' }, { status: 404 });
    }

    // Upsert student grade
    const { data: existingGrade } = await supabase
      .from('student_grades')
      .select('id')
      .eq('grade_set_id', gradeSetId)
      .eq('student_id', studentId)
      .maybeSingle();

    let result;
    if (existingGrade) {
      // Update existing
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
      // Insert new
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

    return NextResponse.json({
      success: true,
      grade: result.data
    });
  } catch (error: any) {
    console.error('Error saving grade:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; gradeSetId: string; studentId: string }> }
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
