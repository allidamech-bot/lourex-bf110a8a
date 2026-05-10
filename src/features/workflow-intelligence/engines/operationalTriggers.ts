import type {
  AutomationPolicyConfig,
  OperationalTrigger,
  PolicyEvaluation,
  WorkflowIntelligenceDataset,
  WorkflowSeverity,
  WorkflowTriggerType,
} from "@/features/workflow-intelligence/types/workflowTypes";
import { evaluateThresholdPolicy, severityFromScore } from "@/features/workflow-intelligence/policies/automationPolicies";

const DAY_MS = 86_400_000;

const toDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const daysSince = (value: string | undefined | null, now: Date) => {
  const date = toDate(value);
  if (!date) return 0;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
};

const isClosedShipment = (stage: string) => stage === "delivered" || stage === "closed";

const hasDisputeText = (text: string) => {
  const normalized = text.toLowerCase();
  return normalized.includes("dispute") || normalized.includes("اعتراض") || normalized.includes("نزاع");
};

const scoreToSeverity = (score: number, exposure: number, policies: AutomationPolicyConfig): WorkflowSeverity => {
  if (exposure >= policies.criticalExposureAmount) return "critical";
  return severityFromScore(score);
};

const createTrigger = (input: {
  type: WorkflowTriggerType;
  severity: WorkflowSeverity;
  entityType: OperationalTrigger["entityType"];
  entityId: string;
  entityLabel: string;
  customerName?: string;
  now: Date;
  ageDays: number;
  financialExposure?: number;
  reasons: string[];
  suggestedFollowUp: string;
  policyEvaluations?: PolicyEvaluation[];
}): OperationalTrigger => ({
  id: `${input.type}:${input.entityType}:${input.entityId}`,
  type: input.type,
  severity: input.severity,
  entityType: input.entityType,
  entityId: input.entityId,
  entityLabel: input.entityLabel,
  customerName: input.customerName,
  detectedAt: input.now.toISOString(),
  ageDays: input.ageDays,
  financialExposure: input.financialExposure || 0,
  reasons: input.reasons,
  suggestedFollowUp: input.suggestedFollowUp,
  policyEvaluations: input.policyEvaluations || [],
});

export const detectOperationalTriggers = (
  dataset: WorkflowIntelligenceDataset,
  policies: AutomationPolicyConfig,
): OperationalTrigger[] => {
  const now = dataset.now || new Date();
  const dealsById = new Map(dataset.deals.map((deal) => [deal.id, deal]));
  const entriesByDeal = dataset.financialEntries.reduce<Map<string, typeof dataset.financialEntries>>((map, entry) => {
    if (!entry.dealId) return map;
    map.set(entry.dealId, [...(map.get(entry.dealId) || []), entry]);
    return map;
  }, new Map());
  const triggers: OperationalTrigger[] = [];
  const problematicByCustomer = new Map<string, number>();

  const financialExposureForDeal = (dealId?: string | null) => {
    if (!dealId) return 0;
    const deal = dealsById.get(dealId);
    const income = (entriesByDeal.get(dealId) || [])
      .filter((entry) => entry.type === "income")
      .reduce((sum, entry) => sum + entry.amount, 0);
    return Math.max(0, (deal?.totalValue || 0) - income);
  };

  dataset.shipments.forEach((shipment) => {
    const deal = shipment.dealId ? dealsById.get(shipment.dealId) : undefined;
    const ageDays = daysSince(shipment.updatedAt, now);
    const customerKey = deal?.customerId || shipment.clientName || shipment.trackingId;
    if (ageDays >= policies.shipmentInactivityDays || !shipment.customerVisibleNote?.trim()) {
      problematicByCustomer.set(customerKey, (problematicByCustomer.get(customerKey) || 0) + 1);
    }
  });

  dataset.shipments.forEach((shipment) => {
    if (isClosedShipment(shipment.stage)) return;
    const deal = shipment.dealId ? dealsById.get(shipment.dealId) : undefined;
    const ageDays = daysSince(shipment.updatedAt, now);
    const exposure = financialExposureForDeal(shipment.dealId);
    const label = shipment.trackingId || shipment.id;

    if (ageDays >= policies.delayedShipmentDays) {
      const policyEvaluation = evaluateThresholdPolicy("delayedShipmentDays", ageDays, policies.delayedShipmentDays, "high");
      triggers.push(createTrigger({
        type: "delayed_shipment_threshold",
        severity: scoreToSeverity(75 + Math.min(ageDays, 20), exposure, policies),
        entityType: "shipment",
        entityId: shipment.id,
        entityLabel: label,
        customerName: deal?.customerName || shipment.clientName,
        now,
        ageDays,
        financialExposure: exposure,
        reasons: [`Shipment has had no stage progress for ${ageDays} day(s).`],
        suggestedFollowUp: "Escalate to the shipment owner and confirm the real operational stage before customer messaging.",
        policyEvaluations: [policyEvaluation],
      }));
    }

    if (ageDays >= policies.missingUpdateDays || shipment.timeline.length === 0 || !shipment.customerVisibleNote?.trim()) {
      const policyEvaluation = evaluateThresholdPolicy("missingUpdateDays", ageDays, policies.missingUpdateDays, "medium");
      triggers.push(createTrigger({
        type: "missing_update",
        severity: ageDays >= policies.shipmentInactivityDays ? "high" : "medium",
        entityType: "shipment",
        entityId: shipment.id,
        entityLabel: label,
        customerName: deal?.customerName || shipment.clientName,
        now,
        ageDays,
        financialExposure: exposure,
        reasons: ["Customer-safe shipment update or timeline activity is missing."],
        suggestedFollowUp: "Request a concise customer-safe update from the responsible partner.",
        policyEvaluations: [policyEvaluation],
      }));
    }

    if (exposure >= policies.paymentRiskAmount) {
      const policyEvaluation = evaluateThresholdPolicy("paymentRiskAmount", exposure, policies.paymentRiskAmount, "high");
      triggers.push(createTrigger({
        type: "financial_risk_spike",
        severity: scoreToSeverity(70, exposure, policies),
        entityType: "deal",
        entityId: deal?.id || shipment.id,
        entityLabel: deal?.dealNumber || label,
        customerName: deal?.customerName || shipment.clientName,
        now,
        ageDays,
        financialExposure: exposure,
        reasons: [`Open financial exposure is ${Math.round(exposure).toLocaleString("en-US")}.`],
        suggestedFollowUp: "Route to finance for payment coverage review before further operational commitments.",
        policyEvaluations: [policyEvaluation],
      }));
    }
  });

  problematicByCustomer.forEach((count, customerKey) => {
    if (count < policies.repeatedIssueThreshold) return;
    const policyEvaluation = evaluateThresholdPolicy(
      "repeatedIssueThreshold",
      count,
      policies.repeatedIssueThreshold,
      "high",
    );
    triggers.push(createTrigger({
      type: "repeated_customer_issue",
      severity: count > policies.repeatedIssueThreshold ? "critical" : "high",
      entityType: "customer",
      entityId: customerKey,
      entityLabel: customerKey,
      customerName: customerKey,
      now,
      ageDays: 0,
      reasons: [`Customer has ${count} active operational issue signal(s).`],
      suggestedFollowUp: "Prepare a coordinated customer follow-up plan to prevent dispute escalation.",
      policyEvaluations: [policyEvaluation],
    }));
  });

  (dataset.settlements || []).forEach((settlement) => {
    if (settlement.status !== "pending_review" && settlement.status !== "disputed") return;
    const ageDays = daysSince(settlement.updatedAt || settlement.createdAt, now);
    if (ageDays < policies.settlementDelayDays && settlement.status !== "disputed") return;
    const severity: WorkflowSeverity = settlement.status === "disputed" ? "high" : "medium";
    triggers.push(createTrigger({
      type: "settlement_delay",
      severity,
      entityType: "settlement",
      entityId: settlement.id,
      entityLabel: settlement.partnerName || settlement.partnerId,
      now,
      ageDays,
      financialExposure: Math.max(0, settlement.netDue),
      reasons: [`Partner settlement is ${settlement.status} for ${ageDays} day(s).`],
      suggestedFollowUp: "Review settlement owner, pending evidence, and partner communication before approval.",
      policyEvaluations: [
        evaluateThresholdPolicy("settlementDelayDays", ageDays, policies.settlementDelayDays, severity),
      ],
    }));
  });

  dataset.financialEditRequests.forEach((request) => {
    if (request.status !== "pending") return;
    const ageDays = daysSince(request.submittedAt, now);
    if (ageDays < policies.disputeEscalationDays && !hasDisputeText(request.reason)) return;
    triggers.push(createTrigger({
      type: "unresolved_dispute",
      severity: ageDays >= policies.disputeEscalationDays * 2 ? "critical" : "high",
      entityType: request.dealId ? "deal" : "financial_entry",
      entityId: request.dealId || request.financialEntryId || request.id,
      entityLabel: request.dealNumber || request.targetEntryNumber,
      customerName: request.customerName,
      now,
      ageDays,
      reasons: ["Pending financial edit or dispute review remains unresolved."],
      suggestedFollowUp: "Assign a reviewer and document the correction decision without mutating locked records directly.",
      policyEvaluations: [
        evaluateThresholdPolicy("disputeEscalationDays", ageDays, policies.disputeEscalationDays, "high"),
      ],
    }));
  });

  dataset.requests.forEach((request) => {
    const ageDays = daysSince(request.reviewedAt || request.createdAt, now);
    const stalledStatuses = ["awaiting_clarification", "under_review", "transfer_proof_pending"];
    if (!stalledStatuses.includes(request.status) || ageDays < policies.shipmentInactivityDays) return;
    triggers.push(createTrigger({
      type: "stalled_workflow_stage",
      severity: ageDays >= policies.delayedShipmentDays ? "high" : "medium",
      entityType: "purchase_request",
      entityId: request.id,
      entityLabel: request.requestNumber,
      customerName: request.customer.fullName,
      now,
      ageDays,
      reasons: [`Purchase request is still ${request.status} after ${ageDays} day(s).`],
      suggestedFollowUp: "Route the request to the owning operator for clarification, transfer proof, or conversion decision.",
      policyEvaluations: [
        evaluateThresholdPolicy("shipmentInactivityDays", ageDays, policies.shipmentInactivityDays, "medium"),
      ],
    }));
  });

  return triggers.sort((first, second) => {
    const severityWeight: Record<WorkflowSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return severityWeight[second.severity] - severityWeight[first.severity] ||
      second.financialExposure - first.financialExposure ||
      second.ageDays - first.ageDays ||
      first.id.localeCompare(second.id);
  });
};
