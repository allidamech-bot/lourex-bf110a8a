import type { EventPipelineResult } from "@/features/event-system/types/eventTypes";
import type { ExecutionActionType, ExecutionPriority, ExecutionRuntimeResult } from "@/features/execution-runtime/types/executionTypes";
import type { WorkflowIntelligenceResult, WorkflowSeverity } from "@/features/workflow-intelligence/types/workflowTypes";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";

export type CognitiveLanguage = "ar" | "en";

export type MemoryKind =
  | "operational_event"
  | "workflow"
  | "escalation"
  | "execution_history"
  | "decision_history"
  | "recommendation";

export type ReasoningKind =
  | "operational_risk"
  | "escalation"
  | "workflow_bottleneck"
  | "finance_anomaly"
  | "execution_impact"
  | "operational_prioritization";

export type CopilotRole =
  | "operations_manager"
  | "finance_supervisor"
  | "executive_oversight"
  | "partner_coordination"
  | "escalation_handling"
  | "shipment_monitoring";

export type CognitiveEntityType =
  | "shipment"
  | "deal"
  | "customer"
  | "settlement"
  | "financial_entry"
  | "purchase_request"
  | "workflow"
  | "execution";

export type CognitiveEntityReference = Readonly<{
  entityType: CognitiveEntityType;
  entityId: string;
  label: string;
}>;

export type OperationalContextSnapshot = Readonly<{
  id: string;
  generatedAt: string;
  datasetCounts: Readonly<{
    requests: number;
    shipments: number;
    deals: number;
    financialEntries: number;
    financialEditRequests: number;
    settlements: number;
  }>;
  activeRiskCounts: Readonly<{
    workflowTriggers: number;
    criticalTriggers: number;
    pendingApprovals: number;
    blockedExecutions: number;
    financeAnomalies: number;
    staleShipments: number;
  }>;
  workflow: WorkflowIntelligenceResult;
  events: EventPipelineResult;
  execution: ExecutionRuntimeResult;
  immutable: true;
}>;

export type OperationalMemoryRecord = Readonly<{
  id: string;
  kind: MemoryKind;
  entity: CognitiveEntityReference;
  occurredAt: string;
  recordedAt: string;
  severity: WorkflowSeverity;
  title: string;
  summary: string;
  source: string;
  tags: string[];
  replayKey: string;
  immutable: true;
}>;

export type MemoryRecallQuery = Readonly<{
  kinds?: MemoryKind[];
  entityId?: string;
  severityAtLeast?: WorkflowSeverity;
  from?: string;
  to?: string;
  limit?: number;
}>;

export type MemoryReconstruction = Readonly<{
  records: OperationalMemoryRecord[];
  summary: string;
  replayKeys: string[];
  reconstructedAt: string;
}>;

export type ReasoningFinding = Readonly<{
  id: string;
  kind: ReasoningKind;
  severity: WorkflowSeverity;
  priority: number;
  entity: CognitiveEntityReference;
  title: string;
  explanation: string;
  recommendation: string;
  evidenceReplayKeys: string[];
  approvalRequired: boolean;
  deterministicScore: number;
  createdAt: string;
  immutable: true;
}>;

export type PlanningStep = Readonly<{
  id: string;
  sequence: number;
  actionType: ExecutionActionType;
  title: string;
  detail: string;
  approvalRequired: boolean;
  priority: ExecutionPriority;
  replayKey: string;
  destructive: false;
}>;

export type CognitivePlan = Readonly<{
  id: string;
  findingId: string;
  objective: string;
  steps: PlanningStep[];
  approvalGate: "none" | "operations_lead" | "finance_lead" | "executive";
  rationale: string;
  replayKey: string;
  immutable: true;
}>;

export type CopilotRecommendation = Readonly<{
  id: string;
  role: CopilotRole;
  title: string;
  message: string;
  recommendedPlanIds: string[];
  memoryReplayKeys: string[];
  approvalNote: string;
  confidence: number;
  createdAt: string;
  immutable: true;
}>;

export type ExecutiveInsight = Readonly<{
  id: string;
  category:
    | "operational_summary"
    | "strategic_risk"
    | "workflow_stability"
    | "execution_health"
    | "escalation_intelligence"
    | "efficiency_recommendation";
  severity: WorkflowSeverity;
  title: string;
  narrative: string;
  supportingFindingIds: string[];
  createdAt: string;
  immutable: true;
}>;

export type CognitiveOperationsInput = Readonly<{
  dataset: EventSystemDataset;
  now?: Date;
}>;

export type CognitiveOperationsResult = Readonly<{
  context: OperationalContextSnapshot;
  memory: OperationalMemoryRecord[];
  reconstruction: MemoryReconstruction;
  findings: ReasoningFinding[];
  plans: CognitivePlan[];
  copilots: CopilotRecommendation[];
  insights: ExecutiveInsight[];
  generatedAt: string;
}>;
