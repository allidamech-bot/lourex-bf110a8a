import type {
  ReplicatedEventRecord,
  ReplicationConflict,
  ReplicationResult,
  RuntimeReplica,
} from "@/features/distributed-runtime/types/distributedTypes";
import { createReplicatedEventRecords } from "@/features/distributed-runtime/store/replicatedRuntimeState";
import { buildDistributedSnapshot } from "@/features/distributed-runtime/state/distributedSnapshots";
import type { RealtimeTransportRuntime } from "@/features/realtime-transport/types/transportTypes";

const conflict = (input: Omit<ReplicationConflict, "id">): ReplicationConflict => Object.freeze({
  id: `conflict:${input.type}:${input.replicaId || "global"}:${input.replayKey || "none"}`,
  ...input,
});

export const replicateOperationalMessages = (
  transport: RealtimeTransportRuntime,
  replicas: RuntimeReplica[],
  now: Date = new Date(),
): ReplicationResult => {
  const primaryReplica = replicas[0] || Object.freeze({
    replicaId: "local-primary",
    nodeName: "Local Runtime",
    status: "active" as const,
    lastSeenAt: now.toISOString(),
    version: 1,
    replayKeys: [],
    messageCount: 0,
  });
  const records = createReplicatedEventRecords(primaryReplica, transport.messages, now.toISOString());
  const seen = new Set<string>();
  const conflicts: ReplicationConflict[] = [];
  const dedupedRecords: ReplicatedEventRecord[] = [];

  records
    .slice()
    .sort((first, second) => first.sequence - second.sequence || first.replayKey.localeCompare(second.replayKey))
    .forEach((record, index) => {
      if (seen.has(record.replayKey)) {
        conflicts.push(conflict({
          type: "duplicate_replay",
          severity: "medium",
          replicaId: record.replicaId,
          replayKey: record.replayKey,
          message: "Duplicate replay key skipped during replication.",
        }));
        return;
      }
      if (record.sequence > index + 1 + conflicts.filter((item) => item.type === "duplicate_replay").length) {
        conflicts.push(conflict({
          type: "sequence_gap",
          severity: "high",
          replicaId: record.replicaId,
          replayKey: record.replayKey,
          message: "Transport sequence gap detected during replication.",
        }));
      }
      seen.add(record.replayKey);
      dedupedRecords.push(record);
    });

  const hydratedReplica = Object.freeze({
    ...primaryReplica,
    lastSeenAt: now.toISOString(),
    replayKeys: [...seen].sort(),
    messageCount: dedupedRecords.length,
    version: primaryReplica.version + 1,
  });
  const snapshot = buildDistributedSnapshot({
    records: dedupedRecords,
    replicas: [hydratedReplica, ...replicas.slice(1)],
    transport,
    now,
  });

  return Object.freeze({
    records: dedupedRecords,
    snapshot,
    conflicts,
    replicatedReplayKeys: [...seen].sort(),
  });
};
