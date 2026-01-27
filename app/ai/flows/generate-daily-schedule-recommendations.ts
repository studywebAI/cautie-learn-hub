'use server';
/**
 * @fileOverview AI agent for generating smart daily schedule recommendations
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const TaskRecommendationSchema = z.object({
  taskId: z.string().describe('The ID of the task being recommended.'),
  suggestedDate: z.string().describe('Suggested date in YYYY-MM-DD format.'),
  suggestedTime: z.string().optional().describe('Suggested time in HH:MM format (optional).'),
  priority: z.enum(['low', 'medium', 'high']).describe('Recommended priority level.'),
  estimatedDuration: z.number().describe('Estimated duration in minutes.'),
  reasoning: z.string().describe('Brief reasoning for this recommendation.'),
});

const DailyScheduleRecommendationSchema = z.object({
  recommendations: z.array(TaskRecommendationSchema).describe('Array of task recommendations for the day.'),
  overallAdvice: z.string().describe('General advice for the day\'s schedule.'),
});

const GenerateDailyScheduleInputSchema = z.object({
  currentDate: z.string().describe('Current date in YYYY-MM-DD format.'),
  personalTasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    date: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    estimatedDuration: z.number().optional(),
    subject: z.string().optional(),
  })).describe('User\'s personal tasks.'),
  assignments: z.array(z.object({
    id: z.string(),
    title: z.string(),
    due_date: z.string().optional(),
    subject: z.string().optional(),
  })).describe('User\'s assignments.'),
  userPreferences: z.object({
    preferredStudyTimes: z.array(z.string()).optional().describe('Preferred time slots, e.g., ["09:00-11:00", "14:00-16:00"]'),
    breakFrequency: z.number().optional().describe('Minutes between breaks.'),
  }).optional().describe('User preferences for scheduling.'),
});

export type GenerateDailyScheduleInput = z.infer<typeof GenerateDailyScheduleInputSchema>;
export type DailyScheduleRecommendation = z.infer<typeof DailyScheduleRecommendationSchema>;

export async function generateDailyScheduleRecommendations(
  input: GenerateDailyScheduleInput
): Promise<DailyScheduleRecommendation> {
  return generateDailyScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDailySchedulePrompt',
  model: getGoogleAIModel() as any,
  input: { schema: GenerateDailyScheduleInputSchema },
  output: { schema: DailyScheduleRecommendationSchema },
  prompt: `You are an expert academic scheduler. Based on the user's tasks, assignments, and preferences, generate optimized daily schedule recommendations.

Current date: {{{currentDate}}}

Tasks and assignments provided:
- Personal Tasks: {{#each personalTasks}}- {{{title}}} (ID: {{{id}}}, Date: {{{date}}}, Priority: {{{priority}}}, Duration: {{{estimatedDuration}}} min, Subject: {{{subject}}})
{{/each}}

- Assignments: {{#each assignments}}- {{{title}}} (ID: {{{id}}}, Due: {{{due_date}}}, Subject: {{{subject}}})
{{/each}}

User preferences:
- Preferred study times: {{#each userPreferences.preferredStudyTimes}}{{{.}}}{{else}}Not specified{{/each}}
- Break frequency: {{{userPreferences.breakFrequency}}} minutes (if applicable)

Guidelines:
- Recommend priorities for tasks that don't have them.
- Suggest optimal dates and times for tasks without dates.
- Estimate durations for tasks without them (reasonable study times).
- Ensure assignments are scheduled before due dates.
- Respect preferred study times if specified.
- Suggest breaks to prevent burnout.
- Focus on tasks due soon or high priority.
- Provide reasoning for each recommendation.
- Keep overall advice practical and motivating.`,
});

const generateDailyScheduleFlow = ai.defineFlow(
  {
    name: 'generateDailyScheduleFlow',
    inputSchema: GenerateDailyScheduleInputSchema,
    outputSchema: DailyScheduleRecommendationSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);