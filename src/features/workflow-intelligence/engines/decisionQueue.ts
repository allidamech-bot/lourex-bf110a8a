import type {
  DecisionActionType,
  DecisionQueueItem,
  EscalationRecommendation,
  OperationalTrigger,
  WorkflowSeverity,
} from "@/features/workflow-intelligence/types/workflowTypes";

const severityPriority: Record<WorkflowSeverity, number> = {
  critical: 400,
  high: 300,
  medium: 200,
  low: 100,
};

const actionTypeForTrigger = (trigger: OperationalTrigger): DecisionActionType => {
  if (trigger.type === "financial_risk_spike" || trigger.type === "unresolved_dispute") return "finance_review";
  if (trigger.type === "settlement_delay") return "partner_settlement_review";
  if (trigger.type === "missing_update") return "missing_update_request";
  if (trigger.type === "delayed_shipment_threshold") return "shipment_escalation";
  if (trigger.type === "repeated_customer_issue") return "customer_follow_up";
  return "workflow_recovery";
};

const titleForTrigger = (trigger: OperationalTrigger) => {
  const titles: Record<OperationalTrigger["type"], string> = {
    delayed_shipment_threshold: "Escalate delayed shipment",
    missing_update: "Request missing operational update",
    financial_risk_spike: "Review financial exposure",
    repeated_customer_issue: "Coordinate customer recovery plan",
    settlement_delay: "Review delayed partner settlement",
    unresolved_dispute: "Resolve pending dispute review",
    stalled_workflow_stage: "Recover stalled workflow stage",
  };
  return titles[trigger.type];
};

export const buildDecisionQueue = (
  triggers: OperationalTrigger[],
  escalations: EscalationRecommendation[],
): DecisionQueueItem[] => {
  const escalationByTrigger = new Map(escalations.map((item) => [item.triggerId, item]));

  return triggers.map((trigger) => {
    const escalation = escalationByTrigger.get(trigger.id);
    const priority = severityPriority[trigger.severity] +
      Math.min(80, trigger.ageDays * 4) +
      Math.min(120, Math.round(trigger.financialExposure / 1_000));

    return {
      id: `decision:${trigger.id}`,
      priority,
      severity: trigger.severity,
      actionType: actionTypeForTrigger(trigger),
      title: titleForTrigger(trigger),
      detail: trigger.suggestedFollowUp,
      entityType: trigger.entityType,
      entityId: trigger.entityId,
      entityLabel: trigger.entityLabel,
      relatedTriggerIds: [trigger.id],
      escalationLevel: escalation?.level || trigger.severity,
      reviewOnly: true,
      createdAt: trigger.detectedAt,
    };
  }).sort((first, second) =>
    second.priority - first.priority ||
    first.entityLabel.localeCompare(second.entityLabel) ||
    first.id.localeCompare(second.id),
  );
};
