'use server';
/**
 * @fileOverview An AI agent that generates a knowledge graph from text.
 *
 * - generateKnowledgeGraph - A function that returns a list of concepts.
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const ConceptSchema = z.object({
  id: z.string().describe('A unique, kebab-case identifier for the concept.'),
  name: z.string().describe('The name of the concept.'),
  summary: z.string().describe('A one-sentence summary of the concept.'),
});

const GenerateKnowledgeGraphInputSchema = z.object({
  sourceText: z.string().describe('The source text from which to extract concepts.'),
});
type GenerateKnowledgeGraphInput = z.infer<typeof GenerateKnowledgeGraphInputSchema>;

const GenerateKnowledgeGraphOutputSchema = z.object({
  concepts: z.array(ConceptSchema).describe('An array of key concepts extracted from the text.'),
});
export type GenerateKnowledgeGraphOutput = z.infer<typeof GenerateKnowledgeGraphOutputSchema>;

export async function generateKnowledgeGraph(
  input: GenerateKnowledgeGraphInput
): Promise<GenerateKnowledgeGraphOutput> {
  return generateKnowledgeGraphFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateKnowledgeGraphPrompt',
  model: getGoogleAIModel() as any,
  input: { schema: GenerateKnowledgeGraphInputSchema },
  output: { schema: GenerateKnowledgeGraphOutputSchema },
  prompt: `You are an AI that specializes in semantic analysis and knowledge extraction. Your task is to identify the most important concepts from the provided text and represent them as a simple list.

For each concept, provide a unique ID, a clear name, and a concise one-sentence summary.

Source Text:
{{{sourceText}}}
`,
});

const generateKnowledgeGraphFlow = ai.defineFlow(
  {
    name: 'generateKnowledgeGraphFlow',
    inputSchema: GenerateKnowledgeGraphInputSchema,
    outputSchema: GenerateKnowledgeGraphOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
