import { buildEventTimeline } from "@/features/event-system/events/eventTimeline";
import type { DistributedSnapshot, ReplicatedEventRecord, RuntimeReplica } from "@/features/distributed-runtime/types/distributedTypes";
import type { RealtimeTransportRuntime } from "@/features/realtime-transport/types/transportTypes";

export const buildDistributedSnapshot = (input: {
  records: ReplicatedEventRecord[];
  replicas: RuntimeReplica[];
  transport: RealtimeTransportRuntime;
  now?: Date;
}): DistributedSnapshot => {
  const now = input.now || new Date();
  const events = input.records
    .map((record) => record.message.payload.kind === "event" ? record.message.payload.event : null)
    .filter((event): event is NonNullable<typeof event> => Boolean(event));

  return Object.freeze({
    id: `distributed:${input.records.length}:${now.toISOString()}`,
    createdAt: now.toISOString(),
    replicas: input.replicas,
    records: input.records,
    workflows: input.transport.synchronization.snapshot.workflows,
    timeline: buildEventTimeline(events),
    replayKeys: [...new Set(input.records.map((record) => record.replayKey))].sort(),
    version: Math.max(1, ...input.replicas.map((replica) => replica.version)),
    immutable: true,
  });
};

export const hydrateDistributedSnapshot = (
  snapshot: DistributedSnapshot,
  now: Date = new Date(),
): DistributedSnapshot => Object.freeze({
  ...snapshot,
  id: `distributed:${snapshot.records.length}:${now.toISOString()}`,
  createdAt: now.toISOString(),
  replayKeys: [...new Set(snapshot.replayKeys)].sort(),
  immutable: true,
});
