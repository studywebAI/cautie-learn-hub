'use server';

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const ParseGradingScaleInputSchema = z.object({
  description: z.string().describe('Free text or a pasted table explaining a grading/scoring system, in any language'),
});

const GradeScaleBinSchema = z.object({
  min: z.number().describe('Minimum percentage (0-100) for this grade'),
  max: z.number().describe('Maximum percentage (0-100) for this grade'),
  label: z.string().describe('The grade label as the teacher writes it, e.g. "8", "B+", "voldoende"'),
  numeric: z.number().nullable().describe('Numeric equivalent if the system is number-based, else null'),
});

const ParseGradingScaleOutputSchema = z.object({
  system: z.string().describe('Short slug for this system, e.g. "custom" or a recognized country code'),
  bins: z.array(GradeScaleBinSchema).describe('Percentage ranges sorted from highest to lowest, covering the full 0-100 range with no gaps'),
});

export type ParseGradingScaleOutput = z.infer<typeof ParseGradingScaleOutputSchema>;

// Turns a teacher's free-form explanation of their grading system (pasted
// text or a table copied from a file) into structured percentage bins for a
// class_grading_presets scale template. See
// docs/grades-feature-brainstorm.md section I, point 11.
export async function parseGradingScale(description: string): Promise<ParseGradingScaleOutput> {
  const prompt = ai.definePrompt({
    name: 'parseGradingScalePrompt',
    model: getGoogleAIModel() as any,
    input: { schema: ParseGradingScaleInputSchema },
    output: { schema: ParseGradingScaleOutputSchema },
    prompt: `You convert a teacher's description of a grading/scoring system into structured percentage-based bins.

Rules:
- Output bins that together cover the full 0-100 percentage range with no gaps and no overlaps.
- Sort bins from highest min to lowest min.
- Preserve the teacher's own labels exactly (numbers, letters, or words) — do not translate or invent new ones.
- Set "numeric" only if the label itself is a plain number (e.g. "8" -> 8). Otherwise use null.
- If the description already gives percentage ranges, use them directly.
- If it gives raw score fractions (e.g. "27-30 out of 30 = A"), convert to percentages.
- If information is incomplete, make a reasonable estimate but keep full 0-100 coverage.
- Return JSON only, matching the schema exactly.

DESCRIPTION:
{{{description}}}
`,
  });

  const { output } = await prompt({ description });
  if (!output) {
    return { system: 'custom', bins: [{ min: 0, max: 100, label: '', numeric: null }] };
  }
  return { ...output, system: output.system || 'custom' };
}
