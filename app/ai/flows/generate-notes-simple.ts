'use server';
/**
 * @fileOverview Simplified AI agent that generates structured notes from text.
 * Similar to flashcards/quiz - reliable and focused.
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const NoteSchema = z.object({
  title: z.string().describe('The title of the note section.'),
  content: z.string().describe('The detailed content in markdown format.'),
});

const GenerateNotesInputSchema = z.object({
  sourceText: z.string().describe('The source text from which to generate notes.'),
  topic: z.string().optional().describe('The main topic to focus on.'),
  length: z.string().optional().describe('The desired length: short, medium, long.').default('medium'),
  style: z.string().optional().describe('The style: structured, bullet-points, standard.').default('structured'),
});

type GenerateNotesInput = z.infer<typeof GenerateNotesInputSchema>;

const GenerateNotesOutputSchema = z.object({
  notes: z.array(NoteSchema).describe('An array of generated note sections.'),
});
export type GenerateNotesOutput = z.infer<typeof GenerateNotesOutputSchema>;

export async function generateNotes(
  input: GenerateNotesInput
): Promise<GenerateNotesOutput> {
  return generateNotesFlow(input);
}

const generateNotesFlow = ai.defineFlow(
  {
    name: 'generateNotesFlow',
    inputSchema: GenerateNotesInputSchema,
    outputSchema: GenerateNotesOutputSchema,
  },
  async (input) => {
    const model = await getGoogleAIModel();
    const prompt = ai.definePrompt({
      name: 'generateNotesPrompt',
      model,
      input: { schema: GenerateNotesInputSchema },
      output: { schema: GenerateNotesOutputSchema },
      prompt: `You are an expert educator. Create well-structured notes from the provided text.

Source Text:
{{{sourceText}}}

{{#if topic}}
Focus Topic: {{{topic}}}
{{/if}}

{{#if length}}
Desired Length: {{{length}}} (short: 2-3 main sections, medium: 4-6 sections, long: 6-8 sections)
{{/if}}

{{#if style}}
Style: {{{style}}}
- "structured": Use clear headings and subheadings with organized content
- "bullet-points": Use hierarchical bullet points
- "standard": Clean paragraphs with headings
{{/if}}

Create comprehensive notes with multiple sections. Each section should have:
- A clear, descriptive title
- Detailed content in markdown format
- Logical organization of the information

Output as JSON: { "notes": [ { "title": "Section Title", "content": "Markdown content here" } ] }`,
    });
    const { output } = await prompt(input);
    return output!;
  }
);