import type {
  DistributedSnapshot,
  ReplicationConflict,
  RuntimeConsistencyReport,
  RuntimeReplica,
} from "@/features/distributed-runtime/types/distributedTypes";

const STALE_REPLICA_SECONDS = 120;

const conflict = (input: Omit<ReplicationConflict, "id">): ReplicationConflict => Object.freeze({
  id: `consistency:${input.type}:${input.replicaId || "global"}:${input.replayKey || "none"}`,
  ...input,
});

export const markStaleReplicas = (
  replicas: RuntimeReplica[],
  now: Date = new Date(),
): RuntimeReplica[] =>
  replicas.map((replica) => {
    const ageSeconds = Math.floor((now.getTime() - new Date(replica.lastSeenAt).getTime()) / 1_000);
    if (ageSeconds <= STALE_REPLICA_SECONDS) return replica;
    return Object.freeze({
      ...replica,
      status: ageSeconds > STALE_REPLICA_SECONDS * 2 ? "isolated" : "stale",
    });
  });

export const verifyRuntimeConsistency = (
  snapshot: DistributedSnapshot,
  priorConflicts: ReplicationConflict[] = [],
  now: Date = new Date(),
): RuntimeConsistencyReport => {
  const replaySet = new Set<string>();
  const conflicts: ReplicationConflict[] = [...priorConflicts];

  snapshot.records.forEach((record) => {
    if (replaySet.has(record.replayKey)) {
      conflicts.push(conflict({
        type: "duplicate_replay",
        severity: "medium",
        replicaId: record.replicaId,
        replayKey: record.replayKey,
        message: "Duplicate replay key exists in distributed snapshot.",
      }));
    }
    replaySet.add(record.replayKey);
  });

  const replicas = markStaleReplicas(snapshot.replicas, now);
  const staleReplicas = replicas.filter((replica) => replica.status === "stale");
  const isolatedReplicas = replicas.filter((replica) => replica.status === "isolated");

  staleReplicas.forEach((replica) => {
    conflicts.push(conflict({
      type: "stale_replica",
      severity: "high",
      replicaId: replica.replicaId,
      message: "Replica heartbeat is stale and should be reconciled before accepting ownership changes.",
    }));
  });
  isolatedReplicas.forEach((replica) => {
    conflicts.push(conflict({
      type: "stale_replica",
      severity: "critical",
      replicaId: replica.replicaId,
      message: "Replica isolated due to extended heartbeat silence.",
    }));
  });

  const healthScore = Math.max(0, 100 - conflicts.reduce((sum, item) => {
    const penalty = item.severity === "critical" ? 30 : item.severity === "high" ? 18 : item.severity === "medium" ? 8 : 3;
    return sum + penalty;
  }, 0));

  return Object.freeze({
    valid: conflicts.length === 0,
    healthScore,
    conflicts,
    staleReplicas,
    isolatedReplicas,
    verifiedAt: now.toISOString(),
  });
};
