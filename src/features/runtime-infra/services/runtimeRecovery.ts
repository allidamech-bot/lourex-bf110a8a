import { buildEventTimeline } from "@/features/event-system/events/eventTimeline";
import type { EventRepository } from "@/features/runtime-infra/repositories/eventRepository";
import type { RuntimeRecoveryState, RuntimeSnapshot } from "@/features/runtime-infra/types/runtimeTypes";

export const restoreRuntimeState = async (
  repository: EventRepository,
  restoredAt: string = new Date().toISOString(),
): Promise<RuntimeRecoveryState> => {
  const restoredEvents = await repository.list();
  const snapshot = await repository.snapshot();
  const replayKeys = await repository.getReplayKeys();
  const timeline = buildEventTimeline(restoredEvents.map((record) => record.event));

  return Object.freeze({
    restoredEvents,
    snapshot,
    replayKeys,
    timeline,
    restoredAt,
  });
};

export const buildRuntimeSnapshot = async (
  repository: EventRepository,
  deliveryQueue: RuntimeSnapshot["deliveryQueue"] = [],
  deliveryHistory: RuntimeSnapshot["deliveryHistory"] = [],
): Promise<RuntimeSnapshot> => {
  const eventSnapshot = await repository.snapshot();
  const timeline = buildEventTimeline((await repository.list()).map((record) => record.event));

  return Object.freeze({
    eventSnapshot,
    deliveryQueue,
    deliveryHistory,
    timeline,
  });
};
