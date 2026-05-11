import { describe, expect, it } from "vitest";
import { buildCognitiveOperationsLayer } from "@/features/cognitive-ops/services/cognitiveOperationsService";
import { buildOperationalContextSnapshot } from "@/features/cognitive-ops/context/operationalContext";
import { buildOperationalMemory, recallOperationalMemory, reconstructOperationalTimeline } from "@/features/cognitive-ops/memory/operationalMemory";
import { runContextualReasoning } from "@/features/cognitive-ops/reasoning/contextualReasoning";
import { generateCognitivePlans } from "@/features/cognitive-ops/planning/cognitivePlanning";
import { orchestrateCopilots } from "@/features/cognitive-ops/copilot/copilotOrchestrator";
import { generateExecutiveInsights } from "@/features/cognitive-ops/services/executiveInsights";
import type {
  OperationsDeal,
  OperationsFinancialEditRequest,
  OperationsFinancialEntry,
  OperationsRequest,
  OperationsShipment,
} from "@/domain/operations/types";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";

const now = new Date("2026-05-10T09:00:00.000Z");

const request = (suffix: string): OperationsRequest => ({
  id: `request-${suffix}`,
  requestNumber: `REQ-${suffix}`,
  status: "awaiting_clarification",
  customer: {
    id: `customer-${suffix}`,
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
});

const shipment = (suffix: string): OperationsShipment => ({
  id: `shipment-${suffix}`,
  trackingId: `TRK-${suffix}`,
  clientName: "Customer A",
  destination: "Riyadh",
  pallets: 2,
  weight: 500,
  dealId: `deal-${suffix}`,
  dealNumber: `DL-${suffix}`,
  stage: "in_transit",
  updatedAt: "2026-04-20T09:00:00.000Z",
  customerVisibleNote: "No recent update",
  timeline: [],
});

const deal = (suffix: string): OperationsDeal => ({
  id: `deal-${suffix}`,
  dealNumber: `DL-${suffix}`,
  operationTitle: "Industrial shipment",
  customerId: `customer-${suffix}`,
  customerName: "Customer A",
  status: "active",
  operationalStatus: "in_transit",
  stage: "in_transit",
  shipmentId: `shipment-${suffix}`,
  trackingId: `TRK-${suffix}`,
  totalValue: 125_000,
  currency: "SAR",
  createdAt: "2026-04-01T09:00:00.000Z",
  notes: "Customer raised dispute on delay",
  attachments: [],
  trackingUpdates: [],
  accountingSummary: { income: 90_000, expense: 10_000, net: 80_000, entriesCount: 2 },
});

const entry = (suffix: string): OperationsFinancialEntry => ({
  id: `entry-${suffix}`,
  entryNumber: `FE-${suffix}`,
  scope: "deal",
  relationType: "deal_linked",
  dealId: `deal-${suffix}`,
  dealNumber: `DL-${suffix}`,
  customerId: `customer-${suffix}`,
  customerName: "Customer A",
  type: "income",
  amount: 90_000,
  currency: "SAR",
  locked: true,
  createdBy: "user-1",
  createdAt: "2026-04-02T09:00:00.000Z",
  entryDate: "2026-04-02",
  method: "Bank",
  counterparty: "Customer A",
  category: "Payment",
  note: "Deposit",
});

const editRequest = (suffix: string): OperationsFinancialEditRequest => ({
  id: `edit-${suffix}`,
  financialEntryId: `entry-${suffix}`,
  targetEntryNumber: `FE-${suffix}`,
  dealId: `deal-${suffix}`,
  dealNumber: `DL-${suffix}`,
  customerId: `customer-${suffix}`,
  customerName: "Customer A",
  requestedBy: "Ops",
  reason: "Dispute requires audit review",
  status: "pending",
  submittedAt: "2026-05-01T09:00:00.000Z",
});

const dataset = (suffix: string): EventSystemDataset => ({
  requests: [request(suffix)],
  shipments: [shipment(suffix)],
  deals: [deal(suffix)],
  financialEntries: [entry(suffix)],
  financialEditRequests: [editRequest(suffix)],
  settlements: [],
  now,
});

describe("cognitive operations layer", () => {
  it("reconstructs replay-safe operational memory", async () => {
    const context = await buildOperationalContextSnapshot(dataset("memory"), now);
    const memory = buildOperationalMemory(context);
    const reconstruction = reconstructOperationalTimeline(memory, now);

    expect(memory.length).toBeGreaterThan(0);
    expect(memory.every((record) => record.immutable)).toBe(true);
    expect(new Set(reconstruction.replayKeys).size).toBe(reconstruction.replayKeys.length);
  });

  it("retrieves contextual memory deterministically", async () => {
    const context = await buildOperationalContextSnapshot(dataset("recall"), now);
    const memory = buildOperationalMemory(context);
    const first = recallOperationalMemory(memory, { severityAtLeast: "medium", limit: 5 });
    const second = recallOperationalMemory(memory, { severityAtLeast: "medium", limit: 5 });

    expect(first.map((record) => record.id)).toEqual(second.map((record) => record.id));
    expect(first.length).toBeLessThanOrEqual(5);
  });

  it("generates contextual reasoning and operational prioritization", async () => {
    const context = await buildOperationalContextSnapshot(dataset("reason"), now);
    const memory = buildOperationalMemory(context);
    const findings = runContextualReasoning(context, memory);

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((finding) => finding.kind === "operational_prioritization")).toBe(true);
    expect(findings.every((finding) => finding.immutable && finding.evidenceReplayKeys.length >= 0)).toBe(true);
  });

  it("creates approval-aware non-destructive plans", async () => {
    const context = await buildOperationalContextSnapshot(dataset("planning"), now);
    const memory = buildOperationalMemory(context);
    const findings = runContextualReasoning(context, memory);
    const plans = generateCognitivePlans(findings);

    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((plan) => plan.immutable)).toBe(true);
    expect(plans.flatMap((plan) => plan.steps).every((step) => step.destructive === false)).toBe(true);
    expect(plans.some((plan) => plan.approvalGate !== "none")).toBe(true);
  });

  it("orchestrates role-specific copilots with explainable recommendations", async () => {
    const context = await buildOperationalContextSnapshot(dataset("copilot"), now);
    const memory = buildOperationalMemory(context);
    const findings = runContextualReasoning(context, memory);
    const plans = generateCognitivePlans(findings);
    const copilots = orchestrateCopilots(context, memory, findings, plans);

    expect(copilots.length).toBeGreaterThanOrEqual(6);
    expect(copilots.some((item) => item.role === "executive_oversight")).toBe(true);
    expect(copilots.every((item) => item.immutable && item.approvalNote.length > 0)).toBe(true);
  });

  it("generates executive insights from cognitive findings", async () => {
    const context = await buildOperationalContextSnapshot(dataset("insights"), now);
    const memory = buildOperationalMemory(context);
    const findings = runContextualReasoning(context, memory);
    const insights = generateExecutiveInsights(context, findings);

    expect(insights.map((insight) => insight.category)).toContain("strategic_risk");
    expect(insights.map((insight) => insight.category)).toContain("execution_health");
    expect(insights.every((insight) => insight.immutable)).toBe(true);
  });

  it("keeps the full cognitive recommendation flow deterministic", async () => {
    const first = await buildCognitiveOperationsLayer({ dataset: dataset("flow"), now });
    const second = await buildCognitiveOperationsLayer({ dataset: dataset("flow"), now });

    expect(first.findings.map((finding) => finding.id)).toEqual(second.findings.map((finding) => finding.id));
    expect(first.plans.map((plan) => plan.replayKey)).toEqual(second.plans.map((plan) => plan.replayKey));
    expect(first.copilots.map((copilot) => copilot.id)).toEqual(second.copilots.map((copilot) => copilot.id));
  });
});
