import { buildOperationalEvents } from "@/features/event-system/events/operationalEvents";
import { buildEventTimeline } from "@/features/event-system/events/eventTimeline";
import { dedupeQueuedEvents, queueOperationalEvents } from "@/features/event-system/pipeline/eventBus";
import { routeNotifications } from "@/features/event-system/notifications/notificationRouter";
import { evaluateRealtimeSignals } from "@/features/event-system/realtime/realtimeSignals";
import type {
  EventPipelineResult,
  EventProcessingRecord,
  EventQueueItem,
  EventSystemDataset,
} from "@/features/event-system/types/eventTypes";

const processQueue = (
  queue: EventQueueItem[],
  now: Date,
  previouslyProcessedReplayKeys: string[] = [],
): { processed: EventQueueItem[]; records: EventProcessingRecord[] } => {
  const replayed = new Set(previouslyProcessedReplayKeys);
  const processed: EventQueueItem[] = [];
  const records: EventProcessingRecord[] = [];

  queue.forEach((item) => {
    const status = replayed.has(item.event.replayKey) ? "replayed" : "processed";
    if (status === "processed") {
      processed.push(item);
      replayed.add(item.event.replayKey);
    }
    records.push({
      eventId: item.event.id,
      status,
      priority: item.priority,
      processedAt: now.toISOString(),
      message: status === "replayed" ? "Replay-safe duplicate skipped." : "Advisory event processed.",
    });
  });

  return { processed, records };
};

export const processEventPipeline = (
  dataset: EventSystemDataset,
  options: { now?: Date; previouslyProcessedReplayKeys?: string[] } = {},
): EventPipelineResult => {
  const now = options.now || dataset.now || new Date();
  const events = buildOperationalEvents({ ...dataset, now });
  const queued = queueOperationalEvents(events, now);
  const deduped = dedupeQueuedEvents(queued);
  const { processed, records } = processQueue(deduped, now, options.previouslyProcessedReplayKeys);
  const processedEvents = processed.map((item) => item.event);

  return {
    queued: deduped,
    processedEvents,
    processingRecords: records,
    notifications: routeNotifications(processedEvents),
    realtimeSignals: evaluateRealtimeSignals(processedEvents, now),
    timeline: buildEventTimeline(processedEvents),
  };
};
