'use server';

/**
 * @fileOverview AI-powered grading assistant that analyzes student submissions and provides grading recommendations
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const GradingAnalysisSchema = z.object({
  overall_score: z.number().min(0).max(100).describe('Recommended overall score out of 100'),
  breakdown: z.array(z.object({
    criterion: z.string().describe('Assessment criterion being evaluated'),
    score: z.number().min(0).max(100).describe('Score for this criterion'),
    reasoning: z.string().describe('Detailed reasoning for the score'),
    feedback: z.string().describe('Specific feedback for improvement'),
    strengths: z.array(z.string()).describe('What the student did well'),
    improvements: z.array(z.string()).describe('Areas for improvement'),
  })).describe('Detailed breakdown by criteria'),
  general_feedback: z.string().describe('Overall feedback for the student'),
  grade_letter: z.enum(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']).describe('Letter grade equivalent'),
  confidence_level: z.enum(['high', 'medium', 'low']).describe('AI confidence in the assessment'),
  recommendations: z.array(z.string()).describe('Recommendations for the student'),
  flagged_issues: z.array(z.string()).optional().describe('Potential issues that may need teacher review'),
});

const AIGradingInputSchema = z.object({
  assignment_description: z.string().describe('Description of the assignment requirements'),
  rubric: z.array(z.object({
    criterion: z.string().describe('Assessment criterion'),
    description: z.string().describe('Criterion description'),
    max_score: z.number().describe('Maximum score for this criterion'),
    weight: z.number().optional().describe('Weight of this criterion'),
  })).optional().describe('Grading rubric'),
  student_submission: z.string().describe('The student\'s submitted work'),
  submission_type: z.enum(['text', 'essay', 'code', 'math', 'project_description', 'presentation']).describe('Type of submission'),
  grade_level: z.string().optional().describe('Grade level for appropriate assessment'),
  subject: z.string().optional().describe('Subject area for context'),
  additional_context: z.string().optional().describe('Additional context about the assignment or student'),
});

type AIGradingInput = z.infer<typeof AIGradingInputSchema>;
export type AIGradingOutput = z.infer<typeof GradingAnalysisSchema>;

export async function aiGradingAssistant(
  input: AIGradingInput
): Promise<AIGradingOutput> {
  return aiGradingFlow(input);
}

const aiGradingFlow = ai.defineFlow(
  {
    name: 'aiGradingAssistantFlow',
    inputSchema: AIGradingInputSchema,
    outputSchema: GradingAnalysisSchema,
  },
  async (input) => {
    const model = await getGoogleAIModel();
    const prompt = ai.definePrompt({
      name: 'aiGradingPrompt',
      model,
      input: { schema: AIGradingInputSchema },
      output: { schema: GradingAnalysisSchema },
      prompt: `You are an expert educator and assessment specialist. Your task is to analyze a student submission and provide detailed, fair, and constructive grading feedback.

ASSIGNMENT CONTEXT:
{{{assignment_description}}}

SUBMISSION TYPE: {{{submission_type}}}
{{#if grade_level}}GRADE LEVEL: {{{grade_level}}}{{/if}}
{{#if subject}}SUBJECT: {{{subject}}}{{/if}}
{{#if additional_context}}

ADDITIONAL CONTEXT:
{{{additional_context}}}
{{/if}}

GRADING RUBRIC:
{{#if rubric}}
{{#each rubric}}
- {{{criterion}}}: {{{description}}} (Max: {{{max_score}}}{{#if weight}}, Weight: {{{weight}}}{{/if}})
{{/each}}
{{else}}
Use standard academic assessment criteria appropriate for the subject and grade level.
{{/if}}

STUDENT SUBMISSION:
{{{student_submission}}}

ANALYSIS REQUIREMENTS:

1. **Comprehensive Evaluation**: Analyze the submission against all relevant criteria
2. **Fair Assessment**: Be objective and consistent in your evaluation
3. **Constructive Feedback**: Provide specific, actionable feedback for improvement
4. **Strength Recognition**: Identify what the student did well
5. **Standards Alignment**: Ensure assessment aligns with academic standards

EVALUATION PROCESS:

**Step 1: Content Analysis**
- Assess accuracy, completeness, and depth of understanding
- Check for proper use of concepts, terminology, and methods
- Evaluate critical thinking and problem-solving

**Step 2: Structure and Organization**
- Review logical flow and coherence
- Assess clarity of expression and communication
- Check for proper formatting and presentation

**Step 3: Quality Indicators**
- Evaluate creativity and originality where appropriate
- Assess attention to detail and thoroughness
- Check for evidence of effort and engagement

**Step 4: Rubric Alignment**
- Score each criterion individually
- Provide detailed reasoning for each score
- Ensure total score reflects overall quality

OUTPUT REQUIREMENTS:

Provide a JSON object with:
- overall_score: Number 0-100
- breakdown: Array of criterion evaluations with scores, reasoning, feedback
- general_feedback: Constructive overall feedback
- grade_letter: Standard letter grade (A+, A, A-, etc.)
- confidence_level: AI confidence (high/medium/low)
- recommendations: Specific suggestions for improvement
- flagged_issues: Any concerns needing teacher review (plagiarism, academic integrity, etc.)

GRADING STANDARDS:
- A (90-100): Exceptional work showing deep understanding and mastery
- B (80-89): Good work with solid understanding and competent execution
- C (70-79): Satisfactory work meeting basic requirements
- D (60-69): Below average work with significant gaps
- F (0-59): Unsatisfactory work not meeting requirements

Be thorough, fair, and educational in your assessment.`,
    });

    const { output } = await prompt(input);
    return output!;
  }
);