import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { gradeOpenQuestion, gradeOpenQuestionWithSampling } from '@/ai/flows/grade-open-question';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
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
      return NextResponse.json({ error: 'Failed to fetch assignment blocks' }, { status: 500 });
    }

    // Find open question blocks and grade them
    const openQuestionBlocks = blocks?.filter(block => block.type === 'open_question') || [];
    const gradingResults = [];

    if (openQuestionBlocks.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No open questions to grade',
        results: [],
        totalScore: 0,
        maxPossibleScore: 0,
        percentage: 0,
      });
    }

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

      // Grade the open question using sampling approach for anti-manipulation
      const sampledGradingResult = await gradeOpenQuestionWithSampling({
        question: block.data?.question || '',
        criteria: block.data?.grading_criteria || '',
        maxScore: block.data?.max_score || 5,
        language: 'English',
        studentAnswer: studentAnswer.answer_data?.toString() || '',
        strictness: submission.assignments.ai_grading_strictness || 5,
        checkSpelling: submission.assignments.ai_grading_check_spelling || true,
        checkGrammar: submission.assignments.ai_grading_check_grammar || true,
        keywords: submission.assignments.ai_grading_keywords || '',
      }, 3); // Use 3 sampling evaluations

      // Update student answer with grading result (using median score)
      const { error: updateError } = await supabase
        .from('student_answers')
        .update({
          score: sampledGradingResult.medianScore,
          feedback: sampledGradingResult.finalFeedback,
          graded_at: new Date().toISOString(),
          graded_by_ai: true,
          is_correct: sampledGradingResult.medianScore >= (block.data?.max_score || 5) * 0.8,
          ai_grading_samples: {
            scores: sampledGradingResult.scores,
            feedbacks: sampledGradingResult.feedbacks,
            samplingCount: sampledGradingResult.scores.length,
          },
        })
        .eq('id', studentAnswer.id);

      if (updateError) {
        console.error('Error updating student answer:', updateError);
      }

      gradingResults.push({
        blockId: block.id,
        question: block.data?.question,
        studentAnswer: studentAnswer.answer_data,
        score: sampledGradingResult.medianScore,
        feedback: sampledGradingResult.finalFeedback,
        samplingDetails: {
          samples: sampledGradingResult.scores.length,
          allScores: sampledGradingResult.scores,
          medianScore: sampledGradingResult.medianScore,
        },
      });
    }

    // Calculate total grade
    const totalScore = gradingResults.reduce((sum, result) => sum + result.score, 0);
    const maxPossibleScore = openQuestionBlocks.reduce((sum, block) => sum + (block.data?.max_score || 5), 0);
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    // Update submission with grade
    const { error: submissionUpdateError } = await supabase
      .from('submissions')
      .update({
        grade: percentage,
        status: 'graded',
        graded_at: new Date().toISOString(),
        graded_by: user.id,
      })
      .eq('id', submissionId);

    if (submissionUpdateError) {
    }

    return NextResponse.json({
      success: true,
      message: 'AI grading completed',
      results: gradingResults,
      totalScore,
      maxPossibleScore,
      percentage,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
