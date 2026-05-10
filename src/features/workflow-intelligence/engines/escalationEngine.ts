import type {
  EscalationAction,
  EscalationRecommendation,
  OperationalTrigger,
  RetryStrategy,
  WorkflowStateTransition,
} from "@/features/workflow-intelligence/types/workflowTypes";

const retryByLevel: Record<EscalationRecommendation["level"], RetryStrategy> = {
  low: { maxAttempts: 1, retryAfterHours: 48, recoveryAction: "monitor" },
  medium: { maxAttempts: 2, retryAfterHours: 24, recoveryAction: "route_to_operations" },
  high: { maxAttempts: 3, retryAfterHours: 12, recoveryAction: "recovery_required" },
  critical: { maxAttempts: 3, retryAfterHours: 4, recoveryAction: "executive_review" },
};

const routeForTrigger = (trigger: OperationalTrigger): WorkflowStateTransition => {
  if (trigger.severity === "critical") return "executive_review";
  if (trigger.type === "financial_risk_spike" || trigger.type === "unresolved_dispute") return "route_to_finance";
  if (trigger.type === "settlement_delay") return "route_to_partner";
  if (trigger.type === "missing_update" || trigger.type === "delayed_shipment_threshold") return "route_to_operations";
  return "recovery_required";
};

const actionsForTrigger = (trigger: OperationalTrigger): EscalationAction[] => {
  const actions = new Set<EscalationAction>();

  if (trigger.severity === "critical") actions.add("executive_attention_flag");
  if (trigger.type === "financial_risk_spike" || trigger.type === "unresolved_dispute") actions.add("finance_review");
  if (trigger.type === "delayed_shipment_threshold" || trigger.type === "missing_update") {
    actions.add("notify_operations");
    actions.add("partner_escalation");
    actions.add("customer_communication_recommendation");
  }
  if (trigger.type === "settlement_delay") {
    actions.add("finance_review");
    actions.add("partner_escalation");
  }
  if (trigger.type === "repeated_customer_issue" || trigger.type === "stalled_workflow_stage") {
    actions.add("notify_operations");
    actions.add("customer_communication_recommendation");
  }

  if (actions.size === 0) actions.add("notify_operations");
  return [...actions];
};

export const buildEscalationRecommendations = (
  triggers: OperationalTrigger[],
): EscalationRecommendation[] =>
  triggers.map((trigger) => ({
    id: `escalation:${trigger.id}`,
    triggerId: trigger.id,
    level: trigger.severity,
    actions: actionsForTrigger(trigger),
    reasonCodes: [trigger.type],
    routeTo: routeForTrigger(trigger),
    retryStrategy: retryByLevel[trigger.severity],
  }));
