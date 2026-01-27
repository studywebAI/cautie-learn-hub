'use server';
/**
 * @fileOverview This file defines a Genkit flow for providing AI-powered analytics to teachers.
 *
 * The flow analyzes class-wide progress and suggests adjustments to teaching strategies.
 *
 * @file        src/ai/flows/provide-ai-powered-analytics-teacher.ts
 * @exports   provideAiPoweredAnalyticsTeacher - The function to trigger the flow.
 */

import {ai, getGoogleAIModel} from '@/ai/genkit';
import {z} from 'genkit';

const ProvideAiPoweredAnalyticsTeacherInputSchema = z.object({
  classProgressData: z.string().describe('Data representing the class progress, including student scores, common mistakes, and engagement metrics.'),
  teachingStrategy: z.string().describe('The current teaching strategy being employed.'),
});
type ProvideAiPoweredAnalyticsTeacherInput = z.infer<typeof ProvideAiPoweredAnalyticsTeacherInputSchema>;

const ProvideAiPoweredAnalyticsTeacherOutputSchema = z.object({
  suggestedAdjustments: z.string().describe('AI-suggested adjustments to the teaching strategy based on the class progress data.'),
  rationale: z.string().describe('The rationale behind the suggested adjustments, explaining why they are recommended.'),
});
type ProvideAiPoweredAnalyticsTeacherOutput = z.infer<typeof ProvideAiPoweredAnalyticsTeacherOutputSchema>;

export async function provideAiPoweredAnalyticsTeacher(input: ProvideAiPoweredAnalyticsTeacherInput): Promise<ProvideAiPoweredAnalyticsTeacherOutput> {
  return provideAiPoweredAnalyticsTeacherFlow(input);
}

const provideAiPoweredAnalyticsTeacherPrompt = ai.definePrompt({
  name: 'provideAiPoweredAnalyticsTeacherPrompt',
  model: getGoogleAIModel() as any,
  input: {
    schema: ProvideAiPoweredAnalyticsTeacherInputSchema,
  },
  output: {
    schema: ProvideAiPoweredAnalyticsTeacherOutputSchema,
  },
  prompt: `You are an AI assistant designed to analyze class progress and suggest adjustments to teaching strategies.
  Based on the following class progress data and current teaching strategy, provide actionable suggestions for improvement.

  Class Progress Data: {{{classProgressData}}}
  Current Teaching Strategy: {{{teachingStrategy}}}

  Consider factors such as student scores, common mistakes, engagement metrics, and any other relevant information.
  Provide your suggestions and explain the rationale behind them. Be concise and actionable.
  `,
});

const provideAiPoweredAnalyticsTeacherFlow = ai.defineFlow(
  {
    name: 'provideAiPoweredAnalyticsTeacherFlow',
    inputSchema: ProvideAiPoweredAnalyticsTeacherInputSchema,
    outputSchema: ProvideAiPoweredAnalyticsTeacherOutputSchema,
  },
  async input => {
    const {output} = await provideAiPoweredAnalyticsTeacherPrompt(input);
    return output!;
  }
);
