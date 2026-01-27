interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

interface UsageRecord {
  id: string;
  timestamp: number;
  feature: string;
  model: string;
  usage: TokenUsage;
  userId?: string;
  prompt?: string;
  metadata?: Record<string, any>;
}

class TokenMonitor {
  private usageRecords: UsageRecord[] = [];
  private readonly maxRecords = 10000; // Keep last 10k records
  private costPerThousandTokens = {
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gemini-pro': { input: 0.00025, output: 0.0005 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  };

  recordUsage(
    feature: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    userId?: string,
    prompt?: string,
    metadata?: Record<string, any>
  ): void {
    const totalTokens = promptTokens + completionTokens;
    const rates = this.costPerThousandTokens[model as keyof typeof this.costPerThousandTokens] || { input: 0, output: 0 };
    const cost = (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output;

    const record: UsageRecord = {
      id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      feature,
      model,
      usage: { promptTokens, completionTokens, totalTokens, cost },
      userId,
      prompt,
      metadata
    };

    this.usageRecords.push(record);

    if (this.usageRecords.length > this.maxRecords) {
      this.usageRecords = this.usageRecords.slice(-this.maxRecords);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[TokenMonitor] ${feature}: ${totalTokens} tokens ($${cost.toFixed(6)})`);
    }
  }

  getUsageStats(hours: number = 24): {
    totalTokens: number;
    totalCost: number;
    featureBreakdown: Record<string, { tokens: number; cost: number; calls: number }>;
    modelBreakdown: Record<string, { tokens: number; cost: number; calls: number }>;
  } {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recentRecords = this.usageRecords.filter(r => r.timestamp > cutoff);

    const featureBreakdown: Record<string, { tokens: number; cost: number; calls: number }> = {};
    const modelBreakdown: Record<string, { tokens: number; cost: number; calls: number }> = {};

    let totalTokens = 0;
    let totalCost = 0;

    recentRecords.forEach(record => {
      totalTokens += record.usage.totalTokens;
      totalCost += record.usage.cost;

      if (!featureBreakdown[record.feature]) {
        featureBreakdown[record.feature] = { tokens: 0, cost: 0, calls: 0 };
      }
      featureBreakdown[record.feature].tokens += record.usage.totalTokens;
      featureBreakdown[record.feature].cost += record.usage.cost;
      featureBreakdown[record.feature].calls += 1;

      if (!modelBreakdown[record.model]) {
        modelBreakdown[record.model] = { tokens: 0, cost: 0, calls: 0 };
      }
      modelBreakdown[record.model].tokens += record.usage.totalTokens;
      modelBreakdown[record.model].cost += record.usage.cost;
      modelBreakdown[record.model].calls += 1;
    });

    return { totalTokens, totalCost, featureBreakdown, modelBreakdown };
  }

  getTopFeatures(limit: number = 5): Array<{ feature: string; cost: number; tokens: number }> {
    const stats = this.getUsageStats(24);
    return Object.entries(stats.featureBreakdown)
      .map(([feature, data]) => ({ feature, cost: data.cost, tokens: data.tokens }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  exportData(hours: number = 24): UsageRecord[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.usageRecords.filter(r => r.timestamp > cutoff);
  }

  cleanup(days: number = 30): void {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    this.usageRecords = this.usageRecords.filter(r => r.timestamp > cutoff);
  }

  updateCostRates(model: string, inputCost: number, outputCost: number): void {
    this.costPerThousandTokens[model as keyof typeof this.costPerThousandTokens] = {
      input: inputCost,
      output: outputCost
    };
  }
}

export const tokenMonitor = new TokenMonitor();

export function withMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  feature: string,
  model: string = 'unknown'
) {
  return async (...args: T): Promise<R> => {
    try {
      const result = await fn(...args);

      let promptTokens = 0;
      let completionTokens = 0;

      if (result && typeof result === 'object') {
        const resultObj = result as any;

        if (resultObj.usage) {
          promptTokens = resultObj.usage.prompt_tokens || 0;
          completionTokens = resultObj.usage.completion_tokens || 0;
        } else if (resultObj.metadata?.tokenCount) {
          promptTokens = resultObj.metadata.tokenCount.prompt || 0;
          completionTokens = resultObj.metadata.tokenCount.response || 0;
        } else {
          const prompt = args[0] as string;
          const response = JSON.stringify(result);
          promptTokens = Math.ceil(prompt.length / 4);
          completionTokens = Math.ceil(response.length / 4);
        }
      }

      tokenMonitor.recordUsage(feature, model, promptTokens, completionTokens, undefined, args[0] as string);
      return result;
    } catch (error) {
      tokenMonitor.recordUsage(feature, model, 0, 0, undefined, args[0] as string, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };
}

export function getTokenStats(hours: number = 24) {
  return tokenMonitor.getUsageStats(hours);
}

export function getTopFeatures(limit: number = 5) {
  return tokenMonitor.getTopFeatures(limit);
}