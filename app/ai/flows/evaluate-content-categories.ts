'use server';
/**
 * @fileOverview Lightweight AI flow that evaluates source text against 14 content categories.
 * Used to drive intelligent question-type suggestions in the quiz settings screen.
 *
 * - evaluateContentCategories - Classifies source text into 14 educational categories.
 */

import { ai, getGoogleAIModel } from '@/ai/genkit';
import { z } from 'genkit';

const YN = z.enum(['y', 'n']);

export const CategoryEvaluationInputSchema = z.object({
  sourceText: z.string().max(6000).describe('Source text to classify (first ~3000 chars is enough).'),
});

export const CategoryEvaluationOutputSchema = z.object({
  people:          YN.describe('Contains named people/entities with attributes or actions.'),
  locations:       YN.describe('Contains geographic locations, regions, or spatial relationships.'),
  events:          YN.describe('Contains historical or factual events that occurred at specific times.'),
  dates:           YN.describe('Contains dates, years, time periods, or chronological references.'),
  definitions:     YN.describe('Contains terminology, definitions, vocabulary, or key concepts.'),
  causeEffect:     YN.describe('Contains cause-and-effect relationships or chains of consequences.'),
  numberedData:    YN.describe('Contains numerical data, statistics, measurements, or quantities.'),
  processes:       YN.describe('Contains step-by-step processes, procedures, or mechanisms.'),
  classifications: YN.describe('Contains categories, taxonomies, or classification systems.'),
  comparisons:     YN.describe('Contains comparisons or contrasts between two or more things.'),
  arguments:       YN.describe('Contains arguments, claims, evidence, or persuasive reasoning.'),
  visual:          YN.describe('Describes visual elements, diagrams, spatial structures, or maps.'),
  formulas:        YN.describe('Contains mathematical formulas, equations, or scientific laws.'),
  problems:        YN.describe('Contains problems, case studies, or scenarios requiring analysis.'),
});

export type CategoryEvaluation = z.infer<typeof CategoryEvaluationOutputSchema>;

export async function evaluateContentCategories(
  input: z.infer<typeof CategoryEvaluationInputSchema>
): Promise<CategoryEvaluation> {
  return evaluateCategoriesFlow(input);
}

const evaluateCategoriesFlow = ai.defineFlow(
  {
    name: 'evaluateCategoriesFlow',
    inputSchema: CategoryEvaluationInputSchema,
    outputSchema: CategoryEvaluationOutputSchema,
  },
  async (input) => {
    const model = await getGoogleAIModel();
    const prompt = ai.definePrompt({
      name: 'evaluateCategoriesPrompt',
      model,
      input: { schema: CategoryEvaluationInputSchema },
      output: { schema: CategoryEvaluationOutputSchema },
      prompt: `You are an expert educational content analyst. Read the source text below and classify it against 14 categories. For each category, answer "y" if the text meaningfully contains content of that type, or "n" if it does not.

Be strict: only answer "y" if the text genuinely contains substantial content of that type — not just a passing mention. Answer based only on what the text contains, not what could be inferred.

Categories to evaluate:
- people: Named people or entities with described attributes, actions, or roles.
- locations: Geographic locations, regions, places, or spatial relationships.
- events: Historical or factual events that occurred (battles, discoveries, inventions, meetings, etc.).
- dates: Explicit years, dates, decades, centuries, or time period references.
- definitions: Definitions, key terms, vocabulary, or concept explanations.
- causeEffect: Cause-and-effect chains, consequences, or "X led to Y" relationships.
- numberedData: Numbers, statistics, measurements, percentages, or quantitative data.
- processes: Step-by-step procedures, ordered mechanisms, or "how something works."
- classifications: Categories, types, taxonomy, or classification of items into groups.
- comparisons: Explicit comparisons or contrasts between two or more distinct items.
- arguments: Arguments, claims backed by evidence, or persuasive reasoning.
- visual: Descriptions of visual structures, diagrams, anatomical structures, maps, or spatial layouts.
- formulas: Mathematical formulas, equations, chemical formulas, or scientific laws.
- problems: Problems, case studies, ethical dilemmas, or scenarios requiring analysis.

Source Text:
{{{sourceText}}}

Respond with the structured JSON only. No explanations.`,
    });

    const truncated = input.sourceText.slice(0, 4000);
    const { output } = await prompt({ sourceText: truncated });

    // Ensure all fields have a value (fallback to 'n')
    return {
      people:          output?.people          ?? 'n',
      locations:       output?.locations       ?? 'n',
      events:          output?.events          ?? 'n',
      dates:           output?.dates           ?? 'n',
      definitions:     output?.definitions     ?? 'n',
      causeEffect:     output?.causeEffect     ?? 'n',
      numberedData:    output?.numberedData    ?? 'n',
      processes:       output?.processes       ?? 'n',
      classifications: output?.classifications ?? 'n',
      comparisons:     output?.comparisons     ?? 'n',
      arguments:       output?.arguments       ?? 'n',
      visual:          output?.visual          ?? 'n',
      formulas:        output?.formulas        ?? 'n',
      problems:        output?.problems        ?? 'n',
    };
  }
);
