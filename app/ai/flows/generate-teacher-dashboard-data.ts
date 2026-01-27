'use server';
/**
 * @fileOverview An AI agent that generates all data for the teacher dashboard.
 *
 * - generateTeacherDashboardData - A function that returns class overviews.
 */

import {ai, getGoogleAIModel} from '@/ai/genkit';
import {z} from 'genkit';

const ClassInfoSchema = z.object({
  id: z.string().describe('Unique identifier for the class.'),
  name: z.string().describe('The name of the class (e.g., "History 101").'),
  studentCount: z.number().describe('The number of students in the class.'),
  averageProgress: z.number().describe('The average progress of all students in the class (0-100).'),
  assignmentsDue: z.number().describe('The number of assignments due this week.'),
  alerts: z.array(z.string()).describe('A list of 1-2 important AI-generated alerts or insights for this class.'),
});

const GenerateTeacherDashboardDataInputSchema = z.object({
  teacherName: z.string().describe('The name of the teacher.'),
  classNames: z.array(z.string()).describe('A list of class names the teacher is teaching.'),
});
type GenerateTeacherDashboardDataInput = z.infer<
  typeof GenerateTeacherDashboardDataInputSchema
>;

const GenerateTeacherDashboardDataOutputSchema = z.object({
  classes: z.array(ClassInfoSchema).describe('A list of classes taught by the teacher.'),
});
export type GenerateTeacherDashboardDataOutput = z.infer<
  typeof GenerateTeacherDashboardDataOutputSchema
>;

export async function generateTeacherDashboardData(
  input: GenerateTeacherDashboardDataInput
): Promise<GenerateTeacherDashboardDataOutput> {
  return generateTeacherDashboardDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTeacherDashboardDataPrompt',
  model: getGoogleAIModel() as any,
  input: {schema: GenerateTeacherDashboardDataInputSchema},
  output: {schema: GenerateTeacherDashboardDataOutputSchema},
  prompt: `You are an AI assistant for a teacher named {{{teacherName}}}. You need to generate a realistic and coherent set of data for their dashboard. The teacher is currently teaching the following classes: {{{classNames}}}.

Generate the following data in English:
1.  **Classes**: Create an array for the specified class names. For each class, generate realistic data:
    *   **studentCount**: A believable number of students (e.g., 15-30).
    *   **averageProgress**: A realistic average progress percentage for the whole class.
    *   **assignmentsDue**: A small number of assignments due soon.
    *   **alerts**: One or two concise, actionable alerts. Examples: "Several students are stuck on the 'Renaissance' quiz.", "Class engagement was low this week.", "Project proposals are due Friday."

Ensure all generated data is in English and all IDs are unique strings.
`,
});

const generateTeacherDashboardDataFlow = ai.defineFlow(
  {
    name: 'generateTeacherDashboardDataFlow',
    inputSchema: GenerateTeacherDashboardDataInputSchema,
    outputSchema: GenerateTeacherDashboardDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
