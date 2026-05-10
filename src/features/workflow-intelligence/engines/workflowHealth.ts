import type {
  OperationalTrigger,
  WorkflowHealthMetrics,
  WorkflowSeverity,
} from "@/features/workflow-intelligence/types/workflowTypes";

const severityPenalty: Record<WorkflowSeverity, number> = {
  low: 3,
  medium: 8,
  high: 15,
  critical: 25,
};

export const calculateWorkflowHealth = (triggers: OperationalTrigger[]): WorkflowHealthMetrics => {
  const unresolvedOperationalIssues = triggers.length;
  const blockedWorkflowCount = triggers.filter((trigger) =>
    trigger.severity === "critical" ||
    trigger.type === "unresolved_dispute" ||
    trigger.type === "stalled_workflow_stage",
  ).length;
  const escalatedWorkflowCount = triggers.filter((trigger) => trigger.severity === "high" || trigger.severity === "critical").length;
  const totalPenalty = triggers.reduce((sum, trigger) => sum + severityPenalty[trigger.severity], 0);
  const workflowEfficiencyScore = Math.max(0, Math.min(100, 100 - totalPenalty));
  const averageRecoveryDurationDays = triggers.length
    ? Number((triggers.reduce((sum, trigger) => sum + Math.max(1, trigger.ageDays), 0) / triggers.length).toFixed(1))
    : 0;
  const operationalStabilityScore = Math.max(
    0,
    Math.min(100, workflowEfficiencyScore - blockedWorkflowCount * 4 - escalatedWorkflowCount * 2),
  );

  return {
    workflowEfficiencyScore,
    blockedWorkflowCount,
    escalatedWorkflowCount,
    unresolvedOperationalIssues,
    averageRecoveryDurationDays,
    operationalStabilityScore,
  };
};
