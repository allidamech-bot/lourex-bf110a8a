import type { TransportChannelName } from "@/features/realtime-transport/types/transportTypes";

export const transportChannels: TransportChannelName[] = [
  "operational_events",
  "workflow_updates",
  "escalations",
  "notifications",
  "presence",
  "timeline",
];

export const channelForMessageType = {
  event: "operational_events",
  workflow_patch: "workflow_updates",
  escalation: "escalations",
  notification: "notifications",
  presence_heartbeat: "presence",
  timeline_update: "timeline",
  recovery_snapshot: "workflow_updates",
} as const;
