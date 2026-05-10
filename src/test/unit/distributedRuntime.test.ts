import { describe, expect, it } from "vitest";
import { buildRealtimeTransportRuntime } from "@/features/realtime-transport/services/realtimeTransportService";
import { createTransportMessage } from "@/features/realtime-transport/transport/transportClient";
import { LocalDistributedRuntimeRepository } from "@/features/distributed-runtime/repositories/distributedOperationalStore";
import { replicateOperationalMessages } from "@/features/distributed-runtime/replication/operationalReplication";
import { buildSynchronizedRuntime, recoverDistributedRuntime } from "@/features/distributed-runtime/runtime/synchronizedRuntime";
import { createRuntimeReplica } from "@/features/distributed-runtime/store/replicatedRuntimeState";
import { hydrateDistributedSnapshot } from "@/features/distributed-runtime/state/distributedSnapshots";
import { verifyRuntimeConsistency } from "@/features/distributed-runtime/state/runtimeConsistency";
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

describe("distributed runtime", () => {
  it("replicates transport messages in deterministic order", async () => {
    const transport = await buildRealtimeTransportRuntime({ dataset: dataset(), now });
    const replica = createRuntimeReplica({ replicaId: "r1", nodeName: "Replica 1", lastSeenAt: now.toISOString() });
    const result = replicateOperationalMessages(transport, [replica], now);

    expect(result.records.length).toBeGreaterThan(0);
    expect(result.records[0].sequence).toBeLessThanOrEqual(result.records[result.records.length - 1].sequence);
    expect(result.snapshot.immutable).toBe(true);
  });

  it("detects duplicate replay conflicts during replication", async () => {
    const transport = await buildRealtimeTransportRuntime({ dataset: dataset(), now });
    const duplicate = createTransportMessage({ ...transport.messages[0], id: "duplicate-message" });
    const result = replicateOperationalMessages(
      { ...transport, messages: [transport.messages[0], duplicate] },
      [createRuntimeReplica({ replicaId: "r1", nodeName: "Replica 1", lastSeenAt: now.toISOString() })],
      now,
    );

    expect(result.records).toHaveLength(1);
    expect(result.conflicts.map((item) => item.type)).toContain("duplicate_replay");
  });

  it("isolates stale replicas and lowers consistency score", async () => {
    const transport = await buildRealtimeTransportRuntime({ dataset: dataset(), now });
    const activeReplica = createRuntimeReplica({
      replicaId: "active",
      nodeName: "Active",
      lastSeenAt: now.toISOString(),
    });
    const staleReplica = createRuntimeReplica({
      replicaId: "stale",
      nodeName: "Stale",
      lastSeenAt: "2026-05-10T08:55:00.000Z",
    });
    const replication = replicateOperationalMessages(transport, [activeReplica, staleReplica], now);
    const report = verifyRuntimeConsistency(replication.snapshot, replication.conflicts, now);

    expect(report.valid).toBe(false);
    expect(report.isolatedReplicas.map((replica) => replica.replicaId)).toContain("stale");
    expect(report.healthScore).toBeLessThan(100);
  });

  it("hydrates distributed snapshots and preserves replay keys", async () => {
    const transport = await buildRealtimeTransportRuntime({ dataset: dataset(), now });
    const replication = replicateOperationalMessages(
      transport,
      [createRuntimeReplica({ replicaId: "r1", nodeName: "Replica 1", lastSeenAt: now.toISOString() })],
      now,
    );
    const hydrated = hydrateDistributedSnapshot(replication.snapshot, new Date("2026-05-10T09:05:00.000Z"));

    expect(hydrated.replayKeys).toEqual(replication.snapshot.replayKeys);
    expect(hydrated.createdAt).toBe("2026-05-10T09:05:00.000Z");
  });

  it("builds and recovers repository-backed synchronized runtime", async () => {
    const repository = new LocalDistributedRuntimeRepository();
    const result = await buildSynchronizedRuntime({ dataset: dataset(), now }, repository);
    const recovered = await recoverDistributedRuntime(repository, now);

    expect(result.provider).toBe("local");
    expect(result.snapshot.records.length).toBeGreaterThan(0);
    expect(recovered?.restoredRecords.length).toBe(result.snapshot.records.length);
    expect(recovered?.consistency.healthScore).toBe(result.consistency.healthScore);
  });
});
