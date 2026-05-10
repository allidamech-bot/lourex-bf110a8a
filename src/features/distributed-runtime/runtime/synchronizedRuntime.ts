import { buildRealtimeTransportRuntime } from "@/features/realtime-transport/services/realtimeTransportService";
import type { DistributedRuntimeInput, DistributedRuntimeResult } from "@/features/distributed-runtime/types/distributedTypes";
import type { DistributedRuntimeRepository } from "@/features/distributed-runtime/repositories/distributedOperationalStore";
import { LocalDistributedRuntimeRepository } from "@/features/distributed-runtime/repositories/distributedOperationalStore";
import { createRuntimeReplica } from "@/features/distributed-runtime/store/replicatedRuntimeState";
import { replicateOperationalMessages } from "@/features/distributed-runtime/replication/operationalReplication";
import { verifyRuntimeConsistency } from "@/features/distributed-runtime/state/runtimeConsistency";

export const createDistributedRuntimeRepository = (): DistributedRuntimeRepository => new LocalDistributedRuntimeRepository();

export const buildSynchronizedRuntime = async (
  input: DistributedRuntimeInput,
  repository: DistributedRuntimeRepository = createDistributedRuntimeRepository(),
): Promise<DistributedRuntimeResult> => {
  const now = input.now || new Date();
  const transport = input.transport || await buildRealtimeTransportRuntime({ dataset: input.dataset, now });
  const replicas = input.replicas && input.replicas.length
    ? input.replicas
    : [
        createRuntimeReplica({
          replicaId: "cloud-primary",
          nodeName: "Primary Runtime",
          lastSeenAt: now.toISOString(),
        }),
      ];
  const replication = replicateOperationalMessages(transport, replicas, now);
  await repository.saveRecords(replication.records);
  await repository.saveSnapshot(replication.snapshot);
  const snapshot = await repository.latestSnapshot() || replication.snapshot;
  const consistency = verifyRuntimeConsistency(snapshot, replication.conflicts, now);

  return Object.freeze({
    provider: repository.provider,
    transport,
    snapshot,
    consistency,
    replication,
    hydratedAt: now.toISOString(),
  });
};

export const recoverDistributedRuntime = async (
  repository: DistributedRuntimeRepository,
  now: Date = new Date(),
) => {
  const snapshot = await repository.latestSnapshot();
  if (!snapshot) return null;
  return Object.freeze({
    snapshot,
    consistency: verifyRuntimeConsistency(snapshot, [], now),
    restoredRecords: await repository.listRecords(),
    restoredReplicas: await repository.listReplicas(),
    restoredAt: now.toISOString(),
  });
};
