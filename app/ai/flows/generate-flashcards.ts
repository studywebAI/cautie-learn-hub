
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
  groundingInstruction: z.string().optional().describe('Mandatory grounding constraints for factual outputs.'),
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
All flashcard content MUST be derived only from the provided Source Text.
Do not use web knowledge, prior knowledge, external references, or assumptions.
Never cite Wikipedia or any external source.
{{#if groundingInstruction}}
{{{groundingInstruction}}}
{{/if}}

Your task is to generate a set of flashcards based on the provided source text. Create exactly {{{count}}} flashcards.

For each flashcard, you must provide:
1.  **id**: a unique, short, kebab-case string based on the front of the card.
2.  **front**: A key term or a question.
3.  **back**: The corresponding definition or answer.
4.  **cloze**: A "fill-in-the-blank" sentence where the "back" of the card is the missing word. The blank should be represented by "____".
5.  **source_info**: (Optional) Source reference that points only to the provided Source Text.

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
