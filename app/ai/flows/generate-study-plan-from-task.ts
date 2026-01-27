'use server';
/**
 * @fileOverview An AI agent that breaks a single large task into a smaller, actionable study plan.
 *
 * - generateStudyPlanFromTask - A function that generates a study plan for a single task.
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';
import { format } from 'date-fns';

const StudySubTaskSchema = z.object({
  title: z.string().describe('The title of the sub-task (e.g., "Review Chapter 1", "Practice problems").'),
  date: z.string().describe('The suggested date for this sub-task in YYYY-MM-DD format.'),
});

const GenerateStudyPlanFromTaskInputSchema = z.object({
  taskTitle: z.string().describe('The title of the main task to be broken down.'),
  taskDueDate: z.string().describe('The final due date for the main task, in YYYY-MM-DD format.'),
  todayDate: z.string().describe('The current date, in YYYY-MM-DD format, to use as a starting point.'),
});
type GenerateStudyPlanFromTaskInput = z.infer<typeof GenerateStudyPlanFromTaskInputSchema>;

const GenerateStudyPlanFromTaskOutputSchema = z.object({
  subTasks: z.array(StudySubTaskSchema).describe('An array of 2-4 generated sub-tasks, spread out between today and the due date.'),
});
export type GenerateStudyPlanFromTaskOutput = z.infer<typeof GenerateStudyPlanFromTaskOutputSchema>;

export async function generateStudyPlanFromTask(
  input: GenerateStudyPlanFromTaskInput
): Promise<GenerateStudyPlanFromTaskOutput> {
  return generateStudyPlanFromTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStudyPlanFromTaskPrompt',
  model: getGoogleAIModel() as any,
  input: { schema: GenerateStudyPlanFromTaskInputSchema },
  output: { schema: GenerateStudyPlanFromTaskOutputSchema },
  prompt: `You are an expert academic planner. A student has a single large task and needs a simple, actionable study plan to prepare for it.

Today's date is: {{{todayDate}}}
The student's task is: "{{{taskTitle}}}"
The final due date is: {{{taskDueDate}}}

Your job is to break this main task into 2-4 smaller, logical sub-tasks.
- Give each sub-task a clear, actionable title.
- Distribute these sub-tasks reasonably over the available time between today and the due date.
- Do not schedule any tasks on the due date itself; that day is for final review or submission.
- Do not schedule any tasks in the past.
- The dates must be in YYYY-MM-DD format.

Example:
Task: "Prepare for Biology Exam on Cell Division"
Due Date: 2024-10-28
Today: 2024-10-21

Output Sub-tasks:
1. Title: "Review notes on Mitosis", Date: "2024-10-22"
2. Title: "Create flashcards for key terms", Date: "2024-10-24"
3. Title: "Take practice quiz on Meiosis", Date: "2024-10-26"
4. Title: "Final review of all concepts", Date: "2024-10-27"
`,
});

const generateStudyPlanFromTaskFlow = ai.defineFlow(
  {
    name: 'generateStudyPlanFromTaskFlow',
    inputSchema: GenerateStudyPlanFromTaskInputSchema,
    outputSchema: GenerateStudyPlanFromTaskOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
