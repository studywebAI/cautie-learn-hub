'use server';

/**
 * @fileOverview AI agent that generates complete assignment content including materials, quizzes, and learning objectives
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const AssignmentContentSchema = z.object({
  title: z.string().describe('Assignment title'),
  description: z.string().describe('Detailed assignment description'),
  learning_objectives: z.array(z.string()).describe('Learning objectives for this assignment'),
  materials: z.array(z.object({
    type: z.enum(['text', 'video', 'interactive', 'document']).describe('Type of material'),
    title: z.string().describe('Material title'),
    content: z.string().describe('Material content or description'),
    estimated_time: z.string().optional().describe('Estimated time to complete'),
  })).describe('Required materials for the assignment'),
  activities: z.array(z.object({
    type: z.enum(['reading', 'video', 'discussion', 'practice', 'assessment']).describe('Activity type'),
    title: z.string().describe('Activity title'),
    description: z.string().describe('Activity instructions'),
    duration: z.string().describe('Expected duration'),
  })).describe('Learning activities'),
  assessment: z.object({
    type: z.enum(['quiz', 'essay', 'project', 'presentation', 'peer_review']).describe('Assessment type'),
    questions: z.array(z.any()).describe('Assessment questions/content'),
    rubric: z.array(z.object({
      criterion: z.string().describe('Assessment criterion'),
      description: z.string().describe('Criterion description'),
      max_score: z.number().describe('Maximum score for this criterion'),
    })).optional().describe('Grading rubric'),
  }).describe('Assessment component'),
});

const GenerateAssignmentInputSchema = z.object({
  subject: z.string().describe('Subject/topic area'),
  grade_level: z.string().describe('Grade level or difficulty'),
  topic: z.string().describe('Specific topic to cover'),
  duration: z.string().describe('Assignment duration (e.g., "1 week", "2 hours")'),
  assignment_type: z.enum(['homework', 'project', 'lab', 'presentation', 'research', 'group_work']).describe('Type of assignment'),
  learning_goals: z.array(z.string()).optional().describe('Specific learning goals'),
  include_quiz: z.boolean().optional().describe('Whether to include a quiz'),
  include_materials: z.boolean().optional().describe('Whether to generate learning materials'),
  complexity: z.enum(['basic', 'intermediate', 'advanced']).optional().describe('Complexity level'),
});

type GenerateAssignmentInput = z.infer<typeof GenerateAssignmentInputSchema>;
export type GenerateAssignmentOutput = z.infer<typeof AssignmentContentSchema>;

export async function generateAssignmentContent(
  input: GenerateAssignmentInput
): Promise<GenerateAssignmentOutput> {
  return generateAssignmentFlow(input);
}

const generateAssignmentFlow = ai.defineFlow(
  {
    name: 'generateAssignmentContentFlow',
    inputSchema: GenerateAssignmentInputSchema,
    outputSchema: AssignmentContentSchema,
  },
  async (input) => {
    const model = await getGoogleAIModel();
    const prompt = ai.definePrompt({
      name: 'generateAssignmentPrompt',
      model,
      input: { schema: GenerateAssignmentInputSchema },
      output: { schema: AssignmentContentSchema },
      prompt: `You are an expert curriculum designer and educator creating comprehensive assignment content. Generate a complete, pedagogically sound assignment with all necessary components.

ASSIGNMENT REQUIREMENTS:
- Subject: {{{subject}}}
- Grade Level: {{{grade_level}}}
- Topic: {{{topic}}}
- Duration: {{{duration}}}
- Type: {{{assignment_type}}}
{{#if learning_goals}}
- Learning Goals: {{{learning_goals}}}
{{/if}}
{{#if complexity}}
- Complexity: {{{complexity}}}
{{/if}}

CREATE A COMPLETE ASSIGNMENT including:

1. **Title**: Engaging and descriptive
2. **Description**: Clear overview of what students will learn and do
3. **Learning Objectives**: 3-5 specific, measurable objectives

4. **Materials**: {{#if include_materials}}Generate{{/if}}{{^include_materials}}Optional{{/if}} learning materials including:
   - Text content, videos, interactive elements
   - Each with title, content/description, and time estimate

5. **Activities**: Step-by-step learning activities including:
   - Reading, video watching, discussions, practice exercises
   - Each with clear instructions and time estimates

6. **Assessment**: Appropriate assessment method{{#if include_quiz}} including quiz questions{{/if}}

PEDAGOGICAL PRINCIPLES:
- Align activities with learning objectives
- Include variety of learning experiences
- Provide clear instructions and expectations
- Ensure appropriate challenge level for grade
- Include opportunities for feedback and reflection

OUTPUT FORMAT:
Return a JSON object with all required fields. For assessment questions, provide appropriate question types based on the assessment method chosen.

Example structure:
{
  "title": "Assignment Title",
  "description": "Complete description...",
  "learning_objectives": ["Objective 1", "Objective 2"],
  "materials": [{"type": "text", "title": "Material Title", "content": "Content..."}],
  "activities": [{"type": "reading", "title": "Activity Title", "description": "Instructions..."}],
  "assessment": {
    "type": "quiz",
    "questions": [{"type": "multiple_choice", "question": "Question?", "options": ["A", "B", "C"], "correct_answer": "A"}],
    "rubric": [{"criterion": "Understanding", "description": "Demonstrates understanding", "max_score": 10}]
  }
}

Ensure the assignment is complete, engaging, and educationally valuable.`,
    });

    const { output } = await prompt(input);
    return output!;
  }
);