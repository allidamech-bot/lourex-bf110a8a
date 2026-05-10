import type { EventTimelineItem, OperationalEvent } from "@/features/event-system/types/eventTypes";

export const buildEventTimeline = (events: OperationalEvent[]): EventTimelineItem[] =>
  events.map((event) => ({
    id: `timeline:${event.id}`,
    eventId: event.id,
    title: event.title,
    description: event.summary,
    severity: event.severity,
    sourceModule: event.sourceModule,
    occurredAt: event.occurredAt,
    entityLabel: event.entity.label,
  })).sort((first, second) =>
    new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime() ||
    first.id.localeCompare(second.id),
  );
