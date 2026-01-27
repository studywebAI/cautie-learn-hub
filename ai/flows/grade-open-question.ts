'use server';

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const GradeOpenQuestionInputSchema = z.object({
  question: z.string().describe('The question being asked'),
  criteria: z.string().describe('Grading criteria or rubric'),
  maxScore: z.number().describe('Maximum possible score'),
  language: z.string().describe('Language for feedback'),
  studentAnswer: z.string().describe('Student\'s answer to grade'),
});

const GradeOpenQuestionOutputSchema = z.object({
  score: z.number().min(0).describe('Numerical score given'),
  feedback: z.string().describe('Constructive feedback for the student'),
});

type GradeOpenQuestionInput = z.infer<typeof GradeOpenQuestionInputSchema>;

export async function gradeOpenQuestion(
  input: GradeOpenQuestionInput
) {
  return gradeOpenQuestionFlow(input);
}

const gradeOpenQuestionFlow = ai.defineFlow(
  {
    name: 'gradeOpenQuestionFlow',
    inputSchema: GradeOpenQuestionInputSchema,
    outputSchema: GradeOpenQuestionOutputSchema,
  },
  async (input) => {
    const model = await getGoogleAIModel();
    const prompt = ai.definePrompt({
      name: 'gradeOpenQuestionPrompt',
      model,
      input: { schema: GradeOpenQuestionInputSchema },
      output: { schema: GradeOpenQuestionOutputSchema },
      prompt: `You are an expert educator grading an open-ended question response. Your task is to provide fair, constructive, and educational feedback.

QUESTION:
{{{question}}}

GRADING CRITERIA:
{{{criteria}}}

MAXIMUM SCORE: {{{maxScore}}}

STUDENT ANSWER:
{{{studentAnswer}}}

GRADING INSTRUCTIONS:

1. Analyze the student's answer objectively against the criteria
2. Provide a numerical score from 0 to {{{maxScore}}}
3. Give constructive, educational feedback in {{{language}}}
4. Be encouraging and focus on learning improvement
5. If the answer is poor, explain what's missing without being harsh
6. If the answer is good, acknowledge strengths and suggest enhancements

Return a JSON object with:
- score: numerical score (0-{{{maxScore}}})
- feedback: helpful feedback text in {{{language}}}

Be fair, educational, and supportive in your assessment.`,
    });

    const { output } = await prompt(input);
    return output!;
  }
);