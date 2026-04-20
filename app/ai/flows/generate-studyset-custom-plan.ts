'use server';

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const TaskSchema = z.object({
  task_type: z.enum(['notes', 'flashcards', 'quiz', 'wordweb', 'review']),
  title: z.string(),
  description: z.string(),
  estimated_minutes: z.number().int().min(5).max(240),
});

const DaySchema = z.object({
  day_number: z.number().int().min(1).max(120),
  summary: z.string(),
  tasks: z.array(TaskSchema).min(3).max(6),
});

const GenerateStudysetCustomPlanInputSchema = z.object({
  studysetName: z.string(),
  targetDays: z.number().int().min(1).max(60),
  minutesPerDay: z.number().int().min(10).max(480),
  selectedDates: z.array(z.string()).min(1),
  focusTopic: z.string(),
  topicCandidates: z.array(z.string()).default([]),
  contextText: z.string().default(''),
  additionalNotes: z.string().default(''),
});

const GenerateStudysetCustomPlanOutputSchema = z.object({
  days: z.array(DaySchema).min(1).max(60),
});

export type GenerateStudysetCustomPlanInput = z.infer<typeof GenerateStudysetCustomPlanInputSchema>;
export type GenerateStudysetCustomPlanOutput = z.infer<typeof GenerateStudysetCustomPlanOutputSchema>;

export async function generateStudysetCustomPlan(
  input: GenerateStudysetCustomPlanInput
): Promise<GenerateStudysetCustomPlanOutput> {
  return generateStudysetCustomPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStudysetCustomPlanPrompt',
  model: getGoogleAIModel() as any,
  input: { schema: GenerateStudysetCustomPlanInputSchema },
  output: { schema: GenerateStudysetCustomPlanOutputSchema },
  prompt: `You design high-quality day-by-day study plans.

Rules:
- Return exactly {{{targetDays}}} days.
- Each day must have 3 to 6 tasks.
- Total estimated minutes per day should be close to {{{minutesPerDay}}}.
- Use specific, source-grounded language (no generic filler).
- Mix task types over days (notes, flashcards, quiz, wordweb, review).
- Keep titles practical and actionable.
- Keep descriptions clear and concise.
- Day summaries must explain the learning focus for that day.
- Do not mention external sources or internet lookups.

Studyset name: {{{studysetName}}}
Primary focus topic: {{{focusTopic}}}
Candidate topics: {{{topicCandidates}}}
Selected dates: {{{selectedDates}}}
Context text:
{{{contextText}}}

Additional notes:
{{{additionalNotes}}}
`,
});

const generateStudysetCustomPlanFlow = ai.defineFlow(
  {
    name: 'generateStudysetCustomPlanFlow',
    inputSchema: GenerateStudysetCustomPlanInputSchema,
    outputSchema: GenerateStudysetCustomPlanOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
