'use server';

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const GradeOpenQuestionInputSchema = z.object({
  question: z.string().describe('The question being asked'),
  criteria: z.string().describe('Grading criteria or rubric'),
  maxScore: z.number().describe('Maximum possible score'),
  language: z.string().describe('Language for feedback'),
  studentAnswer: z.string().describe('Student\'s answer to grade'),
  answerLanguage: z.string().optional().describe('Detected language of the student answer (e.g., "English", "Dutch", "Spanish")'),
});

const GradeOpenQuestionOutputSchema = z.object({
  score: z.number().min(0).describe('Numerical score given'),
  feedback: z.string().describe('Constructive feedback for the student'),
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
    const model = await getGoogleAIModel();

    // Handle non-English answers appropriately
    const answerLanguage = input.answerLanguage || 'English';
    const languageNote = answerLanguage !== 'English' ? `\n\nNOTE: The student's answer is in ${answerLanguage}. Grade it fairly and objectively, considering that it is not in English. The grading criteria should be language-agnostic and focused on content quality.` : '';

    const prompt = ai.definePrompt({
      name: 'gradeOpenQuestionPrompt',
      model,
      input: { schema: GradeOpenQuestionInputSchema },
      output: { schema: GradeOpenQuestionOutputSchema },
      prompt: `You are an expert educator grading an open-ended question response. Your task is to provide fair, constructive, and educational feedback.${languageNote}

QUESTION:
{{{question}}}

GRADING CRITERIA:
{{{criteria}}}

MAXIMUM SCORE: {{{maxScore}}}

STUDENT ANSWER:
{{{studentAnswer}}}

GRADING INSTRUCTIONS:

1. Analyze the student's answer objectively against the criteria
2. Provide a numerical score from 0 to {{{maxScore}}}
3. Give constructive, educational feedback in {{{language}}}
4. Be encouraging and focus on learning improvement
5. If the answer is poor, explain what's missing without being harsh
6. If the answer is good, acknowledge strengths and suggest enhancements

Return a JSON object with:
- score: numerical score (0-{{{maxScore}}})
- feedback: helpful feedback text in {{{language}}}

Be fair, educational, and supportive in your assessment.`,
    });

    const { output } = await prompt(input);
    return output!;
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