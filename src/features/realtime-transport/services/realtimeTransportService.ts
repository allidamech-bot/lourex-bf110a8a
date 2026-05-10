import { bootstrapRuntimeInfrastructure } from "@/features/runtime-infra/services/runtimeInfrastructureService";
import { createSharedOperationalSnapshot } from "@/features/realtime-collaboration/state/sharedOperationalState";
import { createOperationalSession } from "@/features/realtime-collaboration/presence/operationalSessions";
import { defaultSynchronizationPolicies } from "@/features/realtime-collaboration/sync/synchronizationPolicies";
import { InMemoryTransportClient } from "@/features/realtime-transport/transport/transportClient";
import {
  messageFromEvent,
  messageFromPatch,
  messageFromSession,
  messageFromSnapshot,
  publishTransportMessages,
} from "@/features/realtime-transport/transport/synchronizationTransport";
import { recoverTransportState } from "@/features/realtime-transport/transport/transportRecovery";
import { buildOperationalStreams } from "@/features/realtime-transport/realtime/operationalStreams";
import { synchronizeFromTransport } from "@/features/realtime-transport/sync/realtimeSynchronization";
import { updateLivePresence } from "@/features/realtime-transport/presence/livePresence";
import { transportChannels } from "@/features/realtime-transport/channels/transportChannels";
import type {
  RealtimeTransportClient,
  RealtimeTransportInput,
  RealtimeTransportRuntime,
  TransportMessage,
} from "@/features/realtime-transport/types/transportTypes";

export const createRealtimeTransportClient = (): RealtimeTransportClient => new InMemoryTransportClient();

export const buildRealtimeTransportRuntime = async (
  input: RealtimeTransportInput,
  client: RealtimeTransportClient = createRealtimeTransportClient(),
): Promise<RealtimeTransportRuntime> => {
  const now = input.now || new Date();
  await client.connect(transportChannels);
  const runtime = input.runtime || await bootstrapRuntimeInfrastructure(input.dataset, undefined, { now });
  const sessions = input.sessions && input.sessions.length
    ? input.sessions
    : [
        createOperationalSession({
          sessionId: "transport-local",
          operatorId: "local-operator",
          operatorName: "Operations",
          role: "operations",
          now,
          activity: "reviewing",
        }),
      ];
  await updateLivePresence(client, sessions, now);
  const snapshot = createSharedOperationalSnapshot({
    runtime,
    sessions,
    policies: defaultSynchronizationPolicies,
    now,
  });

  let sequence = 1;
  const messages: TransportMessage[] = [
    ...runtime.pipeline.processedEvents.slice(0, 12).map((event) => messageFromEvent(event, sequence++)),
    ...sessions.map((session) => messageFromSession(session, sequence++)),
    ...((input.patches || []).map((patch) => messageFromPatch(patch, sequence++))),
    messageFromSnapshot(snapshot, sequence++),
  ];

  await publishTransportMessages(client, messages);
  const history = await client.history();
  const synchronization = synchronizeFromTransport(snapshot, history, now);
  const recovery = await recoverTransportState(client, { now, replayKeys: synchronization.snapshot.replayKeys });
  const health = await client.health(now);
  const streams = buildOperationalStreams(history, now);

  return Object.freeze({
    provider: client.provider,
    messages: history,
    health,
    streams,
    synchronization,
    recovery,
  });
};
