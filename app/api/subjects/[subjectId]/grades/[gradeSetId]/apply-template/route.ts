import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions';
import { computeStudentAnswerStats } from '@/lib/assignments/live-status';
import { applyGradeScale, type GradeScaleConfig } from '@/lib/grades/grade-sets';

export const dynamic = 'force-dynamic';

// Mirrors app/api/classes/[classId]/grades/[gradeSetId]/apply-template/route.ts,
// keyed on subject_id instead of class_id. Now that class_grading_presets
// has a subject_id column (grading-presets subject-first migration), this
// works the same way as the class-scoped version.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; gradeSetId: string }> }
) {
  try {
    const { subjectId, gradeSetId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const presetId = String(body?.preset_id || '').trim();
    const studentIdsFilter: string[] | null = Array.isArray(body?.student_ids) ? body.student_ids : null;
    if (!presetId) return NextResponse.json({ error: 'preset_id is required' }, { status: 400 });

    const { data: preset } = await supabase
      .from('class_grading_presets')
      .select('id, config, kind')
      .eq('id', presetId)
      .eq('subject_id', subjectId)
      .maybeSingle();
    if (!preset || (preset as any).config?.templateType !== 'scale_template') {
      return NextResponse.json({ error: 'Invalid template' }, { status: 400 });
    }
    const config = (preset as any).config as GradeScaleConfig;

    const { data: gradeSet } = await supabase
      .from('grade_sets')
      .select('id, assignment_id')
      .eq('id', gradeSetId)
      .eq('subject_id', subjectId)
      .maybeSingle();
    if (!gradeSet) return NextResponse.json({ error: 'Grade set not found' }, { status: 404 });

    let studentScores: Array<{ student_id: string; score: number; max_score: number }> = [];

    if ((gradeSet as any).assignment_id) {
      const { data: attempts } = await supabase
        .from('assignment_attempts')
        .select('student_id')
        .eq('assignment_id', (gradeSet as any).assignment_id)
        .in('status', ['submitted', 'auto_submitted']);
      const studentIds = [...new Set((attempts || []).map((a: any) => a.student_id))]
        .filter((id: string) => !studentIdsFilter || studentIdsFilter.includes(id));
      for (const studentId of studentIds) {
        const stats = await computeStudentAnswerStats(supabase, (gradeSet as any).assignment_id, studentId);
        studentScores.push({ student_id: studentId, score: stats.score, max_score: stats.maxScore });
      }
    } else {
      return NextResponse.json({ error: 'Template auto-apply requires a test-linked grade set; enter manual grades directly for grade sets without a linked test.' }, { status: 400 });
    }

    let applied = 0;
    for (const s of studentScores) {
      const bin = applyGradeScale(config, s.score, s.max_score);
      if (!bin) continue;

      const gradeValue = bin.label;
      const gradeNumeric = typeof bin.numeric === 'number' ? bin.numeric : null;

      const { data: existing } = await supabase
        .from('student_grades')
        .select('id')
        .eq('grade_set_id', gradeSetId)
        .eq('student_id', s.student_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('student_grades')
          .update({ grade_value: gradeValue, grade_numeric: gradeNumeric, updated_at: new Date().toISOString() })
          .eq('id', (existing as any).id);
      } else {
        await supabase
          .from('student_grades')
          .insert({ grade_set_id: gradeSetId, student_id: s.student_id, grade_value: gradeValue, grade_numeric: gradeNumeric });
      }
      applied += 1;
    }

    await supabase
      .from('grade_sets')
      .update({ grading_preset_id: presetId, updated_at: new Date().toISOString() })
      .eq('id', gradeSetId);

    return NextResponse.json({ applied });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
