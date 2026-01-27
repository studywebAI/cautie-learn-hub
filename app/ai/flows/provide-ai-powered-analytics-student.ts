'use server';
/**
 * @fileOverview An AI agent that provides students with personalized learning analytics.
 *
 * - provideAiPoweredAnalytics - A function that returns learning analytics and tailored study suggestions.
 */

import {ai, getGoogleAIModel} from '@/ai/genkit';
import {z} from 'genkit';

const ProvideAiPoweredAnalyticsInputSchema = z.object({
  studentId: z.string().describe('The ID of the student to analyze.'),
  learningHistory: z.string().describe('The learning history of the student, including topics studied, quiz scores, and time spent on each topic.'),
});
type ProvideAiPoweredAnalyticsInput = z.infer<typeof ProvideAiPoweredAnalyticsInputSchema>;

const ProvideAiPoweredAnalyticsOutputSchema = z.object({
  summary: z.string().describe('A summary of the student learning progress.'),
  weakAreas: z.string().describe('Specific weak areas where the student needs to focus.'),
  suggestedMaterials: z.string().describe('Tailored study materials recommended for the student.'),
});
type ProvideAiPoweredAnalyticsOutput = z.infer<typeof ProvideAiPoweredAnalyticsOutputSchema>;

export async function provideAiPoweredAnalytics(
  input: ProvideAiPoweredAnalyticsInput
): Promise<ProvideAiPoweredAnalyticsOutput> {
  return provideAiPoweredAnalyticsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideAiPoweredAnalyticsPrompt',
  model: getGoogleAIModel() as any,
  input: {schema: ProvideAiPoweredAnalyticsInputSchema},
  output: {schema: ProvideAiPoweredAnalyticsOutputSchema},
  prompt: `You are an AI learning assistant that provides personalized analytics to students based on their learning history.

  Analyze the following learning history of student with id {{{studentId}}}:
  {{{learningHistory}}}

  Based on the analysis, provide a summary of the student's learning progress, identify weak areas where the student needs to focus, and suggest tailored study materials.

  Ensure that the output is well-formatted and easy to understand.
  Summary:
  {{summary}}
  Weak Areas:
  {{weakAreas}}
  Suggested Materials:
  {{suggestedMaterials}}`,
});

const provideAiPoweredAnalyticsFlow = ai.defineFlow(
  {
    name: 'provideAiPoweredAnalyticsFlow',
    inputSchema: ProvideAiPoweredAnalyticsInputSchema,
    outputSchema: ProvideAiPoweredAnalyticsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
