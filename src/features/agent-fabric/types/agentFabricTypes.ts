import type { CognitiveOperationsResult, CognitivePlan, ReasoningFinding } from "@/features/cognitive-ops/types/cognitiveTypes";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";
import type { ExecutionActionType, ExecutionPriority } from "@/features/execution-runtime/types/executionTypes";
import type { WorkflowSeverity } from "@/features/workflow-intelligence/types/workflowTypes";

export type AgentFabricLanguage = "ar" | "en";

export type FabricAgentType =
  | "shipment_intelligence"
  | "escalation_coordination"
  | "finance_supervision"
  | "workflow_recovery"
  | "customer_operations"
  | "executive_oversight"
  | "operational_anomaly_analysis"
  | "execution_supervision";

export type FabricCapability =
  | "shipment_monitoring"
  | "escalation_recovery"
  | "finance_review"
  | "workflow_optimization"
  | "customer_follow_up"
  | "executive_briefing"
  | "anomaly_triage"
  | "execution_guarding";

export type DelegationStatus = "proposed" | "accepted" | "approval_required" | "conflict_resolved" | "replayed" | "recovered";

export type CoordinationRecordType =
  | "agent_signal"
  | "delegation"
  | "negotiation"
  | "planning"
  | "recovery";

export type FabricApprovalGate = "none" | "operations_lead" | "finance_lead" | "executive";

export type FabricAgent = Readonly<{
  id: string;
  type: FabricAgentType;
  label: string;
  capabilities: FabricCapability[];
  deterministic: true;
  approvalAware: true;
  maxConcurrentDelegations: number;
  priorityBias: number;
}>;

export type AgentExecutionContext = Readonly<{
  id: string;
  cognitive: CognitiveOperationsResult;
  generatedAt: string;
  activeAgents: FabricAgent[];
  workload: Readonly<Record<FabricAgentType, number>>;
  replayKeys: string[];
  immutable: true;
}>;

export type AgentSignal = Readonly<{
  id: string;
  agentId: string;
  agentType: FabricAgentType;
  findingId: string;
  capability: FabricCapability;
  severity: WorkflowSeverity;
  priority: number;
  explanation: string;
  proposedAction: ExecutionActionType;
  approvalGate: FabricApprovalGate;
  replayKey: string;
  immutable: true;
}>;

export type DelegationProposal = Readonly<{
  id: string;
  signalId: string;
  findingId: string;
  fromAgentId: string;
  toAgentId: string;
  capability: FabricCapability;
  score: number;
  status: DelegationStatus;
  approvalGate: FabricApprovalGate;
  reason: string;
  replayKey: string;
  immutable: true;
}>;

export type CoordinationRecord = Readonly<{
  id: string;
  type: CoordinationRecordType;
  occurredAt: string;
  agentIds: string[];
  entityId: string;
  severity: WorkflowSeverity;
  summary: string;
  replayKey: string;
  immutable: true;
}>;

export type CoordinationSnapshot = Readonly<{
  id: string;
  generatedAt: string;
  agents: FabricAgent[];
  signals: AgentSignal[];
  delegations: DelegationProposal[];
  records: CoordinationRecord[];
  workload: Readonly<Record<FabricAgentType, number>>;
  replayKeys: string[];
  immutable: true;
}>;

export type AgentMemoryRecord = Readonly<{
  id: string;
  agentId: string;
  agentType: FabricAgentType;
  sourceRecordId: string;
  occurredAt: string;
  title: string;
  summary: string;
  replayKey: string;
  immutable: true;
}>;

export type AgentMemoryReconstruction = Readonly<{
  records: AgentMemoryRecord[];
  replayKeys: string[];
  summary: string;
  reconstructedAt: string;
}>;

export type DistributedPlanStep = Readonly<{
  id: string;
  sequence: number;
  agentId: string;
  actionType: ExecutionActionType;
  priority: ExecutionPriority;
  title: string;
  approvalRequired: boolean;
  replayKey: string;
  destructive: false;
}>;

export type DistributedCoordinationPlan = Readonly<{
  id: string;
  objective: string;
  delegatedAgentIds: string[];
  sourcePlanIds: string[];
  steps: DistributedPlanStep[];
  approvalGate: FabricApprovalGate;
  rationale: string;
  replayKey: string;
  immutable: true;
}>;

export type CoordinationRecoveryState = Readonly<{
  restoredDelegations: DelegationProposal[];
  replayedDelegations: DelegationProposal[];
  staleCleaned: CoordinationRecord[];
  hydratedAgentIds: string[];
  replayKeys: string[];
  recoveredAt: string;
  immutable: true;
}>;

export type AgentFabricInput = Readonly<{
  dataset: EventSystemDataset;
  cognitive?: CognitiveOperationsResult;
  now?: Date;
}>;

export type AgentFabricResult = Readonly<{
  context: AgentExecutionContext;
  snapshot: CoordinationSnapshot;
  memory: AgentMemoryRecord[];
  memoryReconstruction: AgentMemoryReconstruction;
  plans: DistributedCoordinationPlan[];
  recovery: CoordinationRecoveryState;
  generatedAt: string;
}>;

export type AgentCapabilityMatch = Readonly<{
  agent: FabricAgent;
  finding: ReasoningFinding;
  sourcePlan?: CognitivePlan;
  capability: FabricCapability;
  score: number;
  approvalGate: FabricApprovalGate;
}>;
