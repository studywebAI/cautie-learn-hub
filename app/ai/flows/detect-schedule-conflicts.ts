'use server';
/**
 * @fileOverview AI agent for detecting schedule conflicts
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const ConflictSchema = z.object({
  taskId1: z.string().describe('ID of the first conflicting task.'),
  taskId2: z.string().describe('ID of the second conflicting task.'),
  conflictType: z.enum(['time_overlap', 'dependency_violation', 'resource_conflict']).describe('Type of conflict.'),
  severity: z.enum(['low', 'medium', 'high']).describe('Severity of the conflict.'),
  description: z.string().describe('Description of the conflict.'),
  suggestion: z.string().describe('Suggestion to resolve the conflict.'),
});

const ConflictDetectionResultSchema = z.object({
  conflicts: z.array(ConflictSchema).describe('List of detected conflicts.'),
  hasConflicts: z.boolean().describe('Whether any conflicts were detected.'),
  summary: z.string().describe('Summary of conflicts found.'),
});

const DetectConflictsInputSchema = z.object({
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    date: z.string().optional(),
    time: z.string().optional(),
    duration: z.number().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    dependencies: z.array(z.string()).optional(),
    type: z.enum(['personal', 'assignment']).optional(),
  })).describe('All tasks to check for conflicts.'),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional().describe('Date range to check (optional).'),
});

export type DetectConflictsInput = z.infer<typeof DetectConflictsInputSchema>;
export type ConflictDetectionResult = z.infer<typeof ConflictDetectionResultSchema>;

export async function detectScheduleConflicts(
  input: DetectConflictsInput
): Promise<ConflictDetectionResult> {
  return detectConflictsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectConflictsPrompt',
  model: getGoogleAIModel() as any,
  input: { schema: DetectConflictsInputSchema },
  output: { schema: ConflictDetectionResultSchema },
  prompt: `You are an expert scheduler. Analyze the provided tasks for potential conflicts.

Tasks:
{{#each tasks}}- ID: {{{id}}}, Title: "{{{title}}}", Date: {{{date}}}, Time: {{{time}}}, Duration: {{{duration}}} min, Priority: {{{priority}}}, Dependencies: {{#each dependencies}}{{{.}}}{{else}}none{{/each}}, Type: {{{type}}}
{{/each}}

Date range to check: {{#if dateRange}}from {{{dateRange.start}}} to {{{dateRange.end}}}{{else}}all dates{{/if}}

Identify conflicts such as:
- Time overlaps (tasks scheduled at the same time)
- Dependency violations (task scheduled before its dependencies)
- Resource conflicts (e.g., high-priority tasks competing for time)
- Overloading (too many tasks in one day)

For each conflict:
- Specify the type and severity
- Provide a clear description
- Suggest a resolution

If no conflicts, set hasConflicts to false and provide a positive summary.`,
});

const detectConflictsFlow = ai.defineFlow(
  {
    name: 'detectConflictsFlow',
    inputSchema: DetectConflictsInputSchema,
    outputSchema: ConflictDetectionResultSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);