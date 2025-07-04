import { Injectable } from '@nestjs/common';

/**
 * Performance Monitoring Service
 * 
 * Provides infrastructure for tracking performance metrics
 * and monitoring system health indicators.
 */
@Injectable()
export class PerformanceService {
  private metrics: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  startTimer(operationName: string): void {
    this.timers.set(operationName, Date.now());
  }

  /**
   * End timing an operation and record the duration
   */
  endTimer(operationName: string): number {
    const startTime = this.timers.get(operationName);
    if (!startTime) {
      return 0;
    }

    const duration = Date.now() - startTime;
    this.metrics.set(`${operationName}_duration`, duration);
    this.timers.delete(operationName);
    
    return duration;
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number): void {
    this.metrics.set(name, value);
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Get a specific metric
   */
  getMetric(name: string): number | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(queryName: string, duration: number): void {
    this.recordMetric(`db_query_${queryName}`, duration);
  }

  /**
   * Track use case execution performance
   */
  trackUseCaseExecution(useCaseName: string, duration: number): void {
    this.recordMetric(`usecase_${useCaseName}`, duration);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalOperations: number;
    averageResponseTime: number;
    slowestOperation: { name: string; duration: number } | null;
    fastestOperation: { name: string; duration: number } | null;
  } {
    const entries = Array.from(this.metrics.entries());
    const durationEntries = entries.filter(([name]) => name.endsWith('_duration'));

    if (durationEntries.length === 0) {
      return {
        totalOperations: 0,
        averageResponseTime: 0,
        slowestOperation: null,
        fastestOperation: null,
      };
    }

    const durations = durationEntries.map(([, duration]) => duration);
    const totalOperations = durations.length;
    const averageResponseTime = durations.reduce((sum, duration) => sum + duration, 0) / totalOperations;

    const slowest = durationEntries.reduce((prev, current) => 
      prev[1] > current[1] ? prev : current
    );
    const fastest = durationEntries.reduce((prev, current) => 
      prev[1] < current[1] ? prev : current
    );

    return {
      totalOperations,
      averageResponseTime,
      slowestOperation: { name: slowest[0], duration: slowest[1] },
      fastestOperation: { name: fastest[0], duration: fastest[1] },
    };
  }
}