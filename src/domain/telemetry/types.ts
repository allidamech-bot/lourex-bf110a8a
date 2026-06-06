export type MetricType = 'PERFORMANCE_LATENCY' | 'SYSTEM_EXCEPTION' | 'SECURITY_VIOLATION' | 'SYSTEM_EVENT';
export type TelemetrySeverity = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface TelemetryHeartbeat {
  metricId: string;
  timestamp: Date;
  type: MetricType;
  severity: TelemetrySeverity;
  message: string;
  context?: Record<string, unknown>;
}
