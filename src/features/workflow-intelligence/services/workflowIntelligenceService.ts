import { buildWorkflowIntelligence } from "@/features/workflow-intelligence/orchestrators/workflowOrchestrator";
import type {
  AutomationPolicyConfig,
  WorkflowIntelligenceDataset,
  WorkflowIntelligenceResult,
} from "@/features/workflow-intelligence/types/workflowTypes";

export const createWorkflowIntelligenceSnapshot = (
  dataset: WorkflowIntelligenceDataset,
  policyOverrides?: Partial<AutomationPolicyConfig>,
): WorkflowIntelligenceResult => buildWorkflowIntelligence(dataset, policyOverrides);
