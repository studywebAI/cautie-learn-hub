import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ classId: string; studentId: string }>;
  }
) {
  try {
    const { classId, studentId } = await params;
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Get grade sets for this class with student grades
    let query = (supabase as any)
      .from('grade_sets')
      .select(
        `
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
      `
      )
      .eq('class_id', classId);

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const result = await query;

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to fetch grades' },
        { status: 500 }
      );
    }

    // Extract and transform grades for this specific student
    const gradeSets = result.data || [];
    const grades: any[] = [];

    for (const gradeSet of gradeSets) {
      const studentGrade = gradeSet.student_grades?.find(
        (sg: any) => sg.student_id === studentId
      );
      if (studentGrade && studentGrade.grade_numeric !== null) {
        grades.push({
          id: studentGrade.id,
          title: gradeSet.title,
          grade: studentGrade.grade_numeric,
          date: studentGrade.created_at,
        });
      }
    }

    // Sort by date descending and limit to 10
    const transformedGrades = grades
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return NextResponse.json({ grades: transformedGrades }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching student grades:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
