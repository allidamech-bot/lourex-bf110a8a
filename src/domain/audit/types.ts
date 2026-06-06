export type AuditEventType = 
  | "DEAL_CREATED"
  | "DEAL_CLOSED"
  | "TRACKING_STAGE_MUTATED"
  | "ATTACHMENT_UPLOADED"
  | "FINANCIAL_DRIFT_DETECTED"
  | "SETTLEMENT_CREATED"
  | "SYSTEM_ERROR";

export interface EventPayload {
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AppAuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string | null;
  userRole: string | null;
  eventType: AuditEventType;
  targetId: string;
  payload: EventPayload;
}
