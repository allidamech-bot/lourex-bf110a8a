import { reconcileSharedState } from "@/features/realtime-collaboration/sync/stateSynchronization";
import { defaultSynchronizationPolicies } from "@/features/realtime-collaboration/sync/synchronizationPolicies";
import type {
  SharedOperationalSnapshot,
  SynchronizationPatch,
  SynchronizationResult,
} from "@/features/realtime-collaboration/types/collaborationTypes";
import type { TransportMessage } from "@/features/realtime-transport/types/transportTypes";

export const extractSynchronizationPatches = (messages: TransportMessage[]): SynchronizationPatch[] =>
  messages
    .filter((message) => message.payload.kind === "workflow_patch")
    .map((message) => message.payload.kind === "workflow_patch" ? message.payload.patch : null)
    .filter((patch): patch is SynchronizationPatch => Boolean(patch));

export const synchronizeFromTransport = (
  snapshot: SharedOperationalSnapshot,
  messages: TransportMessage[],
  now: Date = new Date(),
  previousReplayKeys: string[] = [],
): SynchronizationResult =>
  reconcileSharedState(
    snapshot,
    extractSynchronizationPatches(messages),
    defaultSynchronizationPolicies,
    now,
    previousReplayKeys,
  );
