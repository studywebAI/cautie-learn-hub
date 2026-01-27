'use server';
/**
 * @fileOverview An AI agent that generates a multiple-choice question from a flashcard.
 *
 * - generateMultipleChoiceFromFlashcard - A function that creates a question.
 * - GenerateMultipleChoiceFromFlashcardInput - The input type for the function.
 * - McqQuestion - The return type for the function (the question object).
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';
import { McqQuestionSchema } from '@/lib/types';
import type { McqQuestion } from '@/lib/types';


const GenerateMultipleChoiceFromFlashcardInputSchema = z.object({
  front: z.string().describe("The front of the flashcard (the term or prompt)."),
  back: z.string().describe("The back of the flashcard (the definition or answer)."),
});
export type GenerateMultipleChoiceFromFlashcardInput = z.infer<typeof GenerateMultipleChoiceFromFlashcardInputSchema>;


export async function generateMultipleChoiceFromFlashcard(
  input: GenerateMultipleChoiceFromFlashcardInput
): Promise<McqQuestion> {
  return generateMcqFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMcqFromFlashcardPrompt',
  model: getGoogleAIModel() as any,
  input: { schema: GenerateMultipleChoiceFromFlashcardInputSchema },
  output: { schema: McqQuestionSchema },
  prompt: `You are an expert in creating educational content. Your task is to generate a single multiple-choice question based on a flashcard.

The flashcard has a "front" and a "back".
- The "front" is the prompt: "{{{front}}}"
- The "back" is the correct answer: "{{{back}}}"

Your task:
1.  Create a clear question based on the flashcard's "front". The ID for the question should be a unique kebab-case string.
2.  The "back" of the flashcard is the correct answer. Include it as one of the options.
3.  Generate 2 or 3 plausible but incorrect "distractor" options. They should be related to the topic but clearly wrong.
4.  The total number of options should be 3 or 4.
5.  Each option needs a unique ID (e.g., "a", "b", "c").
6.  Shuffle the options so the correct answer is not always in the same position.
7.  Return the ID of the correct option in the 'correctOptionId' field.
`,
});

const generateMcqFlow = ai.defineFlow(
  {
    name: 'generateMcqFlow',
    inputSchema: GenerateMultipleChoiceFromFlashcardInputSchema,
    outputSchema: McqQuestionSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
