/**
 * Optimized prompt templates for AI operations
 * These are shorter, more focused versions of common prompts
 */

export const PROMPT_TEMPLATES = {
  flashcards: {
    short: `Generate {{count}} flashcards from this text. Each flashcard must have:
- id: kebab-case identifier
- front: key term or question
- back: definition or answer
- cloze: fill-in-the-blank sentence with ____
- source_info: optional source

Format as JSON array. Use only information from the text.

Text: {{text}}`,

    concise: `Create {{count}} flashcards:
- id (kebab-case)
- front (term/question)
- back (definition/answer)
- cloze (____ sentence)
- source_info (optional)

JSON array. Text facts only.

Text: {{text}}`
  },

  summary: {
    short: `Summarize this text in {{length}} bullet points. Focus on key facts and main ideas.

Text: {{text}}`,

    concise: `{{length}} bullet summary of key points:

Text: {{text}}`
  },

  quiz: {
    short: `Create a {{difficulty}} quiz with {{questions}} multiple-choice questions about this topic.

Each question must have:
- question: the question text
- options: array of 4 choices (A, B, C, D)
- correctAnswer: the correct option letter
- explanation: why it's correct

Format as JSON array.

Topic: {{topic}}
Text: {{text}}`,

    concise: `{{questions}} multiple-choice questions ({{difficulty}}):

Format: {question, options: [A,B,C,D], correctAnswer, explanation}

JSON array.

Topic: {{topic}}
Text: {{text}}`
  },

  notes: {
    short: `Create structured notes from this text. Organize into logical sections with headings and bullet points.

Text: {{text}}`,

    concise: `Structured notes with headings and bullets:

Text: {{text}}`
  },

  keywords: {
    short: `Extract {{count}} most important keywords from this text. Return as JSON array of strings.

Text: {{text}}`,

    concise: `{{count}} keywords (JSON array):

Text: {{text}}`
  },

  questions: {
    short: `Generate {{count}} study questions from this text. Mix factual and conceptual questions.

Text: {{text}}`,

    concise: `{{count}} study questions:

Text: {{text}}`
  }
};

/**
 * Fill template with variables
 */
export function fillTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get optimized prompt for a feature
 */
export function getOptimizedPrompt(
  feature: keyof typeof PROMPT_TEMPLATES,
  variables: Record<string, any>,
  version: 'short' | 'concise' = 'short'
): string {
  const template = PROMPT_TEMPLATES[feature]?.[version];
  if (!template) {
    throw new Error(`No template found for feature: ${feature}`);
  }

  return fillTemplate(template, variables);
}

/**
 * Estimate token count for a prompt (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough approximation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Compare prompt lengths and savings
 */
export function comparePrompts(original: string, optimized: string): {
  originalTokens: number;
  optimizedTokens: number;
  savings: number;
  percentage: number;
} {
  const originalTokens = estimateTokens(original);
  const optimizedTokens = estimateTokens(optimized);
  const savings = originalTokens - optimizedTokens;
  const percentage = originalTokens > 0 ? (savings / originalTokens) * 100 : 0;

  return {
    originalTokens,
    optimizedTokens,
    savings,
    percentage: Math.round(percentage * 100) / 100
  };
}

/**
 * Batch prompt optimization for multiple operations
 */
export function optimizeBatchPrompts(
  operations: Array<{
    feature: keyof typeof PROMPT_TEMPLATES;
    variables: Record<string, any>;
    version?: 'short' | 'concise';
  }>
): {
  combinedPrompt: string;
  totalTokens: number;
  individualTokens: number[];
} {
  const prompts: string[] = [];
  const tokenCounts: number[] = [];

  operations.forEach(({ feature, variables, version = 'concise' }) => {
    const prompt = getOptimizedPrompt(feature, variables, version);
    prompts.push(`${feature.toUpperCase()}:\n${prompt}`);
    tokenCounts.push(estimateTokens(prompt));
  });

  const combinedPrompt = prompts.join('\n\n---\n\n');
  const totalTokens = estimateTokens(combinedPrompt);

  return {
    combinedPrompt,
    totalTokens,
    individualTokens: tokenCounts
  };
}

/**
 * Smart prompt selector based on content complexity
 */
export function selectPromptVersion(
  content: string,
  baseFeature: keyof typeof PROMPT_TEMPLATES
): 'short' | 'concise' {
  // Use concise for short content, short for complex content
  const wordCount = content.split(/\s+/).length;

  if (wordCount < 200) {
    return 'concise'; // Shorter prompts for shorter content
  } else {
    return 'short'; // More detailed prompts for complex content
  }
}