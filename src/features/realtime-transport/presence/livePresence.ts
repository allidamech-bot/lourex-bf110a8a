import type { OperationalSession } from "@/features/realtime-collaboration/types/collaborationTypes";
import { buildOperationalPresence } from "@/features/realtime-collaboration/presence/operationalPresence";
import { defaultSynchronizationPolicies } from "@/features/realtime-collaboration/sync/synchronizationPolicies";
import type { RealtimeTransportClient } from "@/features/realtime-transport/types/transportTypes";

export const updateLivePresence = async (
  client: RealtimeTransportClient,
  sessions: OperationalSession[],
  now: Date = new Date(),
) => {
  for (const session of sessions) {
    await client.heartbeat(session, now);
  }
  return buildOperationalPresence(sessions, defaultSynchronizationPolicies, now);
};

export const cleanupStalePresence = async (
  client: RealtimeTransportClient,
  now: Date = new Date(),
) => {
  const health = await client.health(now);
  return health.heartbeat.filter((heartbeat) => heartbeat.status !== "stale");
};
