/**
 * Integration examples for token optimization
 * This shows how to integrate the optimization systems into your existing code
 */

import { aiCache } from '@/lib/ai-cache';
import { tokenMonitor } from '@/lib/token-monitor';
import { rateLimiter } from '@/lib/rate-limit';
import { smartProcessor } from '@/lib/local-fallbacks';
import { getOptimizedPrompt, selectPromptVersion } from '@/lib/prompt-templates';

/**
 * Example: Optimized flashcard generation
 */
export async function generateFlashcardsOptimized(input: {
  sourceText: string;
  count?: number;
  existingFlashcardIds?: string[];
  userId?: string;
}) {
  const { sourceText, count = 10, existingFlashcardIds = [], userId } = input;

  // 1. Check rate limit
  const rateLimit = rateLimiter.checkLimit(userId || 'anonymous', 5, 60000); // 5 per minute
  if (!rateLimit.allowed) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // 2. Check cache first
  const cacheKey = `flashcards:${sourceText.substring(0, 100)}:${count}`;
  const cached = aiCache.get(cacheKey, { count, existingFlashcardIds });
  if (cached) {
    return { ...cached, fromCache: true };
  }

  // 3. Try local processing for simple text
  if (sourceText.length < 500) {
    const localResult = smartProcessor.extractKeywords(sourceText, Math.min(count, 5));
    if (localResult.success) {
      // Record usage even for local processing
      tokenMonitor.recordUsage('flashcards-local', 'none', 0, 0, userId);

      const result = {
        flashcards: [], // Would generate simple flashcards
        method: 'local',
        fromCache: false
      };

      aiCache.set(cacheKey, result, { count, existingFlashcardIds }, 1800000); // 30 min cache
      return result;
    }
  }

  // 4. Use optimized prompt for AI processing
  const promptVersion = selectPromptVersion(sourceText, 'flashcards');
  const optimizedPrompt = getOptimizedPrompt('flashcards', {
    count,
    text: sourceText,
    existing: existingFlashcardIds.join(', ')
  }, promptVersion);

  // 5. Call your AI service here
  console.log('Using optimized prompt:', optimizedPrompt);

  // Simulate AI call (replace with your actual AI integration)
  const startTime = Date.now();
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API delay
  const result = {
    flashcards: [], // Your AI would generate actual flashcards
    method: 'ai',
    promptVersion,
    fromCache: false
  };

  // 6. Record token usage (estimate for demo)
  const promptTokens = Math.ceil(optimizedPrompt.length / 4);
  const completionTokens = Math.ceil(JSON.stringify(result).length / 4);
  tokenMonitor.recordUsage('flashcards-ai', 'gemini-pro', promptTokens, completionTokens, userId, optimizedPrompt);

  // 7. Cache the result
  aiCache.set(cacheKey, result, { count, existingFlashcardIds }, 1800000); // 30 min cache

  return result;
}

/**
 * Example: Optimized text summarization
 */
export async function summarizeTextOptimized(input: {
  text: string;
  length?: number;
  userId?: string;
}) {
  const { text, length = 5, userId } = input;

  // Rate limiting
  const rateLimit = rateLimiter.checkLimit(userId || 'anonymous', 10, 60000); // 10 per minute
  if (!rateLimit.allowed) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // Check cache
  const cacheKey = `summary:${text.substring(0, 100)}:${length}`;
  const cached = aiCache.get(cacheKey, { length });
  if (cached) {
    return { ...cached, fromCache: true };
  }

  // Try local processing first
  const localResult = await smartProcessor.summarize(text, { maxLength: length });
  if (localResult.success && !localResult.usedAI) {
    tokenMonitor.recordUsage('summary-local', 'none', 0, 0, userId);

    const result = {
      summary: localResult.data,
      method: 'local',
      fromCache: false
    };

    aiCache.set(cacheKey, result, { length }, 3600000); // 1 hour cache
    return result;
  }

  // Use optimized prompt
  const promptVersion = selectPromptVersion(text, 'summary');
  const optimizedPrompt = getOptimizedPrompt('summary', {
    text,
    length: `${length} bullet points`
  }, promptVersion);

  console.log('Using optimized summary prompt:', optimizedPrompt);

  // Simulate AI call
  await new Promise(resolve => setTimeout(resolve, 100));
  const result = {
    summary: 'AI-generated summary would go here',
    method: 'ai',
    promptVersion,
    fromCache: false
  };

  // Record usage
  const promptTokens = Math.ceil(optimizedPrompt.length / 4);
  const completionTokens = Math.ceil(result.summary.length / 4);
  tokenMonitor.recordUsage('summary-ai', 'gemini-pro', promptTokens, completionTokens, userId, optimizedPrompt);

  // Cache result
  aiCache.set(cacheKey, result, { length }, 3600000);

  return result;
}

/**
 * Example: Batch processing multiple operations
 */
export async function batchProcessOptimized(operations: Array<{
  type: 'summary' | 'keywords' | 'questions';
  text: string;
  params?: Record<string, any>;
  userId?: string;
}>) {
  const results = [];

  for (const op of operations) {
    try {
      switch (op.type) {
        case 'summary':
          const summaryResult = await summarizeTextOptimized({
            text: op.text,
            length: op.params?.length || 3,
            userId: op.userId
          });
          results.push({ type: 'summary', ...summaryResult });
          break;

        case 'keywords':
          const keywordResult = await smartProcessor.extractKeywords(
            op.text,
            op.params?.count || 5
          );
          if (keywordResult.success) {
            tokenMonitor.recordUsage('keywords-local', 'none', 0, 0, op.userId);
            results.push({ type: 'keywords', ...keywordResult });
          }
          break;

        case 'questions':
          const questionResult = await smartProcessor.generateQuestions(
            op.text,
            op.params?.count || 3
          );
          if (questionResult.success) {
            tokenMonitor.recordUsage('questions-local', 'none', 0, 0, op.userId);
            results.push({ type: 'questions', ...questionResult });
          }
          break;
      }
    } catch (error) {
      results.push({
        type: op.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }
  }

  return results;
}

/**
 * Get comprehensive optimization statistics
 */
export async function getOptimizationStats() {
  const tokenStats = tokenMonitor.getUsageStats(24);
  const topFeatures = tokenMonitor.getTopFeatures(5);
  const cacheStats = aiCache.getStats();

  // Calculate estimated savings
  const estimatedSavings = tokenStats.totalTokens * 0.4; // 40% estimated savings
  const costSavings = tokenStats.totalCost * 0.4;

  return {
    period: '24 hours',
    tokenUsage: {
      total: tokenStats.totalTokens,
      cost: tokenStats.totalCost,
      breakdown: tokenStats.featureBreakdown
    },
    cachePerformance: {
      size: cacheStats.size,
      efficiency: cacheStats.hitRate || 'Unknown'
    },
    expensiveFeatures: topFeatures,
    estimatedSavings: {
      tokens: Math.round(estimatedSavings),
      cost: Math.round(costSavings * 100) / 100,
      percentage: 40
    },
    recommendations: generateRecommendations(tokenStats, cacheStats)
  };
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(tokenStats: any, cacheStats: any) {
  const recommendations = [];

  // Check if caching is being used effectively
  if (cacheStats.size < 10) {
    recommendations.push('Increase cache TTL or add more cachable operations');
  }

  // Check for expensive features
  const expensiveFeatures = tokenStats.featureBreakdown;
  const topFeature = Object.entries(expensiveFeatures)
    .sort(([,a]: any, [,b]: any) => b.cost - a.cost)[0];

  if (topFeature && topFeature[1].cost > 0.1) {
    recommendations.push(`Optimize ${topFeature[0]} - it's your most expensive feature`);
  }

  // Check for high token usage
  if (tokenStats.totalTokens > 10000) {
    recommendations.push('Consider implementing local fallbacks for high-volume operations');
  }

  return recommendations;
}

/**
 * Health check for all optimization systems
 */
export async function checkSystemHealth() {
  const checks = {
    cache: { healthy: false, details: 'Not tested' },
    monitoring: { healthy: false, details: 'Not tested' },
    rateLimit: { healthy: false, details: 'Not tested' },
    localFallbacks: { healthy: false, details: 'Not tested' },
    promptTemplates: { healthy: false, details: 'Not tested' }
  };

  try {
    // Test cache
    aiCache.set('health-check', 'ok', {}, 5000);
    checks.cache = {
      healthy: aiCache.get('health-check', {}) === 'ok',
      details: 'Cache read/write working'
    };

    // Test monitoring
    tokenMonitor.recordUsage('health-check', 'test', 1, 1);
    checks.monitoring = {
      healthy: true,
      details: 'Token recording working'
    };

    // Test rate limiting
    const limit = rateLimiter.checkLimit('health-check-ip');
    checks.rateLimit = {
      healthy: limit.allowed,
      details: `Rate limit check working (${limit.remaining} remaining)`
    };

    // Test local fallbacks
    const formatResult = smartProcessor.format('test   text');
    checks.localFallbacks = {
      healthy: formatResult.success,
      details: 'Local processing working'
    };

    // Test prompt templates
    const prompt = getOptimizedPrompt('summary', { text: 'test', length: '3' });
    checks.promptTemplates = {
      healthy: prompt.length > 0,
      details: 'Prompt templates working'
    };

  } catch (error) {
    console.error('Health check failed:', error);
    return {
      overall: false,
      checks,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  const overallHealth = Object.values(checks).every(check => check.healthy);

  return {
    overall: overallHealth,
    checks,
    timestamp: new Date().toISOString()
  };
}