import type {
  RealtimeTransportClient,
  TransportMessage,
  TransportRecoveryState,
} from "@/features/realtime-transport/types/transportTypes";

export const recoverTransportState = async (
  client: RealtimeTransportClient,
  options: { replayKeys?: string[]; now?: Date } = {},
): Promise<TransportRecoveryState> => {
  const now = options.now || new Date();
  const replayed = new Set(options.replayKeys || []);
  const history = await client.history();
  const recoveredMessages: TransportMessage[] = [];
  const seen = new Set<string>();

  history.forEach((message) => {
    if (replayed.has(message.replayKey) || seen.has(message.replayKey)) return;
    seen.add(message.replayKey);
    recoveredMessages.push(message);
  });

  const health = await client.health(now);
  return Object.freeze({
    status: health.staleSessions > 0 ? "stale" : health.status,
    replayKeys: [...new Set([...history.map((message) => message.replayKey), ...replayed])].sort(),
    recoveredMessages,
    staleSessionsRemoved: health.heartbeat.filter((item) => item.status === "stale").map((item) => item.sessionId).sort(),
    hydratedAt: now.toISOString(),
  });
};
