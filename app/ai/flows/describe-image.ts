'use server';
/**
 * @fileOverview Lightweight flow that describes an uploaded image for educational context.
 * Called once when a student uploads an image in State 1 — the result is reused as
 * text context in all subsequent AI calls (category eval, quiz generation, adaptive refetches)
 * so the image never needs to be re-uploaded.
 *
 * - describeImage - Analyses the image and returns a factual educational summary.
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const DescribeImageInputSchema = z.object({
  imageDataUri: z.string().describe('The image as a base64 data URI (jpeg, png, webp, etc.).'),
});

const DescribeImageOutputSchema = z.object({
  description: z.string().describe('2-4 sentence educational description of the image content.'),
  topics: z.array(z.string()).describe('Key topics, concepts, names, or subjects visible (3-8 keywords).'),
  contentType: z.string().describe('Type of educational material: diagram, chart, map, historical photo, equation, text page, infographic, etc.'),
});

export type ImageDescription = z.infer<typeof DescribeImageOutputSchema>;

export async function describeImage(
  input: z.infer<typeof DescribeImageInputSchema>
): Promise<ImageDescription> {
  return describeImageFlow(input);
}

const describeImageFlow = ai.defineFlow(
  {
    name: 'describeImageFlow',
    inputSchema: DescribeImageInputSchema,
    outputSchema: DescribeImageOutputSchema,
  },
  async (input) => {
    const model = await getGoogleAIModel();
    const prompt = ai.definePrompt({
      name: 'describeImagePrompt',
      model,
      input: { schema: DescribeImageInputSchema },
      output: { schema: DescribeImageOutputSchema },
      prompt: `You are an educational content analyst. Examine this image and produce a concise factual description for the purpose of generating a study quiz from it.

Your response must:
- Identify the type of educational material (diagram, chart, map, photograph, text page, equation, infographic, etc.)
- Summarize the key educational content — concepts, names, dates, processes, data, labels, structure visible in the image
- Be factual and objective — no opinions, no assumptions beyond what is visible
- 2-4 sentences maximum

{{media url=imageDataUri}}`,
    });

    const { output } = await prompt(input);
    return {
      description: output?.description?.trim() ?? 'Image content could not be fully analyzed.',
      topics: Array.isArray(output?.topics) ? output.topics.slice(0, 8) : [],
      contentType: output?.contentType?.trim() ?? 'unknown',
    };
  }
);
