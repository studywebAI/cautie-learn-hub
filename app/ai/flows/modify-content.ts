'use server';

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const ModifyContentInputSchema = z.object({
  prompt: z.string().describe('The modification request from the user'),
  scope: z.enum(['block', 'page', 'assignment']).describe('Scope of modification'),
  blockData: z.any().optional().describe('Data for block-level modification'),
  pageData: z.any().optional().describe('Data for page-level modification'),
  assignmentData: z.any().optional().describe('Data for assignment-level modification'),
  blockType: z.string().describe('Type of block being modified'),
});

const ModifyContentOutputSchema = z.object({
  modifiedData: z.any().describe('The modified content data'),
  success: z.boolean().describe('Whether modification was successful'),
  message: z.string().optional().describe('Additional information'),
});

type ModifyContentInput = z.infer<typeof ModifyContentInputSchema>;

export async function modifyContent(
  input: ModifyContentInput
) {
  return modifyContentFlow(input);
}

const modifyContentFlow = ai.defineFlow(
  {
    name: 'modifyContentFlow',
    inputSchema: ModifyContentInputSchema,
    outputSchema: ModifyContentOutputSchema,
  },
  async (input) => {
    const model = await getGoogleAIModel();
    const prompt = ai.definePrompt({
      name: 'modifyContentPrompt',
      model,
      input: { schema: ModifyContentInputSchema },
      output: { schema: ModifyContentOutputSchema },
      prompt: `You are an AI assistant helping teachers modify educational content. Your task is to modify the provided content based on the user's request.

SCOPE: {{{scope}}}
BLOCK TYPE: {{{blockType}}}

USER REQUEST: {{{prompt}}}

CONTENT TO MODIFY:
{{#if blockData}}
{{{blockData}}}
{{/if}}
{{#if pageData}}
{{{pageData}}}
{{/if}}
{{#if assignmentData}}
{{{assignmentData}}}
{{/if}}

INSTRUCTIONS:
1. Analyze the user's modification request
2. Modify the content appropriately based on the scope and block type
3. Maintain educational quality and accuracy
4. Return the modified content in the appropriate format
5. Be helpful and preserve the educational intent

Return a JSON object with:
- modifiedData: The modified content data
- success: true if successful, false otherwise
- message: Optional additional information

For block-level modifications, modify the specific block data.
For page/assignment scope, provide guidance on how to distribute changes.`,
    });

    const { output } = await prompt(input);
    return output!;
  }
);