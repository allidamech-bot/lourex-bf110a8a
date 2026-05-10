import type { OperationalEvent } from "@/features/event-system/types/eventTypes";
import type { PersistentEventRecord } from "@/features/runtime-infra/types/runtimeTypes";

export const createPersistentEventRecord = (
  event: OperationalEvent,
  persistedAt: string = new Date().toISOString(),
): PersistentEventRecord =>
  Object.freeze({
    id: `persistent:${event.replayKey}`,
    event,
    replayKey: event.replayKey,
    dedupeKey: event.dedupeKey,
    persistedAt,
    version: 1,
    immutable: true,
  });

export const createPersistentEventRecords = (
  events: OperationalEvent[],
  persistedAt: string = new Date().toISOString(),
): PersistentEventRecord[] => events.map((event) => createPersistentEventRecord(event, persistedAt));
