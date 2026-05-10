import type { ReplicatedEventRecord, RuntimeReplica } from "@/features/distributed-runtime/types/distributedTypes";
import type { TransportMessage } from "@/features/realtime-transport/types/transportTypes";

export const createRuntimeReplica = (input: {
  replicaId: string;
  nodeName: string;
  lastSeenAt: string;
  replayKeys?: string[];
  messageCount?: number;
  version?: number;
}): RuntimeReplica => Object.freeze({
  replicaId: input.replicaId,
  nodeName: input.nodeName,
  status: "active",
  lastSeenAt: input.lastSeenAt,
  version: input.version || 1,
  replayKeys: [...(input.replayKeys || [])].sort(),
  messageCount: input.messageCount || 0,
});

export const createReplicatedEventRecords = (
  replica: RuntimeReplica,
  messages: TransportMessage[],
  replicatedAt: string = new Date().toISOString(),
): ReplicatedEventRecord[] =>
  messages.map((message) => Object.freeze({
    id: `replicated:${replica.replicaId}:${message.replayKey}`,
    replicaId: replica.replicaId,
    message,
    replayKey: message.replayKey,
    sequence: message.sequence,
    replicatedAt,
    immutable: true,
  }));
