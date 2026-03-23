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
  imageDataUri: z.string().optional().describe('Optional image context as data URI.'),
  questionCount: z.number().optional().default(7).describe('The desired number of questions.'),
  existingQuestionIds: z.array(z.string()).optional().describe('An array of question IDs that should not be regenerated.'),
  groundingInstruction: z.string().optional().describe('Mandatory grounding constraints for factual outputs.'),
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
All questions and answers MUST be based only on the provided Source Text.
Do not use web knowledge, prior knowledge, external references, or assumptions.
If source text is missing details, stay within what is present and simplify the question set.
Never cite Wikipedia or any external source.
{{#if groundingInstruction}}
{{{groundingInstruction}}}
{{/if}}

Your task is to generate a multiple-choice quiz from the provided source text.
The quiz should have a concise and relevant title (without phrases like "a comprehensive quiz") and a brief description.
Create exactly {{{questionCount}}} questions.
Each question must have 3 or 4 answer options.
Exactly one option for each question must be correct.
{{#if existingQuestionIds}}
Do not generate questions that are identical or very similar to the questions represented by these IDs: {{{existingQuestionIds}}}.
{{/if}}

For each question, if needed, include 'source_info' referencing only the provided source text.

Source Text:
{{{sourceText}}}
{{#if imageDataUri}}

Image Context:
{{media url=imageDataUri}}
{{/if}}
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
