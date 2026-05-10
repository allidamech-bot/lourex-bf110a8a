import type { EventSystemDataset, OperationalEntityReference, OperationalEventSeverity } from "@/features/event-system/types/eventTypes";
import type { DistributedRuntimeResult } from "@/features/distributed-runtime/types/distributedTypes";

export type ExecutionLanguage = "ar" | "en";

export type ExecutionPriority = "low" | "medium" | "high" | "critical";

export type ExecutionAgentType =
  | "shipment_coordination"
  | "escalation_handling"
  | "workflow_recovery"
  | "notification_dispatch_preparation"
  | "finance_review_recommendation"
  | "operational_anomaly_handling";

export type ExecutionActionType =
  | "prepare_customer_update"
  | "assign_internal_review"
  | "prepare_partner_escalation"
  | "prepare_finance_review"
  | "prepare_notification_dispatch"
  | "prepare_workflow_recovery"
  | "isolate_stale_execution";

export type ExecutionStatus =
  | "queued"
  | "approval_required"
  | "approved"
  | "rejected"
  | "executed"
  | "failed"
  | "retry_ready"
  | "stale_isolated";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type OperationalAgent = Readonly<{
  id: string;
  type: ExecutionAgentType;
  label: string;
  deterministic: true;
  approvalRequired: boolean;
  supportedActions: ExecutionActionType[];
}>;

export type ExecutionAction = Readonly<{
  id: string;
  type: ExecutionActionType;
  priority: ExecutionPriority;
  agentType: ExecutionAgentType;
  entity: OperationalEntityReference;
  title: string;
  detail: string;
  approvalRequired: boolean;
  replayKey: string;
  createdAt: string;
  sourceSeverity: OperationalEventSeverity;
  immutable: true;
}>;

export type ExecutionQueueItem = Readonly<{
  id: string;
  action: ExecutionAction;
  status: ExecutionStatus;
  attempts: number;
  queuedAt: string;
  nextAttemptAt?: string;
  staleAt: string;
}>;

export type ApprovalRequest = Readonly<{
  id: string;
  queueItemId: string;
  actionId: string;
  reviewerRole: "operations_lead" | "finance_lead" | "executive";
  status: ApprovalStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewerName?: string;
  reason: string;
}>;

export type ExecutionPolicyConfig = Readonly<{
  maxAttempts: number;
  retryAfterMinutes: number;
  staleExecutionMinutes: number;
  approvalRequiredPriorities: ExecutionPriority[];
  autoExecutableActions: ExecutionActionType[];
}>;

export type GuardedExecutionRecord = Readonly<{
  id: string;
  queueItemId: string;
  actionId: string;
  status: ExecutionStatus;
  applied: boolean;
  approvalId?: string;
  executedAt: string;
  replayKey: string;
  rollbackPrepared: boolean;
  message: string;
  immutable: true;
}>;

export type ExecutionAuditRecord = Readonly<{
  id: string;
  actionId: string;
  queueItemId?: string;
  event: "queued" | "approval_requested" | "approved" | "rejected" | "executed" | "failed" | "retry_ready" | "stale_isolated";
  occurredAt: string;
  actor: string;
  message: string;
  replayKey: string;
  immutable: true;
}>;

export type ExecutionRecoveryState = Readonly<{
  restoredQueue: ExecutionQueueItem[];
  retryReady: ExecutionQueueItem[];
  staleIsolated: ExecutionQueueItem[];
  replayKeys: string[];
  recoveredAt: string;
}>;

export type ExecutionRuntimeResult = Readonly<{
  distributed: DistributedRuntimeResult;
  agents: OperationalAgent[];
  actions: ExecutionAction[];
  queue: ExecutionQueueItem[];
  approvals: ApprovalRequest[];
  executionRecords: GuardedExecutionRecord[];
  audit: ExecutionAuditRecord[];
  recovery: ExecutionRecoveryState;
  generatedAt: string;
}>;

export type ExecutionRuntimeInput = Readonly<{
  dataset: EventSystemDataset;
  distributed?: DistributedRuntimeResult;
  now?: Date;
}>;
