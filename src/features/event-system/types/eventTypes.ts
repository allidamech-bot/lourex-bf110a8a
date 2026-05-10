import type { WorkflowIntelligenceDataset, WorkflowSeverity } from "@/features/workflow-intelligence/types/workflowTypes";

export type EventLanguage = "ar" | "en";

export type OperationalEventSeverity = WorkflowSeverity;

export type OperationalEventType =
  | "shipment_delay"
  | "shipment_update"
  | "escalation_trigger"
  | "finance_alert"
  | "settlement_issue"
  | "workflow_blockage"
  | "dispute_escalation"
  | "customer_operational_event"
  | "ai_recommendation";

export type OperationalEventSource =
  | "ai_ops"
  | "workflow_intelligence"
  | "shipment_intelligence"
  | "finance_audit"
  | "event_system";

export type OperationalEntityReference = {
  entityType: "shipment" | "deal" | "customer" | "settlement" | "financial_entry" | "purchase_request" | "workflow";
  entityId: string;
  label: string;
};

export type OperationalEventMetadata = Record<string, string | number | boolean | string[] | null>;

export type OperationalEvent = {
  id: string;
  type: OperationalEventType;
  severity: OperationalEventSeverity;
  createdAt: string;
  occurredAt: string;
  entity: OperationalEntityReference;
  sourceModule: OperationalEventSource;
  title: string;
  summary: string;
  metadata: OperationalEventMetadata;
  dedupeKey: string;
  replayKey: string;
  advisoryOnly: true;
};

export type EventQueueItem = {
  event: OperationalEvent;
  priority: number;
  attempts: number;
  queuedAt: string;
};

export type EventProcessingStatus = "queued" | "processed" | "deduplicated" | "replayed" | "retry_ready";

export type EventProcessingRecord = {
  eventId: string;
  status: EventProcessingStatus;
  priority: number;
  processedAt: string;
  message: string;
};

export type NotificationAudience = "operations" | "finance" | "partners" | "executives" | "customers";

export type NotificationPriority = "info" | "warning" | "urgent" | "critical";

export type NotificationRoute = {
  id: string;
  eventId: string;
  audience: NotificationAudience;
  priority: NotificationPriority;
  recommendationOnly: boolean;
  reason: string;
};

export type RealtimeSignalType =
  | "active_operational_alerts"
  | "workflow_instability"
  | "unresolved_escalations"
  | "finance_risk_spike"
  | "operational_bottleneck";

export type RealtimeSignal = {
  id: string;
  type: RealtimeSignalType;
  severity: OperationalEventSeverity;
  count: number;
  label: string;
  updatedAt: string;
};

export type EventTimelineItem = {
  id: string;
  eventId: string;
  title: string;
  description: string;
  severity: OperationalEventSeverity;
  sourceModule: OperationalEventSource;
  occurredAt: string;
  entityLabel: string;
};

export type EventPipelineResult = {
  queued: EventQueueItem[];
  processedEvents: OperationalEvent[];
  processingRecords: EventProcessingRecord[];
  notifications: NotificationRoute[];
  realtimeSignals: RealtimeSignal[];
  timeline: EventTimelineItem[];
};

export type EventSystemDataset = WorkflowIntelligenceDataset;
