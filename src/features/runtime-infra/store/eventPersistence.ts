import type { EventPipelineResult } from "@/features/event-system/types/eventTypes";
import type { EventRepository } from "@/features/runtime-infra/repositories/eventRepository";
import { createPersistentEventRecords } from "@/features/runtime-infra/store/persistentEventStore";

export const persistPipelineEvents = async (
  repository: EventRepository,
  pipeline: EventPipelineResult,
  persistedAt: string = new Date().toISOString(),
) => {
  const records = createPersistentEventRecords(pipeline.processedEvents, persistedAt);
  return repository.saveMany(records);
};
