'use server';

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const SUPPORTED_BLOCK_TYPES = ['text', 'multiple_choice', 'open_question', 'fill_in_blank', 'image', 'video'] as const;

const InsertBlockCommandInputSchema = z.object({
  command: z.string().describe('The teacher\'s instruction, e.g. "maak een multiple choice blok over fotosynthese"'),
  contextSummary: z.string().describe('Short summary of existing blocks already in this assignment, for context/continuity'),
  language: z.string().describe('Language to write generated content in'),
});

const InsertBlockCommandOutputSchema = z.object({
  blockType: z.enum(SUPPORTED_BLOCK_TYPES).describe('Which block type best matches the command'),
  header: z.string().optional().describe('For text blocks: a short heading'),
  content: z.string().optional().describe('For text blocks: the body content'),
  question: z.string().optional().describe('For multiple_choice/open_question: the question text'),
  options: z.array(z.object({ text: z.string(), correct: z.boolean() })).optional().describe('For multiple_choice: 4 options, exactly one (or more if requested) marked correct'),
  correct_answer: z.string().optional().describe('For open_question: a model answer'),
  grading_criteria: z.string().optional().describe('For open_question: what to check for when grading'),
  fill_text: z.string().optional().describe('For fill_in_blank: sentence with blanks marked as ___'),
  fill_answers: z.array(z.string()).optional().describe('For fill_in_blank: the correct word(s) for each ___ in order'),
  caption: z.string().optional().describe('For image/video: a short caption — the actual file/url is added by the teacher afterwards'),
});

export type InsertBlockCommandOutput = z.infer<typeof InsertBlockCommandOutputSchema>;

// Turns a teacher's free-text command into a single block to insert into the
// assignment editor — an insert-command, not a structure generator. See
// docs/subjects-feature-brainstorm.md section A point 1.
export async function insertBlockCommand(
  command: string,
  contextSummary: string,
  language: string = 'Dutch',
): Promise<InsertBlockCommandOutput> {
  const prompt = ai.definePrompt({
    name: 'insertBlockCommandPrompt',
    model: getGoogleAIModel() as any,
    input: { schema: InsertBlockCommandInputSchema },
    output: { schema: InsertBlockCommandOutputSchema },
    prompt: `You turn a teacher's short instruction into exactly ONE content block for a lesson editor.

Supported block types: text (plain content/leerstof), multiple_choice, open_question, fill_in_blank, image, video.

Rules:
- Pick the ONE block type that best matches the instruction. If the instruction doesn't specify a type but describes content to explain, use "text".
- If the instruction asks to generate a question/exercise, generate real, correct, on-topic content — not a placeholder.
- If the instruction is vague about subject matter, use the existing blocks (context below) to infer topic and stay consistent.
- For multiple_choice: always produce exactly 4 options unless the instruction says otherwise, and mark exactly one as correct unless it explicitly asks for multiple correct answers.
- For image/video: you cannot generate the actual file — only produce a caption; leave the rest for the teacher to fill in after inserting.
- Write all generated text in {{{language}}}.
- Return JSON only, matching the schema exactly.

EXISTING CONTENT IN THIS ASSIGNMENT (context, for topic/tone consistency):
{{{contextSummary}}}

TEACHER INSTRUCTION:
{{{command}}}
`,
  });

  const { output } = await prompt({ command, contextSummary, language });
  if (!output) {
    return { blockType: 'text', header: '', content: '' };
  }
  return output;
}
