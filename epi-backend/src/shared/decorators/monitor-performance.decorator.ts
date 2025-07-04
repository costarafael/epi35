import { PerformanceService } from '../monitoring/performance.service';

/**
 * Decorator to automatically monitor performance of methods
 */
export function MonitorPerformance(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metricName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      // Get performance service instance (would be injected in real implementation)
      const performanceService = new PerformanceService();
      
      performanceService.startTimer(metricName);
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performanceService.endTimer(metricName);
        
        // Log performance if needed
        console.log(`[PERFORMANCE] ${metricName}: ${duration}ms`);
        
        return result;
      } catch (error) {
        performanceService.endTimer(metricName);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator specifically for use cases
 */
export function MonitorUseCase(useCaseName?: string) {
  return MonitorPerformance(useCaseName ? `usecase_${useCaseName}` : undefined);
}

/**
 * Decorator specifically for database operations
 */
export function MonitorDatabaseQuery(queryName?: string) {
  return MonitorPerformance(queryName ? `db_query_${queryName}` : undefined);
}