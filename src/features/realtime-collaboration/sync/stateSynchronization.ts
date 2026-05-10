import type {
  SharedOperationalSnapshot,
  SharedWorkflowState,
  SynchronizationPatch,
  SynchronizationPolicyConfig,
  SynchronizationResult,
} from "@/features/realtime-collaboration/types/collaborationTypes";
import { buildCollaborationSignals } from "@/features/realtime-collaboration/realtime/realtimeSignals";

const severityRank = { low: 1, medium: 2, high: 3, critical: 4 } as const;

const resolveConflict = (
  current: SharedWorkflowState,
  proposed: SharedWorkflowState,
  policies: SynchronizationPolicyConfig,
) => {
  if (policies.conflictResolution === "latest_timestamp") {
    return new Date(proposed.updatedAt).getTime() >= new Date(current.updatedAt).getTime() ? proposed : current;
  }
  if (policies.conflictResolution === "owner_priority") {
    return proposed.owner && !current.owner ? proposed : current;
  }
  return severityRank[proposed.severity] >= severityRank[current.severity] ? proposed : current;
};

export const reconcileSharedState = (
  snapshot: SharedOperationalSnapshot,
  patches: SynchronizationPatch[],
  policies: SynchronizationPolicyConfig,
  now: Date = new Date(),
  previousReplayKeys: string[] = [],
): SynchronizationResult => {
  const replayed = new Set([...snapshot.replayKeys, ...previousReplayKeys]);
  const stateByKey = new Map(snapshot.workflows.map((workflow) => [workflow.entityKey, workflow]));
  const appliedPatches: SynchronizationPatch[] = [];
  const skippedReplayKeys: string[] = [];
  let conflictsResolved = 0;

  patches
    .slice()
    .sort((first, second) => new Date(first.submittedAt).getTime() - new Date(second.submittedAt).getTime() || first.id.localeCompare(second.id))
    .forEach((patch) => {
      if (replayed.has(patch.replayKey)) {
        skippedReplayKeys.push(patch.replayKey);
        return;
      }

      const current = stateByKey.get(patch.entityKey);
      if (!current) {
        skippedReplayKeys.push(patch.replayKey);
        return;
      }

      const proposed = Object.freeze({
        ...current,
        ...patch.proposedState,
        entityKey: current.entityKey,
        entityType: current.entityType,
        entityId: current.entityId,
        label: patch.proposedState.label || current.label,
        updatedAt: patch.submittedAt,
        version: current.version + 1,
        replayKey: patch.replayKey,
      }) as SharedWorkflowState;

      const resolved = resolveConflict(current, proposed, policies);
      if (resolved !== current) {
        stateByKey.set(patch.entityKey, resolved);
        appliedPatches.push(patch);
        replayed.add(patch.replayKey);
      } else {
        conflictsResolved += 1;
        skippedReplayKeys.push(patch.replayKey);
      }
    });

  const reconciledSnapshot = Object.freeze({
    ...snapshot,
    id: `shared:${replayed.size}:${now.toISOString()}`,
    createdAt: now.toISOString(),
    workflows: [...stateByKey.values()].sort((first, second) =>
      severityRank[second.severity] - severityRank[first.severity] ||
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime() ||
      first.entityKey.localeCompare(second.entityKey),
    ),
    replayKeys: [...replayed].sort(),
  }) as SharedOperationalSnapshot;

  return Object.freeze({
    snapshot: reconciledSnapshot,
    signals: buildCollaborationSignals(reconciledSnapshot, now),
    appliedPatches,
    skippedReplayKeys,
    conflictsResolved,
    synchronizedAt: now.toISOString(),
  });
};

export const createSynchronizationPatch = (input: Omit<SynchronizationPatch, "id" | "replayKey">): SynchronizationPatch =>
  Object.freeze({
    ...input,
    id: `sync:${input.sessionId}:${input.entityKey}:${input.submittedAt}`,
    replayKey: `sync:${input.sessionId}:${input.entityKey}:${input.submittedAt}`,
  });
