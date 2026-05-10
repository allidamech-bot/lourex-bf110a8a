import type { EventSystemDataset, EventTimelineItem, OperationalEventSeverity } from "@/features/event-system/types/eventTypes";
import type { NotificationQueueItem, RuntimeBootstrapResult } from "@/features/runtime-infra/types/runtimeTypes";

export type CollaborationLanguage = "ar" | "en";

export type CollaborationEntityType =
  | "workflow"
  | "shipment"
  | "deal"
  | "settlement"
  | "customer"
  | "finance"
  | "purchase_request";

export type CollaborationActivity =
  | "viewing"
  | "reviewing"
  | "editing_draft"
  | "owning_escalation"
  | "coordinating_follow_up"
  | "idle";

export type ConflictResolutionStrategy = "latest_timestamp" | "severity_priority" | "owner_priority";

export type OperationalSession = Readonly<{
  sessionId: string;
  operatorId: string;
  operatorName: string;
  role: "operations" | "finance" | "partner" | "executive";
  startedAt: string;
  lastHeartbeatAt: string;
  activeEntity?: {
    entityType: CollaborationEntityType;
    entityId: string;
    label: string;
  };
  activity: CollaborationActivity;
}>;

export type OperationalPresence = Readonly<{
  sessionId: string;
  operatorId: string;
  operatorName: string;
  role: OperationalSession["role"];
  activity: CollaborationActivity;
  activeEntityLabel?: string;
  heartbeatAgeSeconds: number;
  stale: boolean;
}>;

export type WorkflowOwnership = Readonly<{
  entityType: CollaborationEntityType;
  entityId: string;
  ownerSessionId: string;
  ownerName: string;
  claimedAt: string;
  expiresAt: string;
  severity: OperationalEventSeverity;
}>;

export type SharedWorkflowState = Readonly<{
  entityKey: string;
  entityType: CollaborationEntityType;
  entityId: string;
  label: string;
  severity: OperationalEventSeverity;
  status: "open" | "in_review" | "coordinating" | "recovered";
  owner?: WorkflowOwnership;
  updatedAt: string;
  version: number;
  replayKey: string;
}>;

export type SharedOperationalSnapshot = Readonly<{
  id: string;
  createdAt: string;
  sessions: OperationalSession[];
  presence: OperationalPresence[];
  workflows: SharedWorkflowState[];
  notifications: NotificationQueueItem[];
  timeline: EventTimelineItem[];
  replayKeys: string[];
  immutable: true;
}>;

export type CollaborationSignal = Readonly<{
  id: string;
  type:
    | "multi_user_awareness"
    | "active_workflow_editing"
    | "escalation_coordination"
    | "stale_session"
    | "synchronization_required";
  severity: OperationalEventSeverity;
  label: string;
  count: number;
  updatedAt: string;
}>;

export type SynchronizationPolicyConfig = Readonly<{
  syncIntervalMs: number;
  staleSessionSeconds: number;
  ownershipTtlMinutes: number;
  reconciliationPriority: "events_first" | "presence_first" | "ownership_first";
  conflictResolution: ConflictResolutionStrategy;
  allowOptimisticUpdates: boolean;
}>;

export type SynchronizationPatch = Readonly<{
  id: string;
  sessionId: string;
  entityKey: string;
  proposedState: Partial<SharedWorkflowState>;
  submittedAt: string;
  optimistic: boolean;
  replayKey: string;
}>;

export type SynchronizationResult = Readonly<{
  snapshot: SharedOperationalSnapshot;
  signals: CollaborationSignal[];
  appliedPatches: SynchronizationPatch[];
  skippedReplayKeys: string[];
  conflictsResolved: number;
  synchronizedAt: string;
}>;

export type CollaborativeRuntimeInput = Readonly<{
  dataset: EventSystemDataset;
  runtime?: RuntimeBootstrapResult;
  sessions?: OperationalSession[];
  patches?: SynchronizationPatch[];
  now?: Date;
}>;
