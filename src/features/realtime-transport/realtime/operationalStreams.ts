import type { OperationalStream, TransportChannelName, TransportMessage } from "@/features/realtime-transport/types/transportTypes";

const severityRank = { low: 1, medium: 2, high: 3, critical: 4 } as const;

const severityFromMessage = (message: TransportMessage): OperationalStream["severity"] => {
  if (message.payload.kind === "event") return message.payload.event.severity;
  if (message.payload.kind === "workflow_patch" && message.payload.patch.proposedState.severity) {
    return message.payload.patch.proposedState.severity;
  }
  return "low";
};

const labelForChannel: Record<TransportChannelName, string> = {
  operational_events: "Live operational alerts",
  workflow_updates: "Workflow transition stream",
  escalations: "Realtime escalation stream",
  notifications: "Notification propagation",
  presence: "Live presence",
  timeline: "Timeline updates",
};

export const buildOperationalStreams = (
  messages: TransportMessage[],
  now: Date = new Date(),
): OperationalStream[] => {
  const byChannel = messages.reduce<Map<TransportChannelName, TransportMessage[]>>((map, message) => {
    map.set(message.channel, [...(map.get(message.channel) || []), message]);
    return map;
  }, new Map());

  return [...byChannel.entries()].map(([channel, channelMessages]) => {
    const severity = channelMessages
      .map(severityFromMessage)
      .sort((first, second) => severityRank[second] - severityRank[first])[0] || "low";
    return Object.freeze({
      id: `stream:${channel}`,
      channel,
      severity,
      label: labelForChannel[channel],
      messages: channelMessages,
      updatedAt: now.toISOString(),
    });
  }).sort((first, second) =>
    severityRank[second.severity] - severityRank[first.severity] ||
    first.channel.localeCompare(second.channel),
  );
};
