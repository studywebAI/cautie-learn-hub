
'use server';
/**
 * @fileOverview An AI agent that generates flashcards from a given text.
 *
 * - generateFlashcards - A function that creates flashcards.
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';
import { FlashcardSchema } from '@/lib/types';

const GenerateFlashcardsInputSchema = z.object({
  sourceText: z.string().describe('The source text from which to generate flashcards.'),
  count: z.number().optional().default(10).describe('The number of flashcards to generate.'),
  existingFlashcardIds: z.array(z.string()).optional().describe('An array of flashcard front texts that should not be regenerated.'),
});
type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const GenerateFlashcardsOutputSchema = z.object({
  flashcards: z.array(FlashcardSchema).describe('An array of generated flashcards.'),
});
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;

export async function generateFlashcards(
  input: GenerateFlashcardsInput
): Promise<GenerateFlashcardsOutput> {
  return generateFlashcardsFlow(input);
}

const generateFlashcardsFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsFlow',
    inputSchema: GenerateFlashcardsInputSchema,
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async (input) => {
    const model = await getGoogleAIModel();
    const prompt = ai.definePrompt({
      name: 'generateFlashcardsPrompt',
      model,
      input: { schema: GenerateFlashcardsInputSchema },
      output: { schema: GenerateFlashcardsOutputSchema },
      prompt: `You are an expert in creating effective learning materials.
Crucially, all factual information in the flashcards must be accurate and verifiable. Prioritize information directly from the provided Source Text.
If external general knowledge is incorporated, ensure it is widely accepted and, if possible, mention the source (e.g., "Wikipedia").
Avoid making up facts or details not present in the Source Text or commonly accepted knowledge.

Your task is to generate a set of flashcards based on the provided source text. Create exactly {{{count}}} flashcards.

For each flashcard, you must provide:
1.  **id**: a unique, short, kebab-case string based on the front of the card.
2.  **front**: A key term or a question.
3.  **back**: The corresponding definition or answer.
4.  **cloze**: A "fill-in-the-blank" sentence where the "back" of the card is the missing word. The blank should be represented by "____".
5.  **source_info**: (Optional) Information about where the content for this flashcard was sourced (e.g., "Wikipedia", or "Source Text - Page 5").

{{#if existingFlashcardIds}}
Do not generate flashcards with front text that is identical or very similar to the text from this list: {{{existingFlashcardIds}}}.
{{/if}}

Example:
- id: "mitochondria"
- front: "Mitochondria"
- back: "powerhouse of the cell"
- cloze: "The mitochondria is often called the ____."

Source Text:
{{{sourceText}}}
`,
    });
    const { output } = await prompt(input);
    return output!;
  }
);
