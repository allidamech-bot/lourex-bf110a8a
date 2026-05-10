import { describe, expect, it } from "vitest";
import { bootstrapRuntimeInfrastructure } from "@/features/runtime-infra/services/runtimeInfrastructureService";
import { createOperationalSession, heartbeatSession } from "@/features/realtime-collaboration/presence/operationalSessions";
import { activeSessions, buildOperationalPresence } from "@/features/realtime-collaboration/presence/operationalPresence";
import { createSharedOperationalSnapshot } from "@/features/realtime-collaboration/state/sharedOperationalState";
import { buildCollaborativeRuntime } from "@/features/realtime-collaboration/state/collaborativeRuntime";
import { createSynchronizationPatch, reconcileSharedState } from "@/features/realtime-collaboration/sync/stateSynchronization";
import { defaultSynchronizationPolicies } from "@/features/realtime-collaboration/sync/synchronizationPolicies";
import type {
  OperationsDeal,
  OperationsFinancialEditRequest,
  OperationsFinancialEntry,
  OperationsRequest,
  OperationsShipment,
} from "@/domain/operations/types";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";

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

const dataset = (): EventSystemDataset => ({
  requests: [request()],
  shipments: [shipment()],
  deals: [deal()],
  financialEntries: [entry()],
  financialEditRequests: [editRequest()],
  settlements: [],
  now,
});

describe("realtime collaboration", () => {
  it("tracks presence and expires stale sessions deterministically", () => {
    const active = createOperationalSession({ sessionId: "s1", operatorId: "u1", operatorName: "Ops", role: "operations", now });
    const stale = createOperationalSession({ sessionId: "s2", operatorId: "u2", operatorName: "Finance", role: "finance", now: new Date("2026-05-10T08:55:00.000Z") });
    const presence = buildOperationalPresence([stale, active], defaultSynchronizationPolicies, now);

    expect(presence[0].sessionId).toBe("s1");
    expect(presence.find((item) => item.sessionId === "s2")?.stale).toBe(true);
    expect(activeSessions([stale, active], defaultSynchronizationPolicies, now)).toHaveLength(1);
  });

  it("derives immutable shared workflow state and collaboration signals", async () => {
    const runtime = await bootstrapRuntimeInfrastructure(dataset(), undefined, { now });
    const session = createOperationalSession({ sessionId: "s1", operatorId: "u1", operatorName: "Ops", role: "operations", now, activity: "editing_draft" });
    const result = await buildCollaborativeRuntime({ dataset: dataset(), runtime, sessions: [session], now });

    expect(result.snapshot.immutable).toBe(true);
    expect(result.snapshot.workflows.length).toBeGreaterThan(0);
    expect(result.signals.map((signal) => signal.type)).toContain("active_workflow_editing");
  });

  it("orders synchronization patches and skips replayed updates", async () => {
    const runtime = await bootstrapRuntimeInfrastructure(dataset(), undefined, { now });
    const snapshot = createSharedOperationalSnapshot({
      runtime,
      sessions: [],
      policies: defaultSynchronizationPolicies,
      now,
    });
    const target = snapshot.workflows[0];
    const patch = createSynchronizationPatch({
      sessionId: "s1",
      entityKey: target.entityKey,
      proposedState: { status: "coordinating" },
      submittedAt: "2026-05-10T09:01:00.000Z",
      optimistic: true,
    });

    const first = reconcileSharedState(snapshot, [patch], defaultSynchronizationPolicies, now);
    const second = reconcileSharedState(first.snapshot, [patch], defaultSynchronizationPolicies, now);

    expect(first.appliedPatches).toHaveLength(1);
    expect(first.snapshot.workflows.find((workflow) => workflow.entityKey === target.entityKey)?.status).toBe("coordinating");
    expect(second.appliedPatches).toHaveLength(0);
    expect(second.skippedReplayKeys).toContain(patch.replayKey);
  });

  it("resolves conflicts by severity priority without destructive overwrites", async () => {
    const runtime = await bootstrapRuntimeInfrastructure(dataset(), undefined, { now });
    const snapshot = createSharedOperationalSnapshot({
      runtime,
      sessions: [],
      policies: defaultSynchronizationPolicies,
      now,
    });
    const target = snapshot.workflows[0];
    const lowerSeverityPatch = createSynchronizationPatch({
      sessionId: "s1",
      entityKey: target.entityKey,
      proposedState: { severity: "low", status: "recovered" },
      submittedAt: "2026-05-10T09:02:00.000Z",
      optimistic: true,
    });

    const result = reconcileSharedState(snapshot, [lowerSeverityPatch], defaultSynchronizationPolicies, now);

    expect(result.appliedPatches).toHaveLength(0);
    expect(result.conflictsResolved).toBe(1);
    expect(result.snapshot.workflows[0].severity).toBe(target.severity);
  });

  it("supports session heartbeat and collaborative recovery hydration", async () => {
    const session = createOperationalSession({ sessionId: "s1", operatorId: "u1", operatorName: "Ops", role: "operations", now: new Date("2026-05-10T08:59:00.000Z") });
    const refreshed = heartbeatSession(session, now, "coordinating_follow_up");
    const runtime = await bootstrapRuntimeInfrastructure(dataset(), undefined, { now });
    const result = await buildCollaborativeRuntime({ dataset: dataset(), runtime, sessions: [refreshed], now });

    expect(refreshed.activity).toBe("coordinating_follow_up");
    expect(result.snapshot.sessions[0].lastHeartbeatAt).toBe(now.toISOString());
    expect(result.snapshot.replayKeys.length).toBeGreaterThan(0);
  });
});
