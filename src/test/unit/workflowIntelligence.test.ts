import { describe, expect, it } from "vitest";
import { buildDecisionQueue } from "@/features/workflow-intelligence/engines/decisionQueue";
import { buildEscalationRecommendations } from "@/features/workflow-intelligence/engines/escalationEngine";
import { detectOperationalTriggers } from "@/features/workflow-intelligence/engines/operationalTriggers";
import { calculateWorkflowHealth } from "@/features/workflow-intelligence/engines/workflowHealth";
import { buildWorkflowIntelligence } from "@/features/workflow-intelligence/orchestrators/workflowOrchestrator";
import { defaultAutomationPolicies, evaluateThresholdPolicy } from "@/features/workflow-intelligence/policies/automationPolicies";
import type {
  OperationsDeal,
  OperationsFinancialEditRequest,
  OperationsFinancialEntry,
  OperationsRequest,
  OperationsShipment,
} from "@/domain/operations/types";

const now = new Date("2026-05-10T09:00:00.000Z");

const shipment = (overrides: Partial<OperationsShipment> = {}): OperationsShipment => ({
  id: "shipment-1",
  trackingId: "TRK-1",
  clientName: "Customer A",
  destination: "Riyadh",
  pallets: 2,
  weight: 500,
  dealId: "deal-1",
  dealNumber: "DL-1",
  stage: "in_transit",
  updatedAt: "2026-04-24T09:00:00.000Z",
  customerVisibleNote: "",
  timeline: [],
  ...overrides,
});

const deal = (overrides: Partial<OperationsDeal> = {}): OperationsDeal => ({
  id: "deal-1",
  dealNumber: "DL-1",
  operationTitle: "Industrial shipment",
  customerId: "customer-1",
  customerName: "Customer A",
  status: "active",
  operationalStatus: "in_transit",
  stage: "in_transit",
  shipmentId: "shipment-1",
  trackingId: "TRK-1",
  totalValue: 90_000,
  currency: "SAR",
  createdAt: "2026-04-01T09:00:00.000Z",
  notes: "Customer raised dispute on delay",
  attachments: [],
  trackingUpdates: [],
  accountingSummary: { income: 10_000, expense: 0, net: 10_000, entriesCount: 1 },
  ...overrides,
});

const entry = (overrides: Partial<OperationsFinancialEntry> = {}): OperationsFinancialEntry => ({
  id: "entry-1",
  entryNumber: "FE-1",
  scope: "deal",
  relationType: "deal_linked",
  dealId: "deal-1",
  dealNumber: "DL-1",
  customerId: "customer-1",
  customerName: "Customer A",
  type: "income",
  amount: 10_000,
  currency: "SAR",
  locked: true,
  createdBy: "user-1",
  createdAt: "2026-04-02T09:00:00.000Z",
  entryDate: "2026-04-02",
  method: "Bank",
  counterparty: "Customer A",
  category: "Payment",
  note: "Deposit",
  ...overrides,
});

const editRequest = (overrides: Partial<OperationsFinancialEditRequest> = {}): OperationsFinancialEditRequest => ({
  id: "edit-1",
  financialEntryId: "entry-1",
  targetEntryNumber: "FE-1",
  dealId: "deal-1",
  dealNumber: "DL-1",
  customerId: "customer-1",
  customerName: "Customer A",
  requestedBy: "Ops",
  reason: "Dispute requires audit review",
  status: "pending",
  submittedAt: "2026-05-01T09:00:00.000Z",
  ...overrides,
});

const request = (overrides: Partial<OperationsRequest> = {}): OperationsRequest => ({
  id: "request-1",
  requestNumber: "REQ-1",
  status: "awaiting_clarification",
  customer: {
    id: "customer-1",
    fullName: "Customer A",
    phone: "123",
    email: "customer@example.com",
    country: "SA",
    city: "Riyadh",
  },
  productName: "Machine part",
  productDescription: "Part",
  quantity: 10,
  sizeDimensions: "",
  color: "",
  material: "",
  technicalSpecs: "",
  preferredShippingMethod: "",
  deliveryNotes: "",
  imageUrls: [],
  createdAt: "2026-04-20T09:00:00.000Z",
  internalNotes: "",
  reviewedAt: "2026-04-25T09:00:00.000Z",
  attachments: [],
  isReadyMade: false,
  hasPreviousSample: false,
  destination: "Riyadh",
  isFullSourcing: true,
  trackingCode: "",
  ...overrides,
});

describe("workflow intelligence", () => {
  it("evaluates automation policy thresholds deterministically", () => {
    const result = evaluateThresholdPolicy("delayedShipmentDays", 12, 10, "high");

    expect(result.passed).toBe(false);
    expect(result.policy).toBe("delayedShipmentDays");
    expect(result.severity).toBe("high");
  });

  it("detects shipment, finance, dispute, settlement, and stalled workflow triggers", () => {
    const triggers = detectOperationalTriggers(
      {
        requests: [request()],
        shipments: [shipment()],
        deals: [deal()],
        financialEntries: [entry()],
        financialEditRequests: [editRequest()],
        settlements: [{
          id: "settlement-1",
          partnerId: "partner-1",
          partnerName: "Partner A",
          partnerRole: "turkish_partner",
          settlementPeriod: "2026-04",
          grossAmount: 5_000,
          partnerCommission: 1_000,
          expenses: 100,
          netDue: 900,
          status: "pending_review",
          createdAt: "2026-04-20T09:00:00.000Z",
          updatedAt: "2026-04-24T09:00:00.000Z",
        }],
        now,
      },
      defaultAutomationPolicies,
    );

    expect(triggers.map((trigger) => trigger.type)).toEqual(expect.arrayContaining([
      "delayed_shipment_threshold",
      "financial_risk_spike",
      "unresolved_dispute",
      "settlement_delay",
      "stalled_workflow_stage",
    ]));
    expect(triggers[0].severity).toBe("critical");
  });

  it("builds escalation routes and prioritizes review-only decisions", () => {
    const triggers = detectOperationalTriggers(
      {
        requests: [request()],
        shipments: [shipment()],
        deals: [deal()],
        financialEntries: [entry()],
        financialEditRequests: [editRequest()],
        now,
      },
      defaultAutomationPolicies,
    );
    const escalations = buildEscalationRecommendations(triggers);
    const decisions = buildDecisionQueue(triggers, escalations);

    expect(escalations.some((item) => item.actions.includes("executive_attention_flag"))).toBe(true);
    expect(decisions[0].reviewOnly).toBe(true);
    expect(decisions[0].priority).toBeGreaterThanOrEqual(decisions[decisions.length - 1].priority);
  });

  it("calculates workflow recovery health metrics", () => {
    const result = buildWorkflowIntelligence({
      requests: [request()],
      shipments: [shipment()],
      deals: [deal()],
      financialEntries: [entry()],
      financialEditRequests: [editRequest()],
      now,
    });
    const health = calculateWorkflowHealth(result.triggers);

    expect(result.decisions.length).toBeGreaterThan(0);
    expect(health.unresolvedOperationalIssues).toBe(result.triggers.length);
    expect(health.workflowEfficiencyScore).toBeLessThan(100);
    expect(health.averageRecoveryDurationDays).toBeGreaterThan(0);
  });
});
