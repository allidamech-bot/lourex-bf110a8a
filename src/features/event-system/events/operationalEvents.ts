import type { OperationalEvent, OperationalEventType, EventSystemDataset } from "@/features/event-system/types/eventTypes";
import { buildWorkflowIntelligence } from "@/features/workflow-intelligence/orchestrators/workflowOrchestrator";
import type {
  DecisionQueueItem,
  EscalationRecommendation,
  OperationalTrigger,
  WorkflowIntelligenceResult,
  WorkflowSeverity,
} from "@/features/workflow-intelligence/types/workflowTypes";

const severityRank: Record<WorkflowSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

const typeFromTrigger = (trigger: OperationalTrigger): OperationalEventType => {
  if (trigger.type === "delayed_shipment_threshold" || trigger.type === "missing_update") return "shipment_delay";
  if (trigger.type === "financial_risk_spike") return "finance_alert";
  if (trigger.type === "settlement_delay") return "settlement_issue";
  if (trigger.type === "unresolved_dispute") return "dispute_escalation";
  if (trigger.type === "repeated_customer_issue") return "customer_operational_event";
  return "workflow_blockage";
};

const titleFromEventType = (type: OperationalEventType) => {
  const labels: Record<OperationalEventType, string> = {
    shipment_delay: "Shipment delay signal",
    shipment_update: "Shipment update signal",
    escalation_trigger: "Escalation trigger",
    finance_alert: "Finance alert",
    settlement_issue: "Settlement issue",
    workflow_blockage: "Workflow blockage",
    dispute_escalation: "Dispute escalation",
    customer_operational_event: "Customer operational event",
    ai_recommendation: "AI recommendation",
  };
  return labels[type];
};

export const createOperationalEvent = (input: Omit<OperationalEvent, "dedupeKey" | "replayKey" | "advisoryOnly">): OperationalEvent => {
  const dedupeKey = [
    input.type,
    input.entity.entityType,
    input.entity.entityId,
    input.sourceModule,
  ].join(":");

  return {
    ...input,
    dedupeKey,
    replayKey: `${dedupeKey}:${input.occurredAt}`,
    advisoryOnly: true,
  };
};

const eventFromTrigger = (trigger: OperationalTrigger): OperationalEvent => {
  const type = typeFromTrigger(trigger);
  return createOperationalEvent({
    id: `event:${trigger.id}`,
    type,
    severity: trigger.severity,
    createdAt: trigger.detectedAt,
    occurredAt: trigger.detectedAt,
    entity: {
      entityType: trigger.entityType,
      entityId: trigger.entityId,
      label: trigger.entityLabel,
    },
    sourceModule: "workflow_intelligence",
    title: titleFromEventType(type),
    summary: trigger.suggestedFollowUp,
    metadata: {
      triggerType: trigger.type,
      ageDays: trigger.ageDays,
      financialExposure: trigger.financialExposure,
      reasons: trigger.reasons,
      customerName: trigger.customerName || null,
    },
  });
};

const eventFromEscalation = (escalation: EscalationRecommendation, trigger: OperationalTrigger | undefined): OperationalEvent => {
  const occurredAt = trigger?.detectedAt || new Date(0).toISOString();
  return createOperationalEvent({
    id: `event:${escalation.id}`,
    type: "escalation_trigger",
    severity: escalation.level,
    createdAt: occurredAt,
    occurredAt,
    entity: {
      entityType: trigger?.entityType || "workflow",
      entityId: trigger?.entityId || escalation.triggerId,
      label: trigger?.entityLabel || escalation.triggerId,
    },
    sourceModule: "workflow_intelligence",
    title: "Escalation route recommended",
    summary: `Route to ${escalation.routeTo} with ${escalation.actions.join(", ")}.`,
    metadata: {
      triggerId: escalation.triggerId,
      routeTo: escalation.routeTo,
      actions: escalation.actions,
      retryAfterHours: escalation.retryStrategy.retryAfterHours,
    },
  });
};

const eventFromDecision = (decision: DecisionQueueItem): OperationalEvent =>
  createOperationalEvent({
    id: `event:${decision.id}`,
    type: "ai_recommendation",
    severity: decision.severity,
    createdAt: decision.createdAt,
    occurredAt: decision.createdAt,
    entity: {
      entityType: decision.entityType,
      entityId: decision.entityId,
      label: decision.entityLabel,
    },
    sourceModule: "workflow_intelligence",
    title: decision.title,
    summary: decision.detail,
    metadata: {
      actionType: decision.actionType,
      priority: decision.priority,
      escalationLevel: decision.escalationLevel,
      relatedTriggerIds: decision.relatedTriggerIds,
    },
  });

export const buildOperationalEventsFromWorkflow = (
  workflow: WorkflowIntelligenceResult,
): OperationalEvent[] => {
  const triggerById = new Map(workflow.triggers.map((trigger) => [trigger.id, trigger]));

  return [
    ...workflow.triggers.map(eventFromTrigger),
    ...workflow.escalations.map((escalation) => eventFromEscalation(escalation, triggerById.get(escalation.triggerId))),
    ...workflow.decisions.slice(0, 12).map(eventFromDecision),
  ].sort((first, second) =>
    severityRank[second.severity] - severityRank[first.severity] ||
    new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime() ||
    first.id.localeCompare(second.id),
  );
};

export const buildOperationalEvents = (dataset: EventSystemDataset): OperationalEvent[] => {
  const workflow = buildWorkflowIntelligence(dataset);
  return buildOperationalEventsFromWorkflow(workflow);
};
