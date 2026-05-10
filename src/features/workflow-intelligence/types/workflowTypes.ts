import type {
  OperationsDeal,
  OperationsFinancialEditRequest,
  OperationsFinancialEntry,
  OperationsRequest,
  OperationsShipment,
} from "@/domain/operations/types";
import type { PartnerSettlement } from "@/types/lourex";

export type WorkflowLanguage = "ar" | "en";

export type WorkflowSeverity = "low" | "medium" | "high" | "critical";

export type WorkflowEntityType =
  | "shipment"
  | "deal"
  | "customer"
  | "settlement"
  | "financial_entry"
  | "purchase_request";

export type WorkflowTriggerType =
  | "delayed_shipment_threshold"
  | "missing_update"
  | "financial_risk_spike"
  | "repeated_customer_issue"
  | "settlement_delay"
  | "unresolved_dispute"
  | "stalled_workflow_stage";

export type EscalationAction =
  | "notify_operations"
  | "finance_review"
  | "partner_escalation"
  | "customer_communication_recommendation"
  | "executive_attention_flag";

export type DecisionActionType =
  | "shipment_escalation"
  | "finance_review"
  | "partner_settlement_review"
  | "customer_follow_up"
  | "missing_update_request"
  | "workflow_recovery";

export type WorkflowStateTransition =
  | "monitor"
  | "route_to_operations"
  | "route_to_finance"
  | "route_to_partner"
  | "executive_review"
  | "recovery_required";

export type RetryStrategy = {
  maxAttempts: number;
  retryAfterHours: number;
  recoveryAction: WorkflowStateTransition;
};

export type AutomationPolicyConfig = {
  shipmentInactivityDays: number;
  delayedShipmentDays: number;
  missingUpdateDays: number;
  disputeEscalationDays: number;
  settlementDelayDays: number;
  paymentRiskAmount: number;
  repeatedIssueThreshold: number;
  criticalExposureAmount: number;
};

export type PolicyEvaluation = {
  policy: keyof AutomationPolicyConfig;
  passed: boolean;
  observedValue: number;
  threshold: number;
  severity: WorkflowSeverity;
};

export type OperationalTrigger = {
  id: string;
  type: WorkflowTriggerType;
  severity: WorkflowSeverity;
  entityType: WorkflowEntityType;
  entityId: string;
  entityLabel: string;
  customerName?: string;
  detectedAt: string;
  ageDays: number;
  financialExposure: number;
  reasons: string[];
  suggestedFollowUp: string;
  policyEvaluations: PolicyEvaluation[];
};

export type EscalationRecommendation = {
  id: string;
  triggerId: string;
  level: WorkflowSeverity;
  actions: EscalationAction[];
  reasonCodes: WorkflowTriggerType[];
  routeTo: WorkflowStateTransition;
  retryStrategy: RetryStrategy;
};

export type DecisionQueueItem = {
  id: string;
  priority: number;
  severity: WorkflowSeverity;
  actionType: DecisionActionType;
  title: string;
  detail: string;
  entityType: WorkflowEntityType;
  entityId: string;
  entityLabel: string;
  relatedTriggerIds: string[];
  escalationLevel: WorkflowSeverity;
  reviewOnly: true;
  createdAt: string;
};

export type WorkflowHealthMetrics = {
  workflowEfficiencyScore: number;
  blockedWorkflowCount: number;
  escalatedWorkflowCount: number;
  unresolvedOperationalIssues: number;
  averageRecoveryDurationDays: number;
  operationalStabilityScore: number;
};

export type WorkflowIntelligenceDataset = {
  requests: OperationsRequest[];
  shipments: OperationsShipment[];
  deals: OperationsDeal[];
  financialEntries: OperationsFinancialEntry[];
  financialEditRequests: OperationsFinancialEditRequest[];
  settlements?: PartnerSettlement[];
  now?: Date;
};

export type WorkflowIntelligenceResult = {
  triggers: OperationalTrigger[];
  escalations: EscalationRecommendation[];
  decisions: DecisionQueueItem[];
  health: WorkflowHealthMetrics;
  policies: AutomationPolicyConfig;
};
