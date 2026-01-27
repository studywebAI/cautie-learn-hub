'use server';
/**
 * @fileOverview An AI agent that generates a multiple-choice quiz from source text.
 *
 * - generateQuiz - A function that creates a quiz.
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';
import { QuizSchema, type Quiz } from '@/lib/types';


const GenerateQuizInputSchema = z.object({
  sourceText: z.string().describe('The source text from which to generate the quiz.'),
  questionCount: z.number().optional().default(7).describe('The desired number of questions.'),
  existingQuestionIds: z.array(z.string()).optional().describe('An array of question IDs that should not be regenerated.'),
});
type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;


export async function generateQuiz(
  input: GenerateQuizInput
): Promise<Quiz> {
  return generateQuizFlow(input);
}

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: QuizSchema,
  },
  async (input) => {
    console.log(`[generateQuizFlow] Starting with sourceText length: ${input.sourceText.length}, questionCount: ${input.questionCount}`);
    const model = await getGoogleAIModel();
    const prompt = ai.definePrompt({
      name: 'generateQuizPrompt',
      model,
      input: { schema: GenerateQuizInputSchema },
      output: { schema: QuizSchema },
      prompt: `You are an expert in creating educational content.
Crucially, all factual information in the quiz questions and answers must be accurate and verifiable. Prioritize information directly from the provided Source Text.
If external general knowledge is incorporated, ensure it is widely accepted and, if possible, mention the source (e.g., "Wikipedia").
Avoid making up facts or details not present in the Source Text or commonly accepted knowledge.

Your task is to generate a multiple-choice quiz from the provided source text.
The quiz should have a concise and relevant title (without phrases like "a comprehensive quiz") and a brief description.
Create exactly {{{questionCount}}} questions.
Each question must have 3 or 4 answer options.
Exactly one option for each question must be correct.
{{#if existingQuestionIds}}
Do not generate questions that are identical or very similar to the questions represented by these IDs: {{{existingQuestionIds}}}.
{{/if}}

For each question, if you use information from an external trusted source (like Wikipedia) or if you want to highlight a specific page/section from the source text, include a 'source_info' field in the question's output, e.g., "Wikipedia", or "Source Text - Page 5".

Source Text:
{{{sourceText}}}
`,
    });
    try {
      const { output } = await prompt(input);
      console.log(`[generateQuizFlow] Success: quiz title: ${output?.title}`);
      return output!;
    } catch (err) {
      console.error(`[generateQuizFlow] Error: ${err}`);
      throw err;
    }
  }
);
