import type { SynchronizationPolicyConfig } from "@/features/realtime-collaboration/types/collaborationTypes";

export const defaultSynchronizationPolicies: SynchronizationPolicyConfig = Object.freeze({
  syncIntervalMs: 30_000,
  staleSessionSeconds: 90,
  ownershipTtlMinutes: 20,
  reconciliationPriority: "events_first",
  conflictResolution: "severity_priority",
  allowOptimisticUpdates: true,
});

export const mergeSynchronizationPolicies = (
  overrides?: Partial<SynchronizationPolicyConfig>,
): SynchronizationPolicyConfig => Object.freeze({
  ...defaultSynchronizationPolicies,
  ...(overrides || {}),
});
