import { describe, expect, it } from "vitest";
import { buildOperationsAdvisor } from "@/features/ai-ops/advisors/operationsAdvisor";
import { analyzeTimeline } from "@/features/ai-ops/analytics/timelineAnalytics";
import { analyzeShipmentRisks } from "@/features/ai-ops/engines/shipmentRiskEngine";
import type {
  OperationsDeal,
  OperationsFinancialEditRequest,
  OperationsFinancialEntry,
  OperationsShipment,
} from "@/domain/operations/types";

const now = new Date("2026-05-10T09:00:00.000Z");

const shipment = (overrides: Partial<OperationsShipment> = {}): OperationsShipment => ({
  id: "shipment-1",
  trackingId: "TRK-1",
  clientName: "Customer A",
  destination: "Riyadh",
  pallets: 1,
  weight: 100,
  dealId: "deal-1",
  dealNumber: "DL-1",
  stage: "in_transit",
  updatedAt: "2026-04-25T09:00:00.000Z",
  customerVisibleNote: "",
  timeline: [],
  ...overrides,
});

const deal = (overrides: Partial<OperationsDeal> = {}): OperationsDeal => ({
  id: "deal-1",
  dealNumber: "DL-1",
  operationTitle: "Operation",
  customerId: "customer-1",
  customerName: "Customer A",
  status: "active",
  operationalStatus: "in_transit",
  stage: "in_transit",
  shipmentId: "shipment-1",
  trackingId: "TRK-1",
  totalValue: 80_000,
  currency: "SAR",
  createdAt: "2026-04-01T09:00:00.000Z",
  notes: "Potential dispute on delivery timing",
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
  reason: "Review dispute",
  status: "pending",
  submittedAt: "2026-05-01T09:00:00.000Z",
  ...overrides,
});

describe("AI operations intelligence", () => {
  it("detects delayed shipments, dispute indicators, and financial exposure", () => {
    const [risk] = analyzeShipmentRisks({
      shipments: [shipment()],
      deals: [deal()],
      financialEntries: [entry()],
      financialEditRequests: [editRequest()],
      now,
    });

    expect(risk.riskScore).toBeGreaterThanOrEqual(80);
    expect(risk.reasons).toEqual(expect.arrayContaining([
      "delayed_shipment",
      "stale_shipment",
      "missing_recent_update",
      "dispute_indicator",
      "financial_exposure",
    ]));
    expect(risk.financialExposure).toBe(70_000);
  });

  it("detects timeline bottlenecks and stalled stages", () => {
    const result = analyzeTimeline([
      shipment({ id: "shipment-1", stage: "customs_clearance", updatedAt: "2026-04-30T09:00:00.000Z" }),
      shipment({ id: "shipment-2", stage: "customs_clearance", updatedAt: "2026-05-01T09:00:00.000Z" }),
      shipment({ id: "shipment-3", stage: "in_transit", updatedAt: "2026-05-09T09:00:00.000Z" }),
    ], now, { customs_clearance: 3 });

    expect(result.bottleneckStage).toBe("customs_clearance");
    expect(result.stalledStages).toContain("customs_clearance");
  });

  it("builds executive metrics and multilingual recommendations", () => {
    const result = buildOperationsAdvisor(
      {
        shipments: [shipment(), shipment({ id: "shipment-2", trackingId: "TRK-2", updatedAt: "2026-04-24T09:00:00.000Z" })],
        deals: [deal()],
        financialEntries: [entry()],
        financialEditRequests: [editRequest()],
        settlements: [{ id: "settlement-1", partnerId: "p1", partnerRole: "turkish_partner", settlementPeriod: "2026-05", grossAmount: 1, partnerCommission: 1, expenses: 0, netDue: 1, status: "pending_review", createdAt: "", updatedAt: "" }],
        now,
      },
      "ar",
    );

    expect(result.executiveMetrics.pendingSettlementsCount).toBe(1);
    expect(result.executiveMetrics.delayedOrdersCount).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0].title).not.toMatch(/[A-Za-z]{4,}/);
  });
});
