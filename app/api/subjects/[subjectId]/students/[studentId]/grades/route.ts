import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Mirrors app/api/classes/[classId]/students/[studentId]/grades/route.ts,
// keyed on subject_id instead of class_id.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; studentId: string }> }
) {
  try {
    const { subjectId, studentId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: gradeSets, error } = await (supabase as any)
      .from('grade_sets')
      .select(`
        id,
        title,
        subject_id,
        student_grades(
          id,
          student_id,
          grade_numeric,
          grade_value,
          created_at
        )
      `)
      .eq('subject_id', subjectId);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 500 });
    }

    const grades: any[] = [];
    for (const gradeSet of gradeSets || []) {
      const studentGrade = gradeSet.student_grades?.find((sg: any) => sg.student_id === studentId);
      if (studentGrade && studentGrade.grade_numeric !== null) {
        grades.push({
          id: studentGrade.id,
          title: gradeSet.title,
          grade: studentGrade.grade_numeric,
          date: studentGrade.created_at,
        });
      }
    }

    const transformedGrades = grades
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return NextResponse.json({ grades: transformedGrades }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
