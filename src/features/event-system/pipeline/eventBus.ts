import type { EventQueueItem, OperationalEvent, OperationalEventSeverity } from "@/features/event-system/types/eventTypes";

const severityPriority: Record<OperationalEventSeverity, number> = {
  critical: 400,
  high: 300,
  medium: 200,
  low: 100,
};

export const getEventPriority = (event: OperationalEvent) =>
  severityPriority[event.severity] +
  (typeof event.metadata.financialExposure === "number" ? Math.min(100, Math.round(event.metadata.financialExposure / 1_000)) : 0);

export const queueOperationalEvents = (
  events: OperationalEvent[],
  now: Date = new Date(),
): EventQueueItem[] =>
  events.map((event) => ({
    event,
    priority: getEventPriority(event),
    attempts: 0,
    queuedAt: now.toISOString(),
  })).sort((first, second) =>
    second.priority - first.priority ||
    new Date(second.event.occurredAt).getTime() - new Date(first.event.occurredAt).getTime() ||
    first.event.id.localeCompare(second.event.id),
  );

export const dedupeQueuedEvents = (queue: EventQueueItem[]): EventQueueItem[] => {
  const seen = new Set<string>();
  const deduped: EventQueueItem[] = [];

  queue.forEach((item) => {
    if (seen.has(item.event.dedupeKey)) return;
    seen.add(item.event.dedupeKey);
    deduped.push(item);
  });

  return deduped;
};
