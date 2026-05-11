import type { WorkflowSeverity } from "@/features/workflow-intelligence/types/workflowTypes";

export const severityRank: Record<WorkflowSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const severityFromScore = (score: number): WorkflowSeverity => {
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
};

export const compareSeverity = (first: WorkflowSeverity, second: WorkflowSeverity) =>
  severityRank[first] - severityRank[second];

export const cognitiveReasoningPolicy = Object.freeze({
  maxMemoryRecords: 80,
  maxFindings: 24,
  maxPlans: 12,
  maxCopilotRecommendationsPerRole: 2,
  staleShipmentDays: 10,
  financeAnomalyAmount: 50_000,
  criticalPriorityThreshold: 90,
  highPriorityThreshold: 70,
});

export const priorityFromSeverity = (severity: WorkflowSeverity) => {
  if (severity === "critical") return 100;
  if (severity === "high") return 75;
  if (severity === "medium") return 50;
  return 25;
};
