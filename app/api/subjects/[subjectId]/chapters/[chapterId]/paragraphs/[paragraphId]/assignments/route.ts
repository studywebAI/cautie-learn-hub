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

    // Compute progress per assignment from student_answers if user is logged in
    const transformedAssignments = await Promise.all(
      safeAssignments.map(async (assignment) => {
        let progress_percent = 0;
        let correct_percent = 0;

        // Get block count for this assignment
        const { count: blockCount } = await supabase
          .from('blocks')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id);

        const totalBlocks = blockCount || 0;

        if (user && totalBlocks > 0) {
          // Get student answers for this assignment
          const { data: answers } = await supabase
            .from('student_answers')
            .select('is_correct, score')
            .eq('assignment_id', assignment.id)
            .eq('student_id', user.id);

          if (answers && answers.length > 0) {
            progress_percent = Math.ceil((answers.length / totalBlocks) * 100);
            const correctCount = answers.filter(a => a.is_correct === true).length;
            correct_percent = Math.ceil((correctCount / totalBlocks) * 100);
          }
        }

        return {
          ...assignment,
          letter_index: getLetterIndex(assignment.assignment_index),
          block_count: totalBlocks,
          progress_percent,
          correct_percent,
        };
      })
    );

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
