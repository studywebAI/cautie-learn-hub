export interface PerformanceMetrics {
  endpoint: string;
  duration: number;
  cached: boolean;
  timestamp: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000;

  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only the last 1000 metrics to prevent memory issues
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageResponseTime(endpoint?: string): number {
    const filteredMetrics = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;
    
    if (filteredMetrics.length === 0) return 0;
    
    const total = filteredMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / filteredMetrics.length;
  }

  getCacheHitRate(endpoint?: string): number {
    const filteredMetrics = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;
    
    if (filteredMetrics.length === 0) return 0;
    
    const cachedCount = filteredMetrics.filter(m => m.cached).length;
    return (cachedCount / filteredMetrics.length) * 100;
  }

  getSuccessRate(endpoint?: string): number {
    const filteredMetrics = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;
    
    if (filteredMetrics.length === 0) return 0;
    
    const successCount = filteredMetrics.filter(m => m.success).length;
    return (successCount / filteredMetrics.length) * 100;
  }

  getMetricsSummary(): {
    totalRequests: number;
    averageResponseTime: number;
    cacheHitRate: number;
    successRate: number;
    endpoints: {
      [endpoint: string]: {
        count: number;
        averageResponseTime: number;
        cacheHitRate: number;
        successRate: number;
      };
    };
  } {
    const endpoints = new Set(this.metrics.map(m => m.endpoint));
    
    const endpointStats: { [key: string]: any } = {};
    endpoints.forEach(endpoint => {
      endpointStats[endpoint] = {
        count: this.metrics.filter(m => m.endpoint === endpoint).length,
        averageResponseTime: this.getAverageResponseTime(endpoint),
        cacheHitRate: this.getCacheHitRate(endpoint),
        successRate: this.getSuccessRate(endpoint)
      };
    });

    return {
      totalRequests: this.metrics.length,
      averageResponseTime: this.getAverageResponseTime(),
      cacheHitRate: this.getCacheHitRate(),
      successRate: this.getSuccessRate(),
      endpoints: endpointStats
    };
  }

  clearMetrics() {
    this.metrics = [];
  }

  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      summary: this.getMetricsSummary()
    }, null, 2);
  }
}

export const performanceMonitor = new PerformanceMonitor();