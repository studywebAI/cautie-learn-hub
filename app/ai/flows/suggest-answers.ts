
'use server';

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';
import { QuizOptionSchema } from '@/lib/types';

const SuggestAnswersInputSchema = z.object({
  question: z.string().describe('The quiz question for which to suggest answers.'),
  sourceText: z.string().describe('The original source text from which the quiz is being generated.'),
});
type SuggestAnswersInput = z.infer<typeof SuggestAnswersInputSchema>;

const SuggestAnswersOutputSchema = z.object({
  suggestedOptions: z.array(QuizOptionSchema).min(2).max(4).describe('An array of 3 or 4 suggested answer options, with one marked as correct.'),
});
export type SuggestAnswersOutput = z.infer<typeof SuggestAnswersOutputSchema>;

export async function suggestAnswers(
  input: SuggestAnswersInput
): Promise<SuggestAnswersOutput> {
  return suggestAnswersFlow(input);
}

const suggestAnswersFlow = ai.defineFlow(
  {
    name: 'suggestAnswersFlow',
    inputSchema: SuggestAnswersInputSchema,
    outputSchema: SuggestAnswersOutputSchema,
  },
  async (input) => {
    const model = await getGoogleAIModel();
    const prompt = ai.definePrompt({
      name: 'suggestAnswersPrompt',
      model,
      input: { schema: SuggestAnswersInputSchema },
      output: { schema: SuggestAnswersOutputSchema },
      prompt: `You are an expert in creating educational content. A user has provided a quiz question and the source text from which the quiz is being generated. Your task is to suggest 3 or 4 multiple-choice answer options for this question. Exactly one option must be correct. Ensure the options are plausible and relevant to the source text. Provide an 'id' (a, b, c, d), 'text', and 'isCorrect' boolean for each option.

Question: "{{{question}}}"
Source Text: "{{{sourceText}}}"
`,
    });
    const { output } = await prompt(input);
    return output!;
  }
);
