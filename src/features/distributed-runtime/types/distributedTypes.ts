import type { EventSystemDataset, EventTimelineItem, OperationalEventSeverity } from "@/features/event-system/types/eventTypes";
import type { RealtimeTransportRuntime, TransportMessage } from "@/features/realtime-transport/types/transportTypes";
import type { SharedOperationalSnapshot, SharedWorkflowState } from "@/features/realtime-collaboration/types/collaborationTypes";

export type DistributedLanguage = "ar" | "en";

export type DistributedRepositoryProvider = "local" | "supabase_ready" | "future_distributed_cloud";

export type ReplicaStatus = "active" | "stale" | "isolated" | "recovering";

export type ReplicationConflictType = "duplicate_replay" | "stale_replica" | "sequence_gap" | "state_divergence";

export type RuntimeReplica = Readonly<{
  replicaId: string;
  nodeName: string;
  status: ReplicaStatus;
  lastSeenAt: string;
  version: number;
  replayKeys: string[];
  messageCount: number;
}>;

export type ReplicatedEventRecord = Readonly<{
  id: string;
  replicaId: string;
  message: TransportMessage;
  replayKey: string;
  sequence: number;
  replicatedAt: string;
  immutable: true;
}>;

export type DistributedSnapshot = Readonly<{
  id: string;
  createdAt: string;
  replicas: RuntimeReplica[];
  records: ReplicatedEventRecord[];
  workflows: SharedWorkflowState[];
  timeline: EventTimelineItem[];
  replayKeys: string[];
  version: number;
  immutable: true;
}>;

export type ReplicationConflict = Readonly<{
  id: string;
  type: ReplicationConflictType;
  severity: OperationalEventSeverity;
  replicaId?: string;
  replayKey?: string;
  message: string;
}>;

export type RuntimeConsistencyReport = Readonly<{
  valid: boolean;
  healthScore: number;
  conflicts: ReplicationConflict[];
  staleReplicas: RuntimeReplica[];
  isolatedReplicas: RuntimeReplica[];
  verifiedAt: string;
}>;

export type ReplicationResult = Readonly<{
  records: ReplicatedEventRecord[];
  snapshot: DistributedSnapshot;
  conflicts: ReplicationConflict[];
  replicatedReplayKeys: string[];
}>;

export type DistributedRuntimeResult = Readonly<{
  provider: DistributedRepositoryProvider;
  transport: RealtimeTransportRuntime;
  snapshot: DistributedSnapshot;
  consistency: RuntimeConsistencyReport;
  replication: ReplicationResult;
  hydratedAt: string;
}>;

export type DistributedRuntimeInput = Readonly<{
  dataset: EventSystemDataset;
  transport?: RealtimeTransportRuntime;
  replicas?: RuntimeReplica[];
  now?: Date;
}>;

export type DistributedRuntimeQuery = Readonly<{
  replicaId?: string;
  replayKey?: string;
  limit?: number;
}>;
