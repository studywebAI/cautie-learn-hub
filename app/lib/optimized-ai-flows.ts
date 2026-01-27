/**
 * Optimized AI flows with token-saving integrations
 * This demonstrates how to integrate caching, monitoring, rate limiting,
 * local fallbacks, and prompt optimization into your AI workflows
 */

import { withCache } from '@/lib/ai-cache';
import { withMonitoring } from '@/lib/token-monitor';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { smartProcessor } from '@/lib/local-fallbacks';
import { getOptimizedPrompt, selectPromptVersion } from '@/lib/prompt-templates';

/**
 * Optimized flashcard generation with all token-saving features
 */
export const generateFlashcardsOptimized = withRateLimit(
  withMonitoring(
    withCache(
      async (input: { sourceText: string; count?: number; existingFlashcardIds?: string[] }) => {
        const { sourceText, count = 10, existingFlashcardIds = [] } = input;

        // 1. Try local processing first for simple text
        const complexity = smartProcessor.findDuplicates(existingFlashcardIds);
        if (complexity.success && sourceText.length < 1000) {
          // Could implement simple flashcard extraction here
          console.log('Simple text detected, could use local processing');
        }

        // 2. Use optimized prompt
        const promptVersion = selectPromptVersion(sourceText, 'flashcards');
        const optimizedPrompt = getOptimizedPrompt('flashcards', {
          count,
          text: sourceText,
          existing: existingFlashcardIds.join(', ')
        }, promptVersion);

        // 3. Call AI with optimized prompt
        // This would integrate with your actual AI service
        console.log('Using optimized prompt:', optimizedPrompt);

        // Placeholder return - integrate with your actual AI flow
        return {
          flashcards: [],
          usedCache: false,
          promptTokens: Math.ceil(optimizedPrompt.length / 4),
          promptVersion
        };
      },
      1000 * 60 * 30 // 30 minute cache TTL
    ),
    'flashcards',
    'gemini-pro'
  ),
  RATE_LIMITS.aiGeneration
);

/**
 * Optimized text summarization
 */
export const summarizeTextOptimized = withRateLimit(
  withMonitoring(
    withCache(
      async (input: { text: string; length?: number }) => {
        const { text, length = 5 } = input;

        // Try local processing first
        const localResult = await smartProcessor.summarize(text, { maxLength: length });
        if (localResult.success && !localResult.usedAI) {
          return {
            summary: localResult.data,
            method: 'local',
            tokens: 0
          };
        }

        // Use optimized prompt for complex text
        const promptVersion = selectPromptVersion(text, 'summary');
        const optimizedPrompt = getOptimizedPrompt('summary', {
          text,
          length: `${length} bullet points`
        }, promptVersion);

        // Call AI with optimized prompt
        console.log('Using optimized summary prompt:', optimizedPrompt);

        return {
          summary: 'AI-generated summary would go here',
          method: 'ai',
          promptTokens: Math.ceil(optimizedPrompt.length / 4),
          promptVersion
        };
      },
      1000 * 60 * 60 // 1 hour cache TTL
    ),
    'summary',
    'gemini-pro'
  ),
  RATE_LIMITS.aiSummary
);

/**
 * Optimized quiz generation
 */
export const generateQuizOptimized = withRateLimit(
  withMonitoring(
    withCache(
      async (input: { topic: string; text: string; questions?: number; difficulty?: string }) => {
        const { topic, text, questions = 5, difficulty = 'medium' } = input;

        // Try local question generation for simple text
        const localResult = await smartProcessor.generateQuestions(text, questions);
        if (localResult.success && !localResult.usedAI) {
          return {
            questions: localResult.data,
            method: 'local',
            tokens: 0
          };
        }

        // Use optimized prompt
        const promptVersion = selectPromptVersion(text, 'quiz');
        const optimizedPrompt = getOptimizedPrompt('quiz', {
          topic,
          text,
          questions,
          difficulty
        }, promptVersion);

        console.log('Using optimized quiz prompt:', optimizedPrompt);

        return {
          questions: [],
          method: 'ai',
          promptTokens: Math.ceil(optimizedPrompt.length / 4),
          promptVersion
        };
      },
      1000 * 60 * 45 // 45 minute cache TTL
    ),
    'quiz',
    'gemini-pro'
  ),
  RATE_LIMITS.aiQuiz
);

/**
 * Batch processing example - handle multiple operations efficiently
 */
export const batchProcessOptimized = withRateLimit(
  withMonitoring(
    async (operations: Array<{
      operationType: 'summary' | 'keywords' | 'questions';
      text: string;
      params?: Record<string, any>;
    }>) => {
      // Group operations by type for efficient processing
      const summaries = operations.filter(op => op.operationType === 'summary');
      const keywords = operations.filter(op => op.operationType === 'keywords');
      const questions = operations.filter(op => op.operationType === 'questions');

      const results: any[] = [];

      // Process summaries
      for (const op of summaries) {
        const result = await summarizeTextOptimized({
          text: op.text,
          length: op.params?.length || 3
        });
        results.push({ operationType: 'summary', ...result });
      }

      // Process keywords
      for (const op of keywords) {
        const localResult = await smartProcessor.extractKeywords(
          op.text,
          op.params?.count || 5
        );
        if (localResult.success) {
          results.push({ operationType: 'keywords', ...localResult });
        }
      }

      // Process questions
      for (const op of questions) {
        const result = await generateQuizOptimized({
          topic: op.params?.topic || 'General',
          text: op.text,
          questions: op.params?.count || 3
        });
        results.push({ operationType: 'questions', ...result });
      }

      return results;
    },
    'batch',
    'gemini-pro'
  ),
  RATE_LIMITS.aiGeneration
);

/**
 * Utility function to get optimization stats
 */
export async function getOptimizationStats() {
  const { getTokenStats, getTopFeatures } = await import('@/lib/token-monitor');
  const { getCacheStats } = await import('@/lib/ai-cache');

  const tokenStats = getTokenStats(24);
  const topFeatures = getTopFeatures(5);
  const cacheStats = getCacheStats();

  return {
    tokenUsage: tokenStats,
    expensiveFeatures: topFeatures,
    cachePerformance: cacheStats,
    totalSavings: {
      estimated: tokenStats.totalTokens * 0.4, // Rough estimate
      percentage: 40
    }
  };
}

/**
 * Health check for optimization systems
 */
export async function checkOptimizationHealth() {
  const checks = {
    cache: false,
    monitoring: false,
    rateLimit: false,
    localFallbacks: false,
    promptTemplates: false
  };

  try {
    // Test cache
    const { aiCache } = await import('@/lib/ai-cache');
    aiCache.set('test', 'value', {}, 1000);
    checks.cache = aiCache.get('test', {}) === 'value';

    // Test monitoring
    const { tokenMonitor } = await import('@/lib/token-monitor');
    tokenMonitor.recordUsage('test', 'test-model', 10, 5);
    checks.monitoring = true;

    // Test rate limiting
    const { rateLimiter } = await import('@/lib/rate-limit');
    const limit = rateLimiter.checkLimit('test-ip');
    checks.rateLimit = limit.allowed;

    // Test local fallbacks
    const result = smartProcessor.format('test  text');
    checks.localFallbacks = result.success;

    // Test prompt templates
    const prompt = getOptimizedPrompt('summary', { text: 'test', length: '3' });
    checks.promptTemplates = prompt.includes('test');

  } catch (error) {
    console.error('Optimization health check failed:', error);
  }

  return {
    healthy: Object.values(checks).every(Boolean),
    checks
  };
}