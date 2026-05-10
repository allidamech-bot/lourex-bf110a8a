import { buildEventTimeline } from "@/features/event-system/events/eventTimeline";
import type { EventTimelineItem } from "@/features/event-system/types/eventTypes";
import type { EventRepository } from "@/features/runtime-infra/repositories/eventRepository";
import type { EventHistoryFilter } from "@/features/runtime-infra/types/runtimeTypes";

export const queryOperationalHistory = async (
  repository: EventRepository,
  filter?: EventHistoryFilter,
) => repository.list(filter);

export const reconstructOperationalTimeline = async (
  repository: EventRepository,
  filter?: EventHistoryFilter,
): Promise<EventTimelineItem[]> => {
  const records = await repository.list(filter);
  return buildEventTimeline(records.map((record) => record.event));
};
