'use server';

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const GradeOpenQuestionInputSchema = z.object({
  question: z.string().describe('The question text'),
  criteria: z.string().describe('Grading criteria'),
  maxScore: z.number().describe('Maximum possible score'),
  language: z.string().describe('Language for feedback'),
  studentAnswer: z.string().describe('Student\'s answer to grade'),
  strictness: z.number().optional().describe('Grading strictness (1-10)'),
  checkSpelling: z.boolean().optional().describe('Whether to check spelling'),
  checkGrammar: z.boolean().optional().describe('Whether to check grammar'),
  keywords: z.string().optional().describe('Important keywords to check for'),
});

const GradeOpenQuestionOutputSchema = z.object({
  score: z.number().describe('Numerical score'),
  feedback: z.string().describe('Feedback text'),
});

type GradeOpenQuestionInput = z.infer<typeof GradeOpenQuestionInputSchema>;

export async function gradeOpenQuestion(
  input: GradeOpenQuestionInput
) {
  return gradeOpenQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gradeOpenQuestionPrompt',
  model: getGoogleAIModel() as any,
  input: { schema: GradeOpenQuestionInputSchema },
  output: { schema: GradeOpenQuestionOutputSchema },
  prompt: `🔴 AI GRADING SYSTEM PROMPT (COPY PASTE)

You are an automated grading engine for an educational platform.

Your task:
- Grade a student's open-ended answer objectively.
- Follow the grading criteria exactly.
- Be strict but fair.
- Do NOT hallucinate facts.
- Do NOT add information not present in the student's answer.

Rules:
- You MUST return valid JSON only.
- You MUST follow the exact output schema.
- Do NOT include explanations outside the JSON.
- Do NOT include markdown.
- Do NOT include comments.
- Do NOT include the student's answer in the output.
- If the answer is empty or irrelevant, score 0.

Grading rules:
- Score must be an integer.
- Score range is 0 to max_score.
- Use the full range when appropriate.
- Partial credit is allowed.
- Feedback must be written in the same language as the question.

Tone of feedback:
- Clear
- Educational
- Neutral
- Short (1–4 sentences)

If the answer is incorrect:
- Explain what is missing or wrong.
- Do not shame the student.
- Do not tell the student anything besides what is misssing or wrong . example of what not to do: that was a nice try, or that was close or better luck next time. no bullshit just tell whats wrong or missing

If the answer is correct:
- Briefly confirm correctness.
- Optionally suggest improvement.

You are NOT allowed to refuse grading.
You are NOT allowed to say "I cannot determine".
You are NOT allowed to ask questions.

Return JSON ONLY.

🟢 AI GRADING USER PROMPT (DYNAMIC PAYLOAD)

QUESTION:
{{{question}}}

GRADING CRITERIA:
{{{criteria}}}

MAX SCORE:
{{{maxScore}}}

LANGUAGE:
{{{language}}}

STUDENT ANSWER:
{{{studentAnswer}}}

${`
STRICTNESS: {{{strictness}}}
`}

${`
CHECK SPELLING: {{{checkSpelling}}}
`}

${`
CHECK GRAMMAR: {{{checkGrammar}}}
`}

${`
IMPORTANT KEYWORDS: {{{keywords}}}
`}

🟣 VERPLICHT OUTPUT SCHEMA

AI MOET exact dit teruggeven:

{
  "score": 0,
  "feedback": ""
}
`,
});

const gradeOpenQuestionFlow = ai.defineFlow(
  {
    name: 'gradeOpenQuestionFlow',
    inputSchema: GradeOpenQuestionInputSchema,
    outputSchema: GradeOpenQuestionOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      return output!;
    } catch (error) {
      console.error('AI grading flow error:', error);
      // Fallback
      return {
        score: 0,
        feedback: 'Unable to grade automatically. Please contact your teacher.',
      };
    }
  }
);