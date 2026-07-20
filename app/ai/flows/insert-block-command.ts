'use server';

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const SUPPORTED_BLOCK_TYPES = [
  'text', 'multiple_choice', 'open_question', 'fill_in_blank', 'image', 'video',
  'flashcard', 'table', 'number_line', 'diagram_labeling', 'graph_plot',
] as const;

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
  cards: z.array(z.object({ front: z.string(), back: z.string() })).optional().describe('For flashcard: 5-8 front/back pairs on the topic'),
  table_columns: z.array(z.string()).optional().describe('For table: 2-4 column header labels'),
  table_rows: z.array(z.array(z.string())).optional().describe('For table: 3-5 rows, each an array of cell values with the same length as table_columns. Fill every cell with a real value — the teacher marks which cells students must fill in afterward, so generate the fully correct table.'),
  number_line_prompt: z.string().optional().describe('For number_line: the question/prompt shown above the slider'),
  number_line_min: z.number().optional().describe('For number_line: lowest value on the scale'),
  number_line_max: z.number().optional().describe('For number_line: highest value on the scale'),
  number_line_step: z.number().optional().describe('For number_line: increment between tick marks'),
  number_line_correct_value: z.number().optional().describe('For number_line: the correct value on the scale'),
  number_line_tolerance: z.number().optional().describe('For number_line: how far off the student may be and still be correct (0 for exact)'),
  diagram_label_bank: z.array(z.string()).optional().describe('For diagram_labeling: 4-8 candidate label words for the word bank on the topic. The teacher uploads the image and places the numbered points afterward — you cannot see the image.'),
  graph_x_label: z.string().optional().describe('For graph_plot: x-axis label'),
  graph_y_label: z.string().optional().describe('For graph_plot: y-axis label'),
  graph_x_min: z.number().optional().describe('For graph_plot: x-axis minimum'),
  graph_x_max: z.number().optional().describe('For graph_plot: x-axis maximum'),
  graph_y_min: z.number().optional().describe('For graph_plot: y-axis minimum'),
  graph_y_max: z.number().optional().describe('For graph_plot: y-axis maximum'),
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

Supported block types:
- text (plain content/leerstof)
- multiple_choice, open_question, fill_in_blank (standard question types)
- image, video (media — you cannot generate the file itself)
- flashcard (a deck of front/back study cards)
- table (a grid of data, some cells for students to fill in)
- number_line (place a value on a labeled scale)
- diagram_labeling (label numbered points on an image with words from a word bank)
- graph_plot (plot points on an x/y coordinate grid)

Rules:
- Pick the ONE block type that best matches the instruction. If the instruction doesn't specify a type but describes content to explain, use "text".
- If the instruction asks to generate a question/exercise, generate real, correct, on-topic content — not a placeholder.
- If the instruction is vague about subject matter, use the existing blocks (context below) to infer topic and stay consistent.
- For multiple_choice: always produce exactly 4 options unless the instruction says otherwise, and mark exactly one as correct unless it explicitly asks for multiple correct answers.
- For image/video: you cannot generate the actual file — only produce a caption; leave the rest for the teacher to fill in after inserting.
- For flashcard: generate 5-8 genuinely useful front/back study pairs on the topic.
- For table: generate a complete, fully-correct table (table_columns + table_rows) on the topic — the teacher decides afterward which cells become blanks for students.
- For number_line: pick a sensible min/max/step range for the topic (e.g. a physics constant, a percentage, a date range) and the correct value within it.
- For diagram_labeling: you cannot see any image, so only produce a word bank (diagram_label_bank) of terms relevant to the topic — the teacher uploads the diagram and places the numbered points afterward.
- For graph_plot: pick sensible axis labels and ranges for the topic (e.g. "time" vs "distance"); leave the exact correct points as a light default — the teacher refines them afterward, same as the table/diagram cases above.
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
