/**
 * Local processing fallbacks for common AI operations
 * These avoid API calls for simple, deterministic tasks
 */

export interface ProcessingResult {
  success: boolean;
  data?: any;
  usedAI?: boolean;
  reason?: string;
}

/**
 * Extractive summarization - takes first N sentences
 */
export function simpleSummarize(text: string, maxSentences: number = 3): ProcessingResult {
  if (!text || text.length < 50) {
    return { success: false, reason: 'Text too short for summarization' };
  }

  try {
    // Split by sentence endings
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (sentences.length === 0) {
      return { success: false, reason: 'No sentences found' };
    }

    const summary = sentences.slice(0, maxSentences)
      .map(s => s.trim())
      .join('. ') + '.';

    return {
      success: true,
      data: summary,
      usedAI: false,
      reason: 'Extractive summarization'
    };
  } catch (error) {
    return {
      success: false,
      reason: `Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Simple keyword extraction
 */
export function extractKeywords(text: string, maxKeywords: number = 5): ProcessingResult {
  if (!text || text.length < 20) {
    return { success: false, reason: 'Text too short for keyword extraction' };
  }

  try {
    // Simple frequency-based keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3) // Skip short words
      .filter(word => !['that', 'this', 'with', 'from', 'they', 'have', 'been', 'were', 'which', 'their', 'there', 'these', 'those'].includes(word));

    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const keywords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);

    return {
      success: true,
      data: keywords,
      usedAI: false,
      reason: 'Frequency-based keyword extraction'
    };
  } catch (error) {
    return {
      success: false,
      reason: `Keyword extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Simple text length checking
 */
export function checkTextComplexity(text: string): {
  isSimple: boolean;
  wordCount: number;
  sentenceCount: number;
  reason: string;
} {
  const wordCount = text.split(/\s+/).length;
  const sentenceCount = text.split(/[.!?]+/).length;

  // Consider text "simple" if it's short and has basic structure
  const isSimple = wordCount < 100 && sentenceCount < 5;

  let reason = '';
  if (wordCount < 100) reason += 'Short text. ';
  if (sentenceCount < 5) reason += 'Few sentences. ';
  if (wordCount >= 100 && sentenceCount >= 5) reason = 'Complex text requiring AI processing.';

  return { isSimple, wordCount, sentenceCount, reason: reason.trim() };
}

/**
 * Simple question generation from text
 */
export function simpleQuestionGeneration(text: string, count: number = 3): ProcessingResult {
  const complexity = checkTextComplexity(text);

  if (!complexity.isSimple) {
    return {
      success: false,
      reason: 'Text too complex for simple question generation',
      data: complexity
    };
  }

  try {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const questions: string[] = [];

    for (let i = 0; i < Math.min(count, sentences.length); i++) {
      const sentence = sentences[i].trim();
      if (sentence.length > 20) {
        // Create simple "what" questions
        const question = `What ${sentence.charAt(0).toLowerCase() + sentence.slice(1)}?`;
        questions.push(question);
      }
    }

    if (questions.length === 0) {
      return { success: false, reason: 'Could not generate questions from text' };
    }

    return {
      success: true,
      data: questions,
      usedAI: false,
      reason: 'Simple question generation from sentences'
    };
  } catch (error) {
    return {
      success: false,
      reason: `Question generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Simple text formatting and cleanup
 */
export function formatText(text: string): ProcessingResult {
  try {
    let formatted = text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Fix spacing around punctuation
      .replace(/\s+([.!?,:;])/g, '$1')
      // Add space after punctuation if missing
      .replace(/([.!?,:;])(?=\S)/g, '$1 ')
      // Capitalize first letter of sentences
      .replace(/(^\s*\w|[.!?]\s*\w)/g, match => match.toUpperCase())
      // Trim whitespace
      .trim();

    return {
      success: true,
      data: formatted,
      usedAI: false,
      reason: 'Text formatting and cleanup'
    };
  } catch (error) {
    return {
      success: false,
      reason: `Text formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Simple duplicate detection
 */
export function findDuplicates(items: string[]): ProcessingResult {
  try {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    items.forEach(item => {
      const normalized = item.toLowerCase().trim();
      if (seen.has(normalized)) {
        if (!duplicates.includes(item)) {
          duplicates.push(item);
        }
      } else {
        seen.add(normalized);
      }
    });

    return {
      success: true,
      data: duplicates,
      usedAI: false,
      reason: 'Simple duplicate detection'
    };
  } catch (error) {
    return {
      success: false,
      reason: `Duplicate detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Smart fallback dispatcher - chooses local vs AI processing
 */
export class SmartProcessor {
  async summarize(text: string, options?: { maxLength?: number }): Promise<ProcessingResult> {
    const complexity = checkTextComplexity(text);

    if (complexity.isSimple) {
      // Use local processing for simple text
      const maxSentences = options?.maxLength ? Math.ceil(options.maxLength / 50) : 3;
      return simpleSummarize(text, maxSentences);
    }

    // Would call AI for complex text
    return {
      success: false,
      reason: 'Text requires AI processing',
      data: { complexity }
    };
  }

  async extractKeywords(text: string, count: number = 5): Promise<ProcessingResult> {
    const complexity = checkTextComplexity(text);

    if (complexity.wordCount < 200) {
      // Use local processing for shorter text
      return extractKeywords(text, count);
    }

    // Would call AI for longer text
    return {
      success: false,
      reason: 'Text requires AI processing for keyword extraction',
      data: { complexity }
    };
  }

  async generateQuestions(text: string, count: number = 3): Promise<ProcessingResult> {
    const complexity = checkTextComplexity(text);

    if (complexity.isSimple) {
      return simpleQuestionGeneration(text, count);
    }

    // Would call AI for complex text
    return {
      success: false,
      reason: 'Text requires AI processing for question generation',
      data: { complexity }
    };
  }

  format(text: string): ProcessingResult {
    return formatText(text);
  }

  findDuplicates(items: string[]): ProcessingResult {
    return findDuplicates(items);
  }
}

// Singleton instance
export const smartProcessor = new SmartProcessor();