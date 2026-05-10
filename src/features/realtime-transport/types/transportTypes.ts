import type { EventSystemDataset, OperationalEvent } from "@/features/event-system/types/eventTypes";
import type {
  CollaborationLanguage,
  OperationalSession,
  SharedOperationalSnapshot,
  SynchronizationPatch,
  SynchronizationResult,
} from "@/features/realtime-collaboration/types/collaborationTypes";
import type { RuntimeBootstrapResult } from "@/features/runtime-infra/types/runtimeTypes";

export type TransportLanguage = CollaborationLanguage;

export type TransportProvider = "memory" | "supabase_realtime" | "future_pubsub";

export type TransportChannelName =
  | "operational_events"
  | "workflow_updates"
  | "escalations"
  | "notifications"
  | "presence"
  | "timeline";

export type TransportConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting" | "stale";

export type TransportMessageType =
  | "event"
  | "workflow_patch"
  | "escalation"
  | "notification"
  | "presence_heartbeat"
  | "timeline_update"
  | "recovery_snapshot";

export type TransportPayload =
  | { kind: "event"; event: OperationalEvent }
  | { kind: "workflow_patch"; patch: SynchronizationPatch }
  | { kind: "presence_heartbeat"; session: OperationalSession }
  | { kind: "snapshot"; snapshot: SharedOperationalSnapshot }
  | { kind: "notification"; notificationId: string; eventId?: string }
  | { kind: "timeline_update"; eventId: string; replayKey: string };

export type TransportMessage = Readonly<{
  id: string;
  type: TransportMessageType;
  channel: TransportChannelName;
  sequence: number;
  replayKey: string;
  timestamp: string;
  sessionId?: string;
  payload: TransportPayload;
  immutable: true;
}>;

export type TransportHeartbeat = Readonly<{
  sessionId: string;
  lastSeenAt: string;
  status: TransportConnectionStatus;
  missedBeats: number;
}>;

export type TransportHealth = Readonly<{
  provider: TransportProvider;
  status: TransportConnectionStatus;
  connectedChannels: TransportChannelName[];
  lastMessageAt?: string;
  heartbeat: TransportHeartbeat[];
  queuedMessages: number;
  staleSessions: number;
}>;

export type TransportRecoveryState = Readonly<{
  status: TransportConnectionStatus;
  replayKeys: string[];
  recoveredMessages: TransportMessage[];
  staleSessionsRemoved: string[];
  hydratedAt: string;
}>;

export type OperationalStream = Readonly<{
  id: string;
  channel: TransportChannelName;
  severity: "low" | "medium" | "high" | "critical";
  label: string;
  messages: TransportMessage[];
  updatedAt: string;
}>;

export type RealtimeTransportRuntime = Readonly<{
  provider: TransportProvider;
  messages: TransportMessage[];
  health: TransportHealth;
  streams: OperationalStream[];
  synchronization: SynchronizationResult;
  recovery: TransportRecoveryState;
}>;

export type RealtimeTransportInput = Readonly<{
  dataset: EventSystemDataset;
  runtime?: RuntimeBootstrapResult;
  sessions?: OperationalSession[];
  patches?: SynchronizationPatch[];
  now?: Date;
}>;

export type TransportSubscription = Readonly<{
  channel: TransportChannelName;
  unsubscribe: () => void;
}>;

export interface RealtimeTransportClient {
  readonly provider: TransportProvider;
  connect(channels: TransportChannelName[]): Promise<TransportHealth>;
  disconnect(): Promise<TransportHealth>;
  publish(message: TransportMessage): Promise<TransportMessage>;
  subscribe(channel: TransportChannelName, handler: (message: TransportMessage) => void): TransportSubscription;
  history(channel?: TransportChannelName): Promise<TransportMessage[]>;
  heartbeat(session: OperationalSession, now?: Date): Promise<TransportHeartbeat>;
  health(now?: Date): Promise<TransportHealth>;
}
