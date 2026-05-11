import type { FabricAgentType, FabricCapability } from "@/features/agent-fabric/types/agentFabricTypes";
import type { ReasoningKind } from "@/features/cognitive-ops/types/cognitiveTypes";
import type { WorkflowSeverity } from "@/features/workflow-intelligence/types/workflowTypes";

export const fabricPolicy = Object.freeze({
  maxSignals: 32,
  maxDelegations: 24,
  maxCoordinationRecords: 80,
  maxMemoryRecords: 96,
  maxDistributedPlans: 10,
  staleCoordinationHours: 48,
});

export const fabricSeverityRank: Record<WorkflowSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const capabilityByReasoningKind: Record<ReasoningKind, FabricCapability> = {
  operational_risk: "anomaly_triage",
  escalation: "escalation_recovery",
  workflow_bottleneck: "workflow_optimization",
  finance_anomaly: "finance_review",
  execution_impact: "execution_guarding",
  operational_prioritization: "executive_briefing",
};

export const primaryAgentByCapability: Record<FabricCapability, FabricAgentType> = {
  shipment_monitoring: "shipment_intelligence",
  escalation_recovery: "escalation_coordination",
  finance_review: "finance_supervision",
  workflow_optimization: "workflow_recovery",
  customer_follow_up: "customer_operations",
  executive_briefing: "executive_oversight",
  anomaly_triage: "operational_anomaly_analysis",
  execution_guarding: "execution_supervision",
};

export const priorityFromSeverity = (severity: WorkflowSeverity) => fabricSeverityRank[severity] * 25;
