import { processEventPipeline } from "@/features/event-system/pipeline/eventPipeline";
import type { EventPipelineResult, EventSystemDataset } from "@/features/event-system/types/eventTypes";

export const createEventSystemSnapshot = (
  dataset: EventSystemDataset,
  now?: Date,
): EventPipelineResult => processEventPipeline(dataset, { now });
