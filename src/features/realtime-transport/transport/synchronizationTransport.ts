import { createTransportMessage } from "@/features/realtime-transport/transport/transportClient";
import type {
  RealtimeTransportClient,
  TransportMessage,
} from "@/features/realtime-transport/types/transportTypes";
import type {
  OperationalSession,
  SharedOperationalSnapshot,
  SynchronizationPatch,
} from "@/features/realtime-collaboration/types/collaborationTypes";
import type { OperationalEvent } from "@/features/event-system/types/eventTypes";

export const messageFromPatch = (
  patch: SynchronizationPatch,
  sequence: number,
): TransportMessage => createTransportMessage({
  type: "workflow_patch",
  channel: "workflow_updates",
  sequence,
  replayKey: patch.replayKey,
  timestamp: patch.submittedAt,
  sessionId: patch.sessionId,
  payload: { kind: "workflow_patch", patch },
});

export const messageFromSession = (
  session: OperationalSession,
  sequence: number,
): TransportMessage => createTransportMessage({
  type: "presence_heartbeat",
  channel: "presence",
  sequence,
  replayKey: `presence:${session.sessionId}:${session.lastHeartbeatAt}`,
  timestamp: session.lastHeartbeatAt,
  sessionId: session.sessionId,
  payload: { kind: "presence_heartbeat", session },
});

export const messageFromEvent = (
  event: OperationalEvent,
  sequence: number,
): TransportMessage => createTransportMessage({
  type: event.type === "escalation_trigger" || event.type === "dispute_escalation" ? "escalation" : "event",
  channel: event.type === "escalation_trigger" || event.type === "dispute_escalation" ? "escalations" : "operational_events",
  sequence,
  replayKey: event.replayKey,
  timestamp: event.occurredAt,
  payload: { kind: "event", event },
});

export const messageFromSnapshot = (
  snapshot: SharedOperationalSnapshot,
  sequence: number,
): TransportMessage => createTransportMessage({
  type: "recovery_snapshot",
  channel: "workflow_updates",
  sequence,
  replayKey: `snapshot:${snapshot.id}`,
  timestamp: snapshot.createdAt,
  payload: { kind: "snapshot", snapshot },
});

export const publishTransportMessages = async (
  client: RealtimeTransportClient,
  messages: TransportMessage[],
) => {
  const published: TransportMessage[] = [];
  for (const message of messages) {
    published.push(await client.publish(message));
  }
  return published;
};
