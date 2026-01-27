
'use server';
/**
 * @fileOverview An AI agent that generates a single flashcard from a given text.
 *
 * - generateSingleFlashcard - A function that creates one flashcard.
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';
import { FlashcardSchema, type Flashcard } from '@/lib/types';


const GenerateSingleFlashcardInputSchema = z.object({
  sourceText: z.string().describe('The source text from which to generate the flashcard.'),
  existingFlashcardIds: z.array(z.string()).optional().describe('An array of flashcard front texts that should not be regenerated to avoid duplicates.'),
});
type GenerateSingleFlashcardInput = z.infer<typeof GenerateSingleFlashcardInputSchema>;


export async function generateSingleFlashcard(
  input: GenerateSingleFlashcardInput
): Promise<Flashcard> {
  return generateSingleFlashcardFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSingleFlashcardPrompt',
  model: getGoogleAIModel() as any,
  input: { schema: GenerateSingleFlashcardInputSchema },
  output: { schema: FlashcardSchema },
  prompt: `You are an expert in creating effective learning materials.
Crucially, all factual information in the flashcard must be accurate and verifiable. Prioritize information directly from the provided Source Text.
If external general knowledge is incorporated, ensure it is widely accepted and, if possible, mention the source (e.g., "Wikipedia").
Avoid making up facts or details not present in the Source Text or commonly accepted knowledge.

Your task is to generate a single, unique flashcard based on the provided source text.

For the flashcard, you must provide:
1.  **id**: a unique, short, kebab-case string based on the front of the card.
2.  **front**: A key term or a question.
3.  **back**: The corresponding definition or answer.
4.  **cloze**: A "fill-in-the-blank" sentence based on the definition where the word(s) from the 'back' are replaced with "____". This sentence should provide enough context to guess the missing word.
5.  **source_info**: (Optional) Information about where the content for this flashcard was sourced (e.g., "Wikipedia", or "Source Text - Page 5").

{{#if existingFlashcardIds}}
Do not generate a flashcard with front text that is identical or very similar to the text from this list: {{{existingFlashcardIds}}}.
{{/if}}

Source Text:
{{{sourceText}}}
`,
});

const generateSingleFlashcardFlow = ai.defineFlow(
  {
    name: 'generateSingleFlashcardFlow',
    inputSchema: GenerateSingleFlashcardInputSchema,
    outputSchema: FlashcardSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
