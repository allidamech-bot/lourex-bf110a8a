import type { MetricType, TelemetrySeverity, TelemetryHeartbeat } from "./types";

/**
 * Generates a unique metric ID for each telemetry event.
 */
const generateMetricId = (): string => {
  return `TEL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
};

/**
 * The Central Diagnostics Collector for Lourex Platform.
 * Aggregates runtime errors and performance metrics before logging.
 */
class TelemetryService {
  /**
   * Tracks a general system metric or operational event.
   */
  public trackMetric(type: MetricType, severity: TelemetrySeverity, message: string, context?: Record<string, unknown>): TelemetryHeartbeat {
    const heartbeat: TelemetryHeartbeat = {
      metricId: generateMetricId(),
      timestamp: new Date(),
      type,
      severity,
      message,
      context,
    };

    this.dispatchToOutput(heartbeat);
    return heartbeat;
  }

  /**
   * Captures an exception, wrapping it cleanly for telemetry output.
   * Ensures internal stack traces or sensitive details aren't carelessly dumped without structure.
   */
  public captureException(error: unknown, operationalMessage: string, context?: Record<string, unknown>): Error {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    this.trackMetric(
      "SYSTEM_EXCEPTION",
      "ERROR",
      `${operationalMessage} | Reason: ${errorMsg}`,
      {
        ...context,
        rawError: error instanceof Error ? { name: error.name, stack: error.stack } : null
      }
    );

    // Return a sanitized error for the UI layer to consume without breaking.
    return new Error(`${operationalMessage}. Please check telemetry logs.`);
  }

  /**
   * Times a function execution and reports its latency.
   */
  public async measureLatency<T>(operationName: string, operation: () => Promise<T>, context?: Record<string, unknown>): Promise<T> {
    const start = performance.now();
    try {
      return await operation();
    } finally {
      const duration = performance.now() - start;
      if (duration > 1000) {
        // Log a warning if the operation is particularly slow
        this.trackMetric("PERFORMANCE_LATENCY", "WARN", `${operationName} took ${duration.toFixed(2)}ms`, { duration, ...context });
      } else {
        this.trackMetric("PERFORMANCE_LATENCY", "INFO", `${operationName} took ${duration.toFixed(2)}ms`, { duration, ...context });
      }
    }
  }

  /**
   * Dispatches the telemetry to standard output (or external service like Datadog/Sentry later).
   */
  private dispatchToOutput(heartbeat: TelemetryHeartbeat): void {
    // We stringify context to avoid deep object reference issues in basic stdout
    const contextString = heartbeat.context ? JSON.stringify(heartbeat.context) : "";
    const logLine = `[TELEMETRY][${heartbeat.severity}][${heartbeat.type}] ${heartbeat.metricId} - ${heartbeat.message} ${contextString}`;
    
    switch(heartbeat.severity) {
      case 'FATAL':
      case 'ERROR':
        console.error(logLine);
        break;
      case 'WARN':
        console.warn(logLine);
        break;
      default:
        console.log(logLine);
        break;
    }
  }
}

export const telemetry = new TelemetryService();
