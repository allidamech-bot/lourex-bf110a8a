import type {
  RealtimeTransportClient,
  TransportChannelName,
  TransportConnectionStatus,
  TransportHealth,
  TransportHeartbeat,
  TransportMessage,
  TransportProvider,
  TransportSubscription,
} from "@/features/realtime-transport/types/transportTypes";

const STALE_HEARTBEAT_SECONDS = 90;

export const createTransportMessage = (
  input: Omit<TransportMessage, "id" | "immutable"> & { id?: string },
): TransportMessage => Object.freeze({
  ...input,
  id: input.id || `transport:${input.channel}:${input.replayKey}:${input.sequence}`,
  immutable: true,
});

const sortMessages = (messages: TransportMessage[]) =>
  [...messages].sort((first, second) =>
    first.sequence - second.sequence ||
    new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime() ||
    first.id.localeCompare(second.id),
  );

export class InMemoryTransportClient implements RealtimeTransportClient {
  readonly provider: TransportProvider = "memory";
  private status: TransportConnectionStatus = "disconnected";
  private channels = new Set<TransportChannelName>();
  private messages: TransportMessage[] = [];
  private handlers = new Map<TransportChannelName, Set<(message: TransportMessage) => void>>();
  private heartbeats = new Map<string, TransportHeartbeat>();

  async connect(channels: TransportChannelName[]) {
    this.status = "connected";
    channels.forEach((channel) => this.channels.add(channel));
    return this.health();
  }

  async disconnect() {
    this.status = "disconnected";
    return this.health();
  }

  async publish(message: TransportMessage) {
    if (!this.messages.some((item) => item.replayKey === message.replayKey)) {
      this.messages = sortMessages([...this.messages, message]);
      this.handlers.get(message.channel)?.forEach((handler) => handler(message));
    }
    return message;
  }

  subscribe(channel: TransportChannelName, handler: (message: TransportMessage) => void): TransportSubscription {
    const handlers = this.handlers.get(channel) || new Set<(message: TransportMessage) => void>();
    handlers.add(handler);
    this.handlers.set(channel, handlers);
    return Object.freeze({
      channel,
      unsubscribe: () => {
        handlers.delete(handler);
      },
    });
  }

  async history(channel?: TransportChannelName) {
    const messages = channel ? this.messages.filter((message) => message.channel === channel) : this.messages;
    return sortMessages(messages);
  }

  async heartbeat(session: { sessionId: string }, now: Date = new Date()) {
    const heartbeat = Object.freeze({
      sessionId: session.sessionId,
      lastSeenAt: now.toISOString(),
      status: this.status,
      missedBeats: 0,
    }) as TransportHeartbeat;
    this.heartbeats.set(session.sessionId, heartbeat);
    return heartbeat;
  }

  async health(now: Date = new Date()): Promise<TransportHealth> {
    const heartbeat = [...this.heartbeats.values()].map((item) => {
      const ageSeconds = Math.floor((now.getTime() - new Date(item.lastSeenAt).getTime()) / 1_000);
      return ageSeconds > STALE_HEARTBEAT_SECONDS
        ? Object.freeze({ ...item, status: "stale" as const, missedBeats: Math.max(1, Math.floor(ageSeconds / STALE_HEARTBEAT_SECONDS)) })
        : item;
    });
    return Object.freeze({
      provider: this.provider,
      status: this.status,
      connectedChannels: [...this.channels].sort(),
      lastMessageAt: this.messages[this.messages.length - 1]?.timestamp,
      heartbeat,
      queuedMessages: this.messages.length,
      staleSessions: heartbeat.filter((item) => item.status === "stale").length,
    });
  }
}

export class SupabaseRealtimeTransportAdapter extends InMemoryTransportClient {
  readonly provider: TransportProvider = "supabase_realtime";
}
