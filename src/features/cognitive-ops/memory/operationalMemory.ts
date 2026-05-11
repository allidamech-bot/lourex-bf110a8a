import { compareSeverity, cognitiveReasoningPolicy, severityRank } from "@/features/cognitive-ops/reasoning/reasoningPolicies";
import type {
  MemoryRecallQuery,
  MemoryReconstruction,
  OperationalContextSnapshot,
  OperationalMemoryRecord,
} from "@/features/cognitive-ops/types/cognitiveTypes";
import type { WorkflowSeverity } from "@/features/workflow-intelligence/types/workflowTypes";

const withinRange = (value: string, from?: string, to?: string) => {
  const time = new Date(value).getTime();
  return (!from || time >= new Date(from).getTime()) && (!to || time <= new Date(to).getTime());
};

const buildRecord = (
  record: Omit<OperationalMemoryRecord, "immutable" | "tags"> & { tags?: string[] },
): OperationalMemoryRecord =>
  Object.freeze({
    ...record,
    tags: Object.freeze([...(record.tags || [])]) as string[],
    immutable: true,
  });

export const buildOperationalMemory = (context: OperationalContextSnapshot): OperationalMemoryRecord[] => {
  const workflowMemories = context.workflow.triggers.map((trigger) =>
    buildRecord({
      id: `mem-workflow-${trigger.id}`,
      kind: "workflow",
      entity: { entityType: trigger.entityType, entityId: trigger.entityId, label: trigger.entityLabel },
      occurredAt: trigger.detectedAt,
      recordedAt: context.generatedAt,
      severity: trigger.severity,
      title: trigger.type.replaceAll("_", " "),
      summary: trigger.reasons.join("; ") || trigger.suggestedFollowUp,
      source: "workflow_intelligence",
      tags: [trigger.type, "workflow"],
      replayKey: `memory:workflow:${trigger.id}:${trigger.detectedAt}`,
    }),
  );

  const eventMemories = context.events.processedEvents.map((event) =>
    buildRecord({
      id: `mem-event-${event.id}`,
      kind: "operational_event",
      entity: { entityType: event.entity.entityType, entityId: event.entity.entityId, label: event.entity.label },
      occurredAt: event.occurredAt,
      recordedAt: context.generatedAt,
      severity: event.severity,
      title: event.title,
      summary: event.summary,
      source: event.sourceModule,
      tags: [event.type, event.sourceModule],
      replayKey: event.replayKey,
    }),
  );

  const escalationMemories = context.workflow.escalations.map((escalation) =>
    buildRecord({
      id: `mem-escalation-${escalation.id}`,
      kind: "escalation",
      entity: { entityType: "workflow", entityId: escalation.triggerId, label: escalation.routeTo },
      occurredAt: context.generatedAt,
      recordedAt: context.generatedAt,
      severity: escalation.level,
      title: `Escalation routed to ${escalation.routeTo}`,
      summary: `Actions: ${escalation.actions.join(", ")}.`,
      source: "cognitive_escalation_memory",
      tags: escalation.reasonCodes,
      replayKey: `memory:escalation:${escalation.id}`,
    }),
  );

  const executionMemories = context.execution.audit.map((audit) =>
    buildRecord({
      id: `mem-execution-${audit.id}`,
      kind: audit.event === "queued" || audit.event === "approval_requested" ? "decision_history" : "execution_history",
      entity: { entityType: "execution", entityId: audit.actionId, label: audit.event },
      occurredAt: audit.occurredAt,
      recordedAt: context.generatedAt,
      severity: audit.event === "failed" || audit.event === "stale_isolated" ? "high" : "medium",
      title: audit.event.replaceAll("_", " "),
      summary: audit.message,
      source: "execution_runtime",
      tags: [audit.event],
      replayKey: audit.replayKey,
    }),
  );

  const recommendationMemories = context.workflow.decisions.map((decision) =>
    buildRecord({
      id: `mem-recommendation-${decision.id}`,
      kind: "recommendation",
      entity: { entityType: decision.entityType, entityId: decision.entityId, label: decision.entityLabel },
      occurredAt: decision.createdAt,
      recordedAt: context.generatedAt,
      severity: decision.severity,
      title: decision.title,
      summary: decision.detail,
      source: "workflow_decision_queue",
      tags: [decision.actionType, "review_only"],
      replayKey: `memory:recommendation:${decision.id}`,
    }),
  );

  return [...workflowMemories, ...eventMemories, ...escalationMemories, ...executionMemories, ...recommendationMemories]
    .sort((first, second) => {
      const timeDelta = new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime();
      if (timeDelta !== 0) return timeDelta;
      return compareSeverity(second.severity, first.severity) || first.id.localeCompare(second.id);
    })
    .slice(0, cognitiveReasoningPolicy.maxMemoryRecords);
};

export const recallOperationalMemory = (
  memory: OperationalMemoryRecord[],
  query: MemoryRecallQuery = {},
): OperationalMemoryRecord[] => {
  const minimumSeverity: WorkflowSeverity = query.severityAtLeast || "low";

  return memory
    .filter((record) => !query.kinds || query.kinds.includes(record.kind))
    .filter((record) => !query.entityId || record.entity.entityId === query.entityId)
    .filter((record) => severityRank[record.severity] >= severityRank[minimumSeverity])
    .filter((record) => withinRange(record.occurredAt, query.from, query.to))
    .sort((first, second) => {
      const severityDelta = severityRank[second.severity] - severityRank[first.severity];
      if (severityDelta !== 0) return severityDelta;
      return new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime() || first.id.localeCompare(second.id);
    })
    .slice(0, query.limit || 20);
};

export const reconstructOperationalTimeline = (
  memory: OperationalMemoryRecord[],
  now: Date,
): MemoryReconstruction => {
  const records = [...memory].sort((first, second) =>
    new Date(first.occurredAt).getTime() - new Date(second.occurredAt).getTime() || first.id.localeCompare(second.id),
  );
  const criticalCount = records.filter((record) => record.severity === "critical").length;
  const highCount = records.filter((record) => record.severity === "high").length;

  return Object.freeze({
    records,
    summary: `${records.length} immutable memory records reconstructed; ${criticalCount} critical and ${highCount} high severity records remain visible.`,
    replayKeys: records.map((record) => record.replayKey),
    reconstructedAt: now.toISOString(),
  });
};
