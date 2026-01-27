'use server';
/**
 * @fileOverview An AI agent that generates creative ideas for a new class.
 *
 * - generateClassIdeas - A function that returns a list of class ideas.
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const ClassIdeaSchema = z.object({
  id: z.string().describe('A unique identifier for this class idea.'),
  name: z.string().describe('A creative and engaging name for the class.'),
  description: z.string().describe('A one-sentence description of what the class covers.'),
});

const GenerateClassIdeasInputSchema = z.object({
  subject: z.string().describe('The general subject for the class (e.g., "History", "Physics").'),
});
type GenerateClassIdeasInput = z.infer<typeof GenerateClassIdeasInputSchema>;

const GenerateClassIdeasOutputSchema = z.object({
  ideas: z.array(ClassIdeaSchema).describe('An array of 3-4 creative class ideas.'),
});
export type GenerateClassIdeasOutput = z.infer<typeof GenerateClassIdeasOutputSchema>;


export async function generateClassIdeas(
  input: GenerateClassIdeasInput
): Promise<GenerateClassIdeasOutput> {
  return generateClassIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateClassIdeasPrompt',
  model: getGoogleAIModel() as any,
  input: { schema: GenerateClassIdeasInputSchema },
  output: { schema: GenerateClassIdeasOutputSchema },
  prompt: `You are an AI curriculum designer helping a teacher. Your task is to brainstorm engaging class ideas based on a subject.

Subject: {{{subject}}}

Generate 3-4 creative and distinct class ideas. For each idea, provide a compelling name and a concise, one-sentence description.
Make the names sound interesting and not generic (e.g., instead of "History 101", suggest "The Age of Revolutions: 1750-1914").
The description should clearly state what the class is about.
`,
});

const generateClassIdeasFlow = ai.defineFlow(
  {
    name: 'generateClassIdeasFlow',
    inputSchema: GenerateClassIdeasInputSchema,
    outputSchema: GenerateClassIdeasOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
