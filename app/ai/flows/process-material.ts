'use server';
/**
 * @fileOverview Processes user-provided material (text or file) and suggests learning activities.
 *
 * - processMaterial - Analyzes content and provides a summary and suggested actions.
 */

import {ai, getGoogleAIModel} from '@/ai/genkit';
import {z} from 'genkit';

const ProcessMaterialInputSchema = z.object({
  text: z.string().optional().describe('Pasted text content.'),
  fileDataUri: z.string().optional().describe("A file encoded as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  language: z.string().optional().describe('The language for the output, e.g., "en", "nl", "fr". Defaults to English.'),
});
type ProcessMaterialInput = z.infer<typeof ProcessMaterialInputSchema>;

const SuggestedActionSchema = z.object({
  id: z.enum(['create-a-summary', 'generate-a-quiz', 'make-flashcards']).describe('Unique ID for the action.'),
  label: z.string().describe('The button text for the action (e.g., "Create a summary").'),
  description: z.string().describe('A brief description of what this action does.'),
  icon: z.enum(['FileText', 'BrainCircuit', 'BookCopy']).describe('Icon to display with the action.'),
});

const ProcessMaterialOutputSchema = z.object({
  analysis: z.object({
    title: z.string().describe('A suitable title for the provided content.'),
    topic: z.string().describe('The main topic or subject of the content.'),
    summary: z.string().describe('A concise summary of the key points.'),
    sourceText: z.string().describe('The full text extracted from the input source.'),
  }),
  suggestedActions: z.array(SuggestedActionSchema).describe('A list of AI-suggested next steps or activities.'),
});
export type ProcessMaterialOutput = z.infer<typeof ProcessMaterialOutputSchema>;

export async function processMaterial(input: ProcessMaterialInput): Promise<ProcessMaterialOutput> {
  return processMaterialFlow(input);
}

const processMaterialFlow = ai.defineFlow(
  {
    name: 'processMaterialFlow',
    inputSchema: ProcessMaterialInputSchema,
    outputSchema: ProcessMaterialOutputSchema,
  },
  async input => {
    const model = await getGoogleAIModel();
    const prompt = ai.definePrompt({
      name: 'processMaterialPrompt',
      model,
      input: {schema: ProcessMaterialInputSchema},
      output: {schema: ProcessMaterialOutputSchema},
      prompt: `You are an expert learning assistant. Your first task is to extract all text from the provided material. Then, analyze the extracted text. Your analysis should result in a summary and suggestions for relevant learning activities.

If both text and a file are provided, use the text as additional context or specific instructions for analyzing the file content.

The entire output should be in the language specified by the user. The language code is: {{{language}}}. If no language is provided, default to English.

Your output must include:
1.  **sourceText**: The full, extracted text from the material.
2.  **analysis.title**: A short, descriptive title for the material.
3.  **analysis.topic**: The main topic or subject (e.g., "History", "Physics", "Poetry").
4.  **analysis.summary**: A concise summary of the key points.
5.  **suggestedActions**: Based on the content, suggest 3 relevant actions. The action IDs MUST be from this list: "create-a-summary", "generate-a-quiz", "make-flashcards".
- For 'create-a-summary', the label should be 'Create a summary'.
- For 'generate-a-quiz', the label should be 'Generate a quiz'.
- For 'make-flashcards', the label should be 'Make flashcards'.
Provide a brief description for each suggested action. Make sure all labels and descriptions are in the requested language.

Material to analyze:
{{#if text}}
Text:
{{{text}}}
{{/if}}
{{#if fileDataUri}}
File:
{{media url=fileDataUri}}
{{/if}}
`,
    });
    const {output} = await prompt(input);
    return output!;
  }
);
