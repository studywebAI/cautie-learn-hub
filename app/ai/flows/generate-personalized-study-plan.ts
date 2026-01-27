'use server';
/**
 * @fileOverview An AI agent that generates a personalized study plan based on deadlines, learning habits, and calendar.
 *
 * - generatePersonalizedStudyPlan - A function that generates a personalized study plan.
 */

import {ai, getGoogleAIModel} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePersonalizedStudyPlanInputSchema = z.object({
  deadlines: z
    .string()
    .describe('A list of deadlines for upcoming assignments and exams.'),
  learningHabits: z
    .string()
    .describe(
      'A description of the students learning habits, including preferred study times, subjects, and methods.'
    ),
  calendar: z
    .string()
    .describe(
      'The students calendar, including scheduled classes, appointments, and other commitments.'
    ),
});
type GeneratePersonalizedStudyPlanInput = z.infer<
  typeof GeneratePersonalizedStudyPlanInputSchema
>;

const GeneratePersonalizedStudyPlanOutputSchema = z.object({
  studyPlan: z.string().describe('A personalized study plan for the student.'),
});
type GeneratePersonalizedStudyPlanOutput = z.infer<
  typeof GeneratePersonalizedStudyPlanOutputSchema
>;

export async function generatePersonalizedStudyPlan(
  input: GeneratePersonalizedStudyPlanInput
): Promise<GeneratePersonalizedStudyPlanOutput> {
  return generatePersonalizedStudyPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedStudyPlanPrompt',
  model: getGoogleAIModel() as any,
  input: {schema: GeneratePersonalizedStudyPlanInputSchema},
  output: {schema: GeneratePersonalizedStudyPlanOutputSchema},
  prompt: `You are an AI study assistant. You will generate a personalized study plan for the student based on their deadlines, learning habits, and calendar.

Deadlines: {{{deadlines}}}
Learning Habits: {{{learningHabits}}}
Calendar: {{{calendar}}}

Study Plan:`,
});

const generatePersonalizedStudyPlanFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedStudyPlanFlow',
    inputSchema: GeneratePersonalizedStudyPlanInputSchema,
    outputSchema: GeneratePersonalizedStudyPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
