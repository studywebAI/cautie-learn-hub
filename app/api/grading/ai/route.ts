import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { gradeOpenQuestion } from '@/ai/flows/grade-open-question';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { submissionId } = await request.json();

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select(`
        *,
        assignments (
          id, 
          title, 
          answer_mode, 
          ai_grading_enabled, 
          ai_grading_strictness, 
          ai_grading_check_spelling, 
          ai_grading_check_grammar, 
          ai_grading_keywords
        )
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Check if AI grading is enabled for this assignment
    if (!submission.assignments.ai_grading_enabled) {
      return NextResponse.json({ error: 'AI grading not enabled for this assignment' }, { status: 400 });
    }

    // Get assignment blocks to find open questions
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('*')
      .eq('assignment_id', submission.assignment_id);

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
    }

    // Find open question blocks and grade them
    const openQuestionBlocks = blocks?.filter(block => block.type === 'open_question') || [];
    const gradingResults = [];

    for (const block of openQuestionBlocks) {
      // Get student answer for this block
      const { data: studentAnswer, error: answerError } = await supabase
        .from('student_answers')
        .select('*')
        .eq('block_id', block.id)
        .eq('student_id', user.id)
        .single();

      if (answerError || !studentAnswer) {
        continue;
      }

      // Grade the open question
      const gradingResult = await gradeOpenQuestion({
        question: block.data?.question || '',
        criteria: block.data?.grading_criteria || '',
        maxScore: block.data?.max_score || 5,
        language: 'English',
        studentAnswer: studentAnswer.answer_data?.toString() || '',
        strictness: submission.assignments.ai_grading_strictness || 5,
        checkSpelling: submission.assignments.ai_grading_check_spelling || true,
        checkGrammar: submission.assignments.ai_grading_check_grammar || true,
        keywords: submission.assignments.ai_grading_keywords || '',
      });

      // Update student answer with grading result
      await supabase
        .from('student_answers')
        .update({
          score: gradingResult.score,
          feedback: gradingResult.feedback,
          graded_at: new Date().toISOString(),
          graded_by_ai: true,
          is_correct: gradingResult.score >= (block.data?.max_score || 5) * 0.8,
        })
        .eq('id', studentAnswer.id);

      gradingResults.push({
        blockId: block.id,
        question: block.data?.question,
        studentAnswer: studentAnswer.answer_data,
        score: gradingResult.score,
        feedback: gradingResult.feedback,
      });
    }

    // Calculate total grade
    const totalScore = gradingResults.reduce((sum, result) => sum + result.score, 0);
    const maxPossibleScore = openQuestionBlocks.reduce((sum, block) => sum + (block.data?.max_score || 5), 0);
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    // Update submission with grade
    await supabase
      .from('submissions')
      .update({
        grade: percentage,
        status: 'graded',
        graded_at: new Date().toISOString(),
        graded_by: user.id,
      })
      .eq('id', submissionId);

    return NextResponse.json({
      success: true,
      message: 'AI grading completed',
      results: gradingResults,
      totalScore,
      maxPossibleScore,
      percentage,
    });
  } catch (error) {
    console.error('AI grading API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}