import type { RuntimeBootstrapResult } from "@/features/runtime-infra/types/runtimeTypes";
import type {
  OperationalSession,
  SharedOperationalSnapshot,
  SharedWorkflowState,
  SynchronizationPolicyConfig,
} from "@/features/realtime-collaboration/types/collaborationTypes";
import { buildOperationalPresence } from "@/features/realtime-collaboration/presence/operationalPresence";

const severityRank = { low: 1, medium: 2, high: 3, critical: 4 } as const;

const stateStatusFromSeverity = (severity: SharedWorkflowState["severity"]): SharedWorkflowState["status"] =>
  severity === "critical" || severity === "high" ? "in_review" : "open";

export const deriveSharedWorkflowStates = (
  runtime: RuntimeBootstrapResult,
): SharedWorkflowState[] => {
  const byEntity = new Map<string, SharedWorkflowState>();

  runtime.recovery.restoredEvents.forEach((record) => {
    const event = record.event;
    const entityKey = `${event.entity.entityType}:${event.entity.entityId}`;
    const current = byEntity.get(entityKey);
    const shouldReplace = !current ||
      severityRank[event.severity] > severityRank[current.severity] ||
      new Date(event.occurredAt).getTime() > new Date(current.updatedAt).getTime();

    if (!shouldReplace) return;

    byEntity.set(entityKey, Object.freeze({
      entityKey,
      entityType: event.entity.entityType === "financial_entry" ? "finance" : event.entity.entityType,
      entityId: event.entity.entityId,
      label: event.entity.label,
      severity: event.severity,
      status: stateStatusFromSeverity(event.severity),
      updatedAt: event.occurredAt,
      version: current ? current.version + 1 : 1,
      replayKey: event.replayKey,
    } as SharedWorkflowState));
  });

  return [...byEntity.values()].sort((first, second) =>
    severityRank[second.severity] - severityRank[first.severity] ||
    new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime() ||
    first.entityKey.localeCompare(second.entityKey),
  );
};

export const createSharedOperationalSnapshot = (
  input: {
    runtime: RuntimeBootstrapResult;
    sessions: OperationalSession[];
    policies: SynchronizationPolicyConfig;
    now?: Date;
  },
): SharedOperationalSnapshot => {
  const now = input.now || new Date();
  const workflows = deriveSharedWorkflowStates(input.runtime);
  const replayKeys = [...new Set([
    ...input.runtime.recovery.replayKeys,
    ...workflows.map((workflow) => workflow.replayKey),
  ])].sort();

  return Object.freeze({
    id: `shared:${replayKeys.length}:${now.toISOString()}`,
    createdAt: now.toISOString(),
    sessions: input.sessions,
    presence: buildOperationalPresence(input.sessions, input.policies, now),
    workflows,
    notifications: input.runtime.deliveryQueue,
    timeline: input.runtime.recovery.timeline,
    replayKeys,
    immutable: true,
  });
};
