'use server';
/**
 * @fileOverview An AI agent that generates mock data for a 1v1 quiz duel.
 *
 * - generateQuizDuelData - Generates data for a quiz duel.
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';
import { QuizQuestionSchema } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const DuelPlayerSchema = z.object({
  id: z.string().describe('Unique identifier for the player.'),
  name: z.string().describe('The name of the player.'),
  avatarUrl: z.string().url().describe('The URL for the player\'s avatar.'),
  score: z.number().describe('The current score of the player.'),
});

const DuelRoundSchema = z.object({
  question: QuizQuestionSchema,
  winnerId: z.string().optional().describe('The ID of the player who won the round. Empty if it\'s a draw or not answered.'),
  answeredCorrectly: z.boolean().optional().describe('True if the winner answered correctly.'),
});

const QuizDuelDataSchema = z.object({
  player1: DuelPlayerSchema,
  player2: DuelPlayerSchema,
  rounds: z.array(DuelRoundSchema).describe('An array of quiz rounds for the duel.'),
});

export type QuizDuelData = z.infer<typeof QuizDuelDataSchema>;

const GenerateQuizDuelDataInputSchema = z.object({
  sourceText: z.string().describe('The source text from which to generate the duel questions.'),
  player1Name: z.string().describe('The name of the first player.'),
  player2Name: z.string().describe('The name of the second player (can be an AI name).'),
  questionCount: z.number().optional().default(10).describe('The number of questions for the duel.'),
});

type GenerateQuizDuelDataInput = z.infer<typeof GenerateQuizDuelDataInputSchema>;

export async function generateQuizDuelData(input: GenerateQuizDuelDataInput): Promise<QuizDuelData> {
  return generateQuizDuelDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizDuelDataPrompt',
  model: getGoogleAIModel() as any,
  input: { schema: GenerateQuizDuelDataInputSchema },
  output: { schema: QuizDuelDataSchema },
  prompt: `You are an AI game master. Your task is to generate the data for a 1v1 quiz duel based on the provided text.

Source Text:
{{{sourceText}}}

Players:
- Player 1: {{{player1Name}}}
- Player 2: {{{player2Name}}}

Generate a complete quiz duel with exactly {{{questionCount}}} rounds. For each round, create a unique multiple-choice question with 3-4 options, where exactly one is correct.

Then, simulate a duel result for each round. Randomly decide a "winner" for each round (who answered fastest), or make it a draw. It shouldn't be the same player winning every time. Set the winnerId for each round. If a player wins a round, set 'answeredCorrectly' to true. The players start with a score of 0. Increment the winner's score for each round they win.

Player 1's name is {{{player1Name}}}.
Player 2's name is {{{player2Name}}}.

Make Player 1's avatar '${PlaceHolderImages[0].imageUrl}'.
Make Player 2's avatar '${PlaceHolderImages[1].imageUrl}'.

Return the final state of the duel, including both players' final scores and the list of all rounds with the questions and simulated results.
`,
});


const generateQuizDuelDataFlow = ai.defineFlow(
  {
    name: 'generateQuizDuelDataFlow',
    inputSchema: GenerateQuizDuelDataInputSchema,
    outputSchema: QuizDuelDataSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
