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
  answerLanguage: z.string().optional().describe('Detected language of the student answer (e.g., "English", "Dutch", "Spanish")'),
});

const GradeOpenQuestionOutputSchema = z.object({
  score: z.number().describe('Numerical score'),
  feedback: z.string().describe('Feedback text'),
});

// Schema for sampling-based grading that performs multiple evaluations
const SampledGradeOpenQuestionOutputSchema = z.object({
  scores: z.array(z.number()).describe('Array of scores from multiple evaluations'),
  feedbacks: z.array(z.string()).describe('Array of feedbacks from multiple evaluations'),
  medianScore: z.number().describe('Median score from the sampling'),
  finalFeedback: z.string().describe('Consolidated feedback based on the median evaluation'),
});

type GradeOpenQuestionInput = z.infer<typeof GradeOpenQuestionInputSchema>;
export type SampledGradeOpenQuestionOutput = z.infer<typeof SampledGradeOpenQuestionOutputSchema>;

export async function gradeOpenQuestion(
  input: GradeOpenQuestionInput
) {
  return gradeOpenQuestionFlow(input);
}

const gradeOpenQuestionFlow = ai.defineFlow(
  {
    name: 'gradeOpenQuestionFlow',
    inputSchema: GradeOpenQuestionInputSchema,
    outputSchema: GradeOpenQuestionOutputSchema,
  },
  async (input) => {
    try {
      // Validate input
      if (!input.question || !input.studentAnswer) {
        return {
          score: 0,
          feedback: 'Invalid question or student answer',
        };
      }

      // Check for empty or irrelevant answer
      const normalizedAnswer = input.studentAnswer.trim().toLowerCase();
      if (normalizedAnswer === '' || normalizedAnswer === 'i don\'t know' || normalizedAnswer === 'i dont know') {
        return {
          score: 0,
          feedback: 'Answer is empty or irrelevant',
        };
      }

      // Build dynamic prompt
      const answerLanguage = input.answerLanguage || 'English';
      const languageNote = answerLanguage !== 'English' ? `\n\nNOTE: The student's answer is in ${answerLanguage}. Grade it fairly and objectively, considering that it is not in English. The grading criteria should be language-agnostic and focused on content quality.` : '';

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
- Do NOT add information not present in the student's answer.${languageNote}

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

${input.strictness ? `STRICTNESS: ${input.strictness}/10 (${input.strictness < 5 ? 'Lenient' : input.strictness < 8 ? 'Moderate' : 'Strict'})` : ''}

${input.checkSpelling ? 'CHECK SPELLING: Yes' : 'CHECK SPELLING: No'}

${input.checkGrammar ? 'CHECK GRAMMAR: Yes' : 'CHECK GRAMMAR: No'}

${input.keywords ? `IMPORTANT KEYWORDS: ${input.keywords}` : ''}

🟣 VERPLICHT OUTPUT SCHEMA

AI MOET exact dit teruggeven:

{
  "score": 0,
  "feedback": ""
}
`,
      });

      const { output } = await prompt(input);

      // Ensure score is within valid range
      const validScore = Math.max(0, Math.min(input.maxScore || 5, Math.round(output!.score)));

      return {
        ...output!,
        score: validScore,
      };
    } catch (error) {
      // Fallback
      return {
        score: 0,
        feedback: 'Unable to grade automatically. Please contact your teacher.',
      };
    }
  }
);

/**
 * Detects the language of the given text using AI
 * Returns a simple language identifier like "English", "Dutch", "Spanish", etc.
 */
async function detectAnswerLanguage(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return 'English';
  }

  try {
    const model = await getGoogleAIModel();
    const languageDetectionPrompt = ai.definePrompt({
      name: 'languageDetectionPrompt',
      model,
      input: { schema: z.object({ text: z.string() }) },
      output: { schema: z.object({ language: z.string() }) },
      prompt: `Detect the primary language of the following text. Return ONLY the language name in English (e.g., "English", "Dutch", "Spanish", "French", "German", etc.).

TEXT:
{{{text}}}

Return JSON in this format:
{"language": "LanguageName"}`,
    });

    const { output } = await languageDetectionPrompt({ text });
    return output?.language || 'English';
  } catch (error) {
    // Fallback to English if detection fails
    return 'English';
  }
}

/**
 * Calculates the median score from an array of scores
 */
function calculateMedianScore(scores: number[]): number {
  if (scores.length === 0) return 0;

  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }

  // For even-length arrays, return the average of the two middle values, rounded down
  return Math.floor((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Grades an open question using a sampling approach (multiple evaluations)
 * Performs 2-3 independent grading evaluations and returns the median score
 * This approach mitigates prompt injection and manipulation attempts
 */
export async function gradeOpenQuestionWithSampling(
  input: GradeOpenQuestionInput,
  samplingCount: number = 3
): Promise<SampledGradeOpenQuestionOutput> {
  try {
    // Validate input
    if (!input.question || !input.studentAnswer) {
      return {
        scores: [0],
        feedbacks: ['Invalid question or student answer'],
        medianScore: 0,
        finalFeedback: 'Invalid question or student answer',
      };
    }

    // Detect answer language if not provided
    let answerLanguage = input.answerLanguage || 'English';
    if (!input.answerLanguage) {
      answerLanguage = await detectAnswerLanguage(input.studentAnswer);
    }

    // Perform multiple independent grading evaluations
    const scores: number[] = [];
    const feedbacks: string[] = [];

    for (let i = 0; i < samplingCount; i++) {
      try {
        const result = await gradeOpenQuestion({
          ...input,
          answerLanguage,
        });

        scores.push(result.score);
        feedbacks.push(result.feedback);
      } catch (error) {
        // If individual grading fails, continue with other samples
        // But ensure we have at least one successful grading
        if (i === 0) {
          // If first attempt fails, return error state
          return {
            scores: [0],
            feedbacks: ['Grading failed. Please try again.'],
            medianScore: 0,
            finalFeedback: 'Grading failed. Please try again.',
          };
        }
      }
    }

    if (scores.length === 0) {
      return {
        scores: [0],
        feedbacks: ['Unable to grade. Please try again.'],
        medianScore: 0,
        finalFeedback: 'Unable to grade. Please try again.',
      };
    }

    // Calculate median score
    const medianScore = calculateMedianScore(scores);

    // Use the feedback from the evaluation that matches the median score (or closest to it)
    let finalFeedback = feedbacks[0];
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] === medianScore) {
        finalFeedback = feedbacks[i];
        break;
      }
    }

    return {
      scores,
      feedbacks,
      medianScore,
      finalFeedback,
    };
  } catch (error) {
    return {
      scores: [0],
      feedbacks: ['Unexpected error during grading'],
      medianScore: 0,
      finalFeedback: 'Unexpected error during grading',
    };
  }
}
