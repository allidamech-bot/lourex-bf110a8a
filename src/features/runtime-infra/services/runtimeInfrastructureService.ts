import { processEventPipeline } from "@/features/event-system/pipeline/eventPipeline";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";
import { createNotificationQueue } from "@/features/runtime-infra/notifications/notificationQueue";
import { deliverNotificationQueue, type DeliverySimulation } from "@/features/runtime-infra/notifications/notificationDelivery";
import type { EventRepository } from "@/features/runtime-infra/repositories/eventRepository";
import { InMemoryEventRepository, LocalStorageEventRepository } from "@/features/runtime-infra/repositories/eventRepository";
import { persistPipelineEvents } from "@/features/runtime-infra/store/eventPersistence";
import { restoreRuntimeState } from "@/features/runtime-infra/services/runtimeRecovery";
import type { RuntimeBootstrapResult } from "@/features/runtime-infra/types/runtimeTypes";

export const createRuntimeRepository = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    return new LocalStorageEventRepository();
  }
  return new InMemoryEventRepository();
};

export const bootstrapRuntimeInfrastructure = async (
  dataset: EventSystemDataset,
  repository: EventRepository = createRuntimeRepository(),
  options: { now?: Date; deliverySimulation?: DeliverySimulation } = {},
): Promise<RuntimeBootstrapResult> => {
  const replayKeys = await repository.getReplayKeys();
  const pipeline = processEventPipeline(dataset, {
    now: options.now,
    previouslyProcessedReplayKeys: replayKeys,
  });
  const persistedEvents = await persistPipelineEvents(repository, pipeline, (options.now || new Date()).toISOString());
  const deliveryQueue = createNotificationQueue(
    pipeline.notifications,
    pipeline.processedEvents,
    (options.now || new Date()).toISOString(),
  );
  const deliveryResult = deliverNotificationQueue(deliveryQueue, {
    ...options.deliverySimulation,
    now: options.now,
  });
  const recovery = await restoreRuntimeState(repository, (options.now || new Date()).toISOString());

  return Object.freeze({
    pipeline,
    persistedEvents,
    deliveryQueue: deliveryResult.queue,
    deliveryHistory: deliveryResult.history,
    recovery,
  });
};
