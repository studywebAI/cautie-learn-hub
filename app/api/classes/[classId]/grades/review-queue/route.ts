import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getClassPermission } from '@/lib/auth/class-permissions';

export const dynamic = 'force-dynamic';

// GET /api/classes/[classId]/grades/review-queue
// Splits the class's grade sets into "nog nakijken" (open questions still
// pending correctness review) and "nog becijferen" (nakijken done / not
// needed, no grade released yet). See docs/grades-feature-brainstorm.md H1/H2.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: gradeSets, error } = await supabase
      .from('grade_sets')
      .select('id, title, assignment_id, status, category, created_at, grade_released_at, answers_released_at, student_grades(id, grade_numeric, grade_value)')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ nakijken: [], becijferen: [] });

    const linkedAssignmentIds = (gradeSets || [])
      .map((g: any) => g.assignment_id)
      .filter(Boolean);

    let pendingByAssignment = new Map<string, number>();
    if (linkedAssignmentIds.length > 0) {
      const { data: openBlocks } = await supabase
        .from('blocks')
        .select('id, assignment_id')
        .in('assignment_id', linkedAssignmentIds)
        .eq('type', 'open_question');

      const blockIds = (openBlocks || []).map((b: any) => b.id);
      const blockToAssignment = new Map((openBlocks || []).map((b: any) => [b.id, b.assignment_id]));

      if (blockIds.length > 0) {
        const { data: pendingAnswers } = await supabase
          .from('student_answers')
          .select('block_id')
          .in('block_id', blockIds)
          .is('score', null);

        for (const answer of pendingAnswers || []) {
          const assignmentId = blockToAssignment.get((answer as any).block_id);
          if (!assignmentId) continue;
          pendingByAssignment.set(assignmentId, (pendingByAssignment.get(assignmentId) || 0) + 1);
        }
      }
    }

    const nakijken: any[] = [];
    const becijferen: any[] = [];

    for (const gs of gradeSets || []) {
      const grades = (gs as any).student_grades || [];
      const gradedCount = grades.filter((g: any) => g.grade_numeric !== null || (g.grade_value !== null && g.grade_value !== '')).length;
      const pendingCount = (gs as any).assignment_id ? (pendingByAssignment.get((gs as any).assignment_id) || 0) : 0;

      const row = {
        id: (gs as any).id,
        title: (gs as any).title,
        assignment_id: (gs as any).assignment_id,
        status: (gs as any).status,
        created_at: (gs as any).created_at,
        answers_released_at: (gs as any).answers_released_at,
        grade_released_at: (gs as any).grade_released_at,
        total_students: grades.length,
        graded_count: gradedCount,
        pending_answers: pendingCount,
      };

      if (pendingCount > 0) {
        nakijken.push(row);
      } else if (!(gs as any).grade_released_at) {
        becijferen.push(row);
      }
    }

    return NextResponse.json({ nakijken, becijferen });
  } catch (err) {
    return NextResponse.json({ nakijken: [], becijferen: [] });
  }
}
