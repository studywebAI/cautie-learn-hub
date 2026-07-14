import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getClassPermission } from '@/lib/auth/class-permissions';

export const dynamic = 'force-dynamic';

// GET /api/classes/[classId]/students/[studentId]/final-grade?subjectId=
// Weighted eindcijfer across a student's released, numeric grades — using
// class-level category weights if configured (docs/grades-feature-brainstorm.md
// point 13), else falling back to each grade set's own `weight` column.
// Only released grade sets count (status='published' / grade_released_at set)
// — never leaks an unreleased grade into the average.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string; studentId: string }> }
) {
  try {
    const { classId, studentId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // Students may only see their own final grade; teachers may see any student's.
    if (!perm.isTeacher && user.id !== studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    let query = supabase
      .from('grade_sets')
      .select('id, category, weight, status, grade_released_at, student_grades!inner(grade_numeric, student_id)')
      .eq('class_id', classId)
      .eq('status', 'published')
      .eq('student_grades.student_id', studentId);
    if (subjectId) query = query.eq('subject_id', subjectId);

    const { data: gradeSets, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (gradeSets || [])
      .map((gs: any) => ({
        category: gs.category || 'other',
        weight: Number(gs.weight) || 1,
        grade: gs.student_grades?.[0]?.grade_numeric,
      }))
      .filter((r: any) => typeof r.grade === 'number' && !Number.isNaN(r.grade));

    if (rows.length === 0) {
      return NextResponse.json({ final_grade: null, breakdown: [] });
    }

    const { data: weightPresets } = await supabase
      .from('class_grading_presets')
      .select('config')
      .eq('class_id', classId);
    const categoryWeights: Record<string, number> | null =
      (weightPresets || []).find((p: any) => p.config?.templateType === 'category_weights')?.config?.weights || null;

    let finalGrade: number;
    const breakdown: Array<{ category: string; average: number; weight: number; count: number }> = [];

    if (categoryWeights && Object.keys(categoryWeights).length > 0) {
      const byCategory = new Map<string, number[]>();
      for (const r of rows) {
        if (!byCategory.has(r.category)) byCategory.set(r.category, []);
        byCategory.get(r.category)!.push(r.grade);
      }
      let weightedSum = 0;
      let totalWeight = 0;
      for (const [category, grades] of byCategory) {
        const weight = categoryWeights[category];
        if (!weight) continue;
        const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
        breakdown.push({ category, average: Math.round(avg * 10) / 10, weight, count: grades.length });
        weightedSum += avg * weight;
        totalWeight += weight;
      }
      finalGrade = totalWeight > 0 ? weightedSum / totalWeight : rows.reduce((a, r) => a + r.grade, 0) / rows.length;
    } else {
      const totalWeight = rows.reduce((sum, r) => sum + r.weight, 0);
      finalGrade = totalWeight > 0
        ? rows.reduce((sum, r) => sum + r.grade * r.weight, 0) / totalWeight
        : rows.reduce((a, r) => a + r.grade, 0) / rows.length;
      const byCategory = new Map<string, number[]>();
      for (const r of rows) {
        if (!byCategory.has(r.category)) byCategory.set(r.category, []);
        byCategory.get(r.category)!.push(r.grade);
      }
      for (const [category, grades] of byCategory) {
        breakdown.push({ category, average: Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10, weight: 0, count: grades.length });
      }
    }

    return NextResponse.json({
      final_grade: Math.round(finalGrade * 10) / 10,
      breakdown,
      uses_category_weights: !!(categoryWeights && Object.keys(categoryWeights).length > 0),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
