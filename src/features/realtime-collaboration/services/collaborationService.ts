import { bootstrapRuntimeInfrastructure } from "@/features/runtime-infra/services/runtimeInfrastructureService";
import { buildCollaborativeRuntime } from "@/features/realtime-collaboration/state/collaborativeRuntime";
import { createOperationalSession } from "@/features/realtime-collaboration/presence/operationalSessions";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";

export const createLocalCollaborationSnapshot = async (
  dataset: EventSystemDataset,
  now: Date = new Date(),
) => {
  const runtime = await bootstrapRuntimeInfrastructure(dataset, undefined, { now });
  const sessions = [
    createOperationalSession({
      sessionId: "local-operations",
      operatorId: "ops-local",
      operatorName: "Operations",
      role: "operations",
      now,
      activity: "reviewing",
      activeEntity: runtime.recovery.restoredEvents[0]
        ? {
            entityType: "workflow",
            entityId: runtime.recovery.restoredEvents[0].event.entity.entityId,
            label: runtime.recovery.restoredEvents[0].event.entity.label,
          }
        : undefined,
    }),
  ];

  return buildCollaborativeRuntime({ dataset, runtime, sessions, now });
};
