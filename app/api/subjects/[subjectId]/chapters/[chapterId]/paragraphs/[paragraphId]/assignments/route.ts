import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET assignments for a paragraph
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;

    const { data: { user } } = await supabase.auth.getUser()

    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('paragraph_id', resolvedParams.paragraphId)
      .order('assignment_index', { ascending: true })

    if (error) {
      console.error('Assignments fetch error:', error);
      return NextResponse.json([])
    }

    const safeAssignments = assignments || [];

    const getLetterIndex = (index: number): string => {
      if (index < 26) return String.fromCharCode(97 + index);
      const first = Math.floor(index / 26) - 1;
      const second = index % 26;
      return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
    };

    const assignmentIds = safeAssignments.map((assignment) => assignment.id).filter(Boolean);
    let blocksByAssignment = new Map<string, number>();
    let answersByAssignment = new Map<string, { total: number; correct: number }>();

    if (assignmentIds.length > 0) {
      const { data: blockRows } = await supabase
        .from('blocks')
        .select('assignment_id')
        .in('assignment_id', assignmentIds);

      blocksByAssignment = (blockRows || []).reduce((acc: Map<string, number>, row: any) => {
        const assignmentId = row.assignment_id as string;
        if (!assignmentId) return acc;
        acc.set(assignmentId, (acc.get(assignmentId) || 0) + 1);
        return acc;
      }, new Map<string, number>());

      if (user) {
        const { data: answerRows } = await supabase
          .from('student_answers')
          .select('assignment_id, is_correct')
          .eq('student_id', user.id)
          .in('assignment_id', assignmentIds);

        answersByAssignment = (answerRows || []).reduce(
          (acc: Map<string, { total: number; correct: number }>, row: any) => {
            const assignmentId = row.assignment_id as string;
            if (!assignmentId) return acc;
            const previous = acc.get(assignmentId) || { total: 0, correct: 0 };
            acc.set(assignmentId, {
              total: previous.total + 1,
              correct: previous.correct + (row.is_correct === true ? 1 : 0),
            });
            return acc;
          },
          new Map<string, { total: number; correct: number }>()
        );
      }
    }

    const transformedAssignments = safeAssignments.map((assignment) => {
      const totalBlocks = blocksByAssignment.get(assignment.id) || 0;
      const answerStats = answersByAssignment.get(assignment.id) || { total: 0, correct: 0 };
      const progress_percent = totalBlocks > 0 ? Math.ceil((answerStats.total / totalBlocks) * 100) : 0;
      const correct_percent = totalBlocks > 0 ? Math.ceil((answerStats.correct / totalBlocks) * 100) : 0;

      return {
        ...assignment,
        letter_index: getLetterIndex(assignment.assignment_index),
        block_count: totalBlocks,
        progress_percent,
        correct_percent,
      };
    });

    return NextResponse.json(transformedAssignments)
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new assignment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;

    const { title, answers_enabled = false } = await request.json()

    // Get max assignment index for this paragraph
    const { data: existingAssignments } = await supabase
      .from('assignments')
      .select('assignment_index')
      .eq('paragraph_id', resolvedParams.paragraphId)
      .order('assignment_index', { ascending: false })
      .limit(1)

    const nextIndex = existingAssignments && existingAssignments.length > 0 
      ? (existingAssignments[0].assignment_index ?? -1) + 1 
      : 0;

    const { data: assignment, error: insertError } = await (supabase
      .from('assignments') as any)
      .insert({
        paragraph_id: resolvedParams.paragraphId,
        assignment_index: nextIndex,
        title: title?.trim() || 'Untitled Assignment',
        answers_enabled: answers_enabled ?? false,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const getLetterIndex = (index: number): string => {
      if (index < 26) return String.fromCharCode(97 + index);
      const first = Math.floor(index / 26) - 1;
      const second = index % 26;
      return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
    };

    return NextResponse.json({
      ...assignment,
      letter_index: getLetterIndex(assignment.assignment_index),
      block_count: 0,
      progress_percent: 0,
      correct_percent: 0,
    })
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
