import type {
  AutomationPolicyConfig,
  PolicyEvaluation,
  WorkflowSeverity,
} from "@/features/workflow-intelligence/types/workflowTypes";

export const defaultAutomationPolicies: AutomationPolicyConfig = {
  shipmentInactivityDays: 5,
  delayedShipmentDays: 10,
  missingUpdateDays: 3,
  disputeEscalationDays: 4,
  settlementDelayDays: 7,
  paymentRiskAmount: 25_000,
  repeatedIssueThreshold: 2,
  criticalExposureAmount: 75_000,
};

export const severityFromScore = (score: number): WorkflowSeverity => {
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
};

export const mergeAutomationPolicies = (
  overrides?: Partial<AutomationPolicyConfig>,
): AutomationPolicyConfig => ({
  ...defaultAutomationPolicies,
  ...(overrides || {}),
});

export const evaluateThresholdPolicy = (
  policy: keyof AutomationPolicyConfig,
  observedValue: number,
  threshold: number,
  severity: WorkflowSeverity,
): PolicyEvaluation => ({
  policy,
  passed: observedValue < threshold,
  observedValue,
  threshold,
  severity,
});

export const isPolicyBreached = (evaluation: PolicyEvaluation) => !evaluation.passed;
