import { buildDecisionQueue } from "@/features/workflow-intelligence/engines/decisionQueue";
import { buildEscalationRecommendations } from "@/features/workflow-intelligence/engines/escalationEngine";
import { detectOperationalTriggers } from "@/features/workflow-intelligence/engines/operationalTriggers";
import { calculateWorkflowHealth } from "@/features/workflow-intelligence/engines/workflowHealth";
import { mergeAutomationPolicies } from "@/features/workflow-intelligence/policies/automationPolicies";
import type {
  AutomationPolicyConfig,
  WorkflowIntelligenceDataset,
  WorkflowIntelligenceResult,
} from "@/features/workflow-intelligence/types/workflowTypes";

export const buildWorkflowIntelligence = (
  dataset: WorkflowIntelligenceDataset,
  policyOverrides?: Partial<AutomationPolicyConfig>,
): WorkflowIntelligenceResult => {
  const policies = mergeAutomationPolicies(policyOverrides);
  const triggers = detectOperationalTriggers(dataset, policies);
  const escalations = buildEscalationRecommendations(triggers);
  const decisions = buildDecisionQueue(triggers, escalations);
  const health = calculateWorkflowHealth(triggers);

  return {
    triggers,
    escalations,
    decisions,
    health,
    policies,
  };
};
