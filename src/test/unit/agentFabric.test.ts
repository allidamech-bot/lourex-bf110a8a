import { describe, expect, it } from "vitest";
import { buildAgentSignals } from "@/features/agent-fabric/agents/operationalAgents";
import { buildCoordinationFabric } from "@/features/agent-fabric/coordination/coordinationFabric";
import { buildAgentMemory, recallAgentMemory, reconstructAgentMemory } from "@/features/agent-fabric/memory/agentMemory";
import { negotiateDelegations } from "@/features/agent-fabric/negotiation/coordinationNegotiation";
import { synthesizeDistributedPlans } from "@/features/agent-fabric/planning/distributedPlanning";
import { buildAgentExecutionContext } from "@/features/agent-fabric/runtime/agentExecutionContext";
import { recoverCoordinationFabric } from "@/features/agent-fabric/runtime/agentRecovery";
import { buildAgentCoordinationFabric } from "@/features/agent-fabric/services/agentFabricService";
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

describe("agent coordination fabric", () => {
  it("orders coordination signals deterministically", async () => {
    const context = await buildAgentExecutionContext({ dataset: dataset("ordering"), now });
    const first = buildAgentSignals(context);
    const second = buildAgentSignals(context);

    expect(first.length).toBeGreaterThan(0);
    expect(first.map((signal) => signal.id)).toEqual(second.map((signal) => signal.id));
    expect(first[0].priority).toBeGreaterThanOrEqual(first[first.length - 1].priority);
  });

  it("routes delegations by capability and approval gate", async () => {
    const context = await buildAgentExecutionContext({ dataset: dataset("routing"), now });
    const signals = buildAgentSignals(context);
    const delegations = negotiateDelegations(signals);

    expect(delegations.length).toBe(signals.length);
    expect(delegations.some((delegation) => delegation.approvalGate !== "none")).toBe(true);
    expect(delegations.every((delegation) => delegation.score > 0)).toBe(true);
  });

  it("recovers coordination state and hydrates agents", async () => {
    const context = await buildAgentExecutionContext({ dataset: dataset("recovery"), now });
    const snapshot = buildCoordinationFabric(context);
    const recovery = recoverCoordinationFabric(snapshot, now, snapshot.delegations.slice(0, 1).map((item) => item.replayKey));

    expect(recovery.hydratedAgentIds.length).toBe(snapshot.agents.length);
    expect(recovery.replayedDelegations.length).toBe(1);
    expect(recovery.immutable).toBe(true);
  });

  it("marks replay-safe delegations without duplicating mutation intent", async () => {
    const context = await buildAgentExecutionContext({ dataset: dataset("replay"), now });
    const signals = buildAgentSignals(context);
    const first = negotiateDelegations(signals);
    const replay = negotiateDelegations(signals, first.map((delegation) => delegation.replayKey));

    expect(replay.length).toBe(first.length);
    expect(replay.every((delegation) => delegation.status === "replayed")).toBe(true);
  });

  it("balances workload across specialized agents", async () => {
    const context = await buildAgentExecutionContext({ dataset: dataset("workload"), now });
    const snapshot = buildCoordinationFabric(context);
    const activeLoads = Object.values(snapshot.workload).filter((value) => value > 0);

    expect(activeLoads.length).toBeGreaterThan(1);
    expect(Math.max(...activeLoads)).toBeLessThanOrEqual(4);
  });

  it("reconstructs and recalls agent memory", async () => {
    const context = await buildAgentExecutionContext({ dataset: dataset("memory"), now });
    const snapshot = buildCoordinationFabric(context);
    const memory = buildAgentMemory(snapshot);
    const reconstruction = reconstructAgentMemory(memory, now);
    const recalled = recallAgentMemory(memory, { agentId: memory[0]?.agentId, limit: 3 });

    expect(memory.every((record) => record.immutable)).toBe(true);
    expect(reconstruction.replayKeys.length).toBe(memory.length);
    expect(recalled.length).toBeLessThanOrEqual(3);
  });

  it("keeps coordination conflict-safe under replayed negotiation", async () => {
    const context = await buildAgentExecutionContext({ dataset: dataset("conflict"), now });
    const snapshot = buildCoordinationFabric(context, ["not-a-match"]);

    expect(new Set(snapshot.replayKeys).size).toBe(snapshot.replayKeys.length);
    expect(snapshot.delegations.every((delegation) => delegation.immutable)).toBe(true);
    expect(snapshot.records.every((record) => record.agentIds.length === 2)).toBe(true);
  });

  it("synthesizes distributed plans from delegated cognitive plans", async () => {
    const context = await buildAgentExecutionContext({ dataset: dataset("planning"), now });
    const snapshot = buildCoordinationFabric(context);
    const plans = synthesizeDistributedPlans(context, snapshot);

    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((plan) => plan.immutable && plan.steps.every((step) => step.destructive === false))).toBe(true);
    expect(plans.some((plan) => plan.sourcePlanIds.length > 0)).toBe(true);
  });

  it("builds the full fabric deterministically", async () => {
    const first = await buildAgentCoordinationFabric({ dataset: dataset("full"), now });
    const second = await buildAgentCoordinationFabric({ dataset: dataset("full"), now });

    expect(first.snapshot.delegations.map((delegation) => delegation.id)).toEqual(
      second.snapshot.delegations.map((delegation) => delegation.id),
    );
    expect(first.plans.map((plan) => plan.replayKey)).toEqual(second.plans.map((plan) => plan.replayKey));
  });
});
