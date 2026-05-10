import { describe, expect, it } from "vitest";
import { bootstrapRuntimeInfrastructure } from "@/features/runtime-infra/services/runtimeInfrastructureService";
import { createOperationalSession } from "@/features/realtime-collaboration/presence/operationalSessions";
import { createSharedOperationalSnapshot } from "@/features/realtime-collaboration/state/sharedOperationalState";
import { createSynchronizationPatch } from "@/features/realtime-collaboration/sync/stateSynchronization";
import { defaultSynchronizationPolicies } from "@/features/realtime-collaboration/sync/synchronizationPolicies";
import { InMemoryTransportClient, createTransportMessage } from "@/features/realtime-transport/transport/transportClient";
import { recoverTransportState } from "@/features/realtime-transport/transport/transportRecovery";
import { messageFromPatch, publishTransportMessages } from "@/features/realtime-transport/transport/synchronizationTransport";
import { synchronizeFromTransport } from "@/features/realtime-transport/sync/realtimeSynchronization";
import { updateLivePresence, cleanupStalePresence } from "@/features/realtime-transport/presence/livePresence";
import { buildOperationalStreams } from "@/features/realtime-transport/realtime/operationalStreams";
import { buildRealtimeTransportRuntime } from "@/features/realtime-transport/services/realtimeTransportService";
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

describe("realtime transport", () => {
  it("orders transport messages deterministically and skips replay duplicates", async () => {
    const client = new InMemoryTransportClient();
    await client.connect(["workflow_updates"]);
    const first = createTransportMessage({
      type: "timeline_update",
      channel: "timeline",
      sequence: 2,
      replayKey: "replay-2",
      timestamp: "2026-05-10T09:00:02.000Z",
      payload: { kind: "timeline_update", eventId: "event-2", replayKey: "replay-2" },
    });
    const second = createTransportMessage({
      type: "timeline_update",
      channel: "timeline",
      sequence: 1,
      replayKey: "replay-1",
      timestamp: "2026-05-10T09:00:01.000Z",
      payload: { kind: "timeline_update", eventId: "event-1", replayKey: "replay-1" },
    });

    await publishTransportMessages(client, [first, second, second]);
    const history = await client.history();

    expect(history.map((message) => message.sequence)).toEqual([1, 2]);
  });

  it("handles heartbeat tracking and stale session cleanup", async () => {
    const client = new InMemoryTransportClient();
    await client.connect(["presence"]);
    const session = createOperationalSession({ sessionId: "s1", operatorId: "u1", operatorName: "Ops", role: "operations", now });

    await updateLivePresence(client, [session], now);
    const health = await client.health(new Date("2026-05-10T09:02:00.000Z"));
    const active = await cleanupStalePresence(client, now);

    expect(health.staleSessions).toBe(1);
    expect(active).toHaveLength(1);
  });

  it("synchronizes workflow patches from transport with replay safety", async () => {
    const runtime = await bootstrapRuntimeInfrastructure(dataset(), undefined, { now });
    const snapshot = createSharedOperationalSnapshot({ runtime, sessions: [], policies: defaultSynchronizationPolicies, now });
    const target = snapshot.workflows[0];
    const patch = createSynchronizationPatch({
      sessionId: "s1",
      entityKey: target.entityKey,
      proposedState: { status: "coordinating" },
      submittedAt: "2026-05-10T09:01:00.000Z",
      optimistic: true,
    });
    const message = messageFromPatch(patch, 1);

    const first = synchronizeFromTransport(snapshot, [message], now);
    const second = synchronizeFromTransport(first.snapshot, [message], now);

    expect(first.appliedPatches).toHaveLength(1);
    expect(first.snapshot.workflows.find((workflow) => workflow.entityKey === target.entityKey)?.status).toBe("coordinating");
    expect(second.skippedReplayKeys).toContain(patch.replayKey);
  });

  it("recovers transport state after reconnect and hydrates missed messages", async () => {
    const client = new InMemoryTransportClient();
    await client.connect(["timeline"]);
    const message = createTransportMessage({
      type: "timeline_update",
      channel: "timeline",
      sequence: 1,
      replayKey: "timeline-1",
      timestamp: now.toISOString(),
      payload: { kind: "timeline_update", eventId: "event-1", replayKey: "timeline-1" },
    });

    await client.publish(message);
    await client.disconnect();
    await client.connect(["timeline"]);
    const recovery = await recoverTransportState(client, { now, replayKeys: [] });
    const replayed = await recoverTransportState(client, { now, replayKeys: ["timeline-1"] });

    expect(recovery.recoveredMessages).toHaveLength(1);
    expect(replayed.recoveredMessages).toHaveLength(0);
    expect(recovery.replayKeys).toContain("timeline-1");
  });

  it("builds live propagation streams and runtime transport health", async () => {
    const result = await buildRealtimeTransportRuntime({ dataset: dataset(), now });
    const streams = buildOperationalStreams(result.messages, now);

    expect(result.health.status).toBe("connected");
    expect(result.messages.length).toBeGreaterThan(0);
    expect(streams.length).toBeGreaterThan(0);
    expect(result.recovery.replayKeys.length).toBeGreaterThan(0);
  });
});
