import { bootstrapRuntimeInfrastructure } from "@/features/runtime-infra/services/runtimeInfrastructureService";
import { createSharedOperationalSnapshot } from "@/features/realtime-collaboration/state/sharedOperationalState";
import { reconcileSharedState } from "@/features/realtime-collaboration/sync/stateSynchronization";
import { mergeSynchronizationPolicies } from "@/features/realtime-collaboration/sync/synchronizationPolicies";
import type {
  CollaborativeRuntimeInput,
  SynchronizationPolicyConfig,
  SynchronizationResult,
} from "@/features/realtime-collaboration/types/collaborationTypes";

export const buildCollaborativeRuntime = async (
  input: CollaborativeRuntimeInput,
  policyOverrides?: Partial<SynchronizationPolicyConfig>,
): Promise<SynchronizationResult> => {
  const now = input.now || new Date();
  const policies = mergeSynchronizationPolicies(policyOverrides);
  const runtime = input.runtime || await bootstrapRuntimeInfrastructure(input.dataset, undefined, { now });
  const snapshot = createSharedOperationalSnapshot({
    runtime,
    sessions: input.sessions || [],
    policies,
    now,
  });

  return reconcileSharedState(snapshot, input.patches || [], policies, now);
};
