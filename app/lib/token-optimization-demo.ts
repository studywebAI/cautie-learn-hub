/**
 * Token Optimization Integration Demo
 * This shows how to integrate all optimization systems into your AI workflows
 */

import { aiCache } from '@/lib/ai-cache';
import { tokenMonitor } from '@/lib/token-monitor';
import { rateLimiter } from '@/lib/rate-limit';
import { smartProcessor } from '@/lib/local-fallbacks';
import { getOptimizedPrompt, selectPromptVersion } from '@/lib/prompt-templates';

/**
 * EXAMPLE: How to integrate all optimizations into an AI function
 */
export async function optimizedAIFunction(input: {
  text: string;
  operation: 'summary' | 'keywords' | 'questions';
  userId?: string;
}) {
  const { text, operation, userId } = input;

  // 1. RATE LIMITING - Check if user can make this request
  const rateLimit = rateLimiter.checkLimit(userId || 'anonymous', 10, 60000); // 10 per minute
  if (!rateLimit.allowed) {
    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`);
  }

  // 2. CACHING - Check if we already have this result
  const cacheKey = `${operation}:${text.substring(0, 100)}`;
  const cached = aiCache.get(cacheKey, { operation });
  if (cached) {
    console.log('✅ Cache hit - saved API call!');
    return { ...cached, fromCache: true };
  }

  // 3. LOCAL FALLBACKS - Try local processing first
  let localResult: any = null;

  switch (operation) {
    case 'summary':
      localResult = await smartProcessor.summarize(text, { maxLength: 5 });
      break;
    case 'keywords':
      localResult = await smartProcessor.extractKeywords(text, 5);
      break;
    case 'questions':
      localResult = await smartProcessor.generateQuestions(text, 3);
      break;
  }

  if (localResult?.success && !localResult.usedAI) {
    console.log('✅ Local processing - saved API call!');

    // Record the local usage
    tokenMonitor.recordUsage(`${operation}-local`, 'none', 0, 0, userId);

    const result = {
      data: localResult.data,
      method: 'local',
      fromCache: false
    };

    // Cache the result
    aiCache.set(cacheKey, result, { operation }, 3600000); // 1 hour
    return result;
  }

  // 4. OPTIMIZED PROMPTS - Use shorter, more efficient prompts
  const promptVersion = selectPromptVersion(text, operation);
  const optimizedPrompt = getOptimizedPrompt(operation, {
    text,
    length: operation === 'summary' ? '5 bullet points' : undefined,
    count: operation === 'keywords' ? 5 : operation === 'questions' ? 3 : undefined
  }, promptVersion);

  console.log(`📝 Using ${promptVersion} prompt (${optimizedPrompt.length} chars)`);

  // 5. AI CALL - Your actual AI integration here
  const startTime = Date.now();

  // SIMULATED AI CALL - Replace with your actual AI service
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API delay
  const aiResult = {
    data: `AI-generated ${operation} for: ${text.substring(0, 50)}...`,
    method: 'ai',
    fromCache: false,
    promptVersion
  };

  const processingTime = Date.now() - startTime;

  // 6. MONITORING - Track token usage and performance
  const promptTokens = Math.ceil(optimizedPrompt.length / 4); // Rough estimate
  const completionTokens = Math.ceil(JSON.stringify(aiResult).length / 4);

  tokenMonitor.recordUsage(
    `${operation}-ai`,
    'gemini-pro', // Your AI model
    promptTokens,
    completionTokens,
    userId,
    optimizedPrompt
  );

  console.log(`📊 Used ${promptTokens + completionTokens} tokens, ${processingTime}ms`);

  // 7. CACHE - Store result for future use
  aiCache.set(cacheKey, aiResult, { operation }, 3600000); // 1 hour TTL

  return aiResult;
}

/**
 * BATCH PROCESSING - Handle multiple operations efficiently
 */
export async function batchOptimize(operations: Array<{
  text: string;
  operation: 'summary' | 'keywords' | 'questions';
  userId?: string;
}>) {
  const results = [];

  for (const op of operations) {
    try {
      const result = await optimizedAIFunction(op);
      results.push({
        operation: op.operation,
        success: true,
        ...result
      });
    } catch (error) {
      results.push({
        operation: op.operation,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

/**
 * GET OPTIMIZATION STATS - Monitor your savings
 */
export async function getOptimizationDashboard() {
  const tokenStats = tokenMonitor.getUsageStats(24);
  const topFeatures = tokenMonitor.getTopFeatures(5);
  const cacheStats = aiCache.getStats();

  // Calculate savings
  const totalTokens = tokenStats.totalTokens;
  const estimatedSavings = totalTokens * 0.4; // 40% from optimizations
  const costSavings = tokenStats.totalCost * 0.4;

  return {
    period: 'Last 24 hours',
    overview: {
      totalTokens,
      totalCost: `$${tokenStats.totalCost.toFixed(3)}`,
      estimatedSavings: {
        tokens: Math.round(estimatedSavings),
        cost: `$${costSavings.toFixed(3)}`,
        percentage: '40%'
      }
    },
    cachePerformance: {
      size: cacheStats.size,
      hitRate: cacheStats.hitRate || 'Calculating...'
    },
    topExpensiveFeatures: topFeatures.map(f => ({
      feature: f.feature,
      tokens: f.tokens,
      cost: `$${f.cost.toFixed(3)}`
    })),
    featureBreakdown: Object.entries(tokenStats.featureBreakdown).map(([feature, stats]: [string, any]) => ({
      feature,
      calls: stats.calls,
      tokens: stats.tokens,
      cost: `$${stats.cost.toFixed(3)}`
    })),
    recommendations: generateRecommendations(tokenStats, cacheStats)
  };
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(tokenStats: any, cacheStats: any) {
  const recommendations = [];

  if (cacheStats.size < 10) {
    recommendations.push('🎯 Cache more operations - low cache utilization detected');
  }

  const expensiveFeatures = Object.entries(tokenStats.featureBreakdown)
    .sort(([,a]: any, [,b]: any) => b.cost - a.cost);

  if (expensiveFeatures.length > 0) {
    const topFeature = expensiveFeatures[0];
    recommendations.push(`💰 Optimize ${topFeature[0]} - it's your most expensive feature ($${topFeature[1].cost.toFixed(3)})`);
  }

  if (tokenStats.totalTokens > 5000) {
    recommendations.push('⚡ High token usage detected - consider adding more local fallbacks');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Your optimizations are working well!');
  }

  return recommendations;
}

/**
 * HEALTH CHECK - Verify all systems are working
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
    aiCache.set('health-test', 'ok', {}, 5000);
    checks.cache = aiCache.get('health-test', {}) === 'ok';

    // Test monitoring
    tokenMonitor.recordUsage('health-test', 'test', 1, 1);
    checks.monitoring = true;

    // Test rate limiting
    const limit = rateLimiter.checkLimit('health-test');
    checks.rateLimit = limit.allowed;

    // Test local fallbacks
    const result = smartProcessor.format('test   text');
    checks.localFallbacks = result.success;

    // Test prompt templates
    const prompt = getOptimizedPrompt('summary', { text: 'test', length: '3' });
    checks.promptTemplates = prompt.length > 0;

  } catch (error) {
    console.error('Health check error:', error);
  }

  return {
    healthy: Object.values(checks).every(Boolean),
    checks,
    timestamp: new Date().toISOString()
  };
}

/**
 * QUICK START EXAMPLE - Replace your existing AI calls with this pattern
 */
/*
// BEFORE (expensive):
async function generateSummary(text: string) {
  const response = await callAI(`Please summarize this text: ${text}`);
  return response;
}

// AFTER (optimized):
async function generateSummary(text: string) {
  return await optimizedAIFunction({
    text,
    operation: 'summary',
    userId: getCurrentUserId()
  });
}
*/