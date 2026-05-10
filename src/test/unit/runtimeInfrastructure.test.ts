import { describe, expect, it } from "vitest";
import { processEventPipeline } from "@/features/event-system/pipeline/eventPipeline";
import { createNotificationQueue, markNotificationAcknowledged } from "@/features/runtime-infra/notifications/notificationQueue";
import { deliverNotificationQueue } from "@/features/runtime-infra/notifications/notificationDelivery";
import { getDeliveryPolicy } from "@/features/runtime-infra/notifications/deliveryPolicies";
import { InMemoryEventRepository } from "@/features/runtime-infra/repositories/eventRepository";
import { bootstrapRuntimeInfrastructure } from "@/features/runtime-infra/services/runtimeInfrastructureService";
import { restoreRuntimeState, buildRuntimeSnapshot } from "@/features/runtime-infra/services/runtimeRecovery";
import { persistPipelineEvents } from "@/features/runtime-infra/store/eventPersistence";
import { hydrateEventSnapshot } from "@/features/runtime-infra/store/eventSnapshots";
import { reconstructOperationalTimeline, queryOperationalHistory } from "@/features/runtime-infra/store/operationalHistory";
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
});

describe("runtime infrastructure", () => {
  it("persists immutable events and deduplicates replay keys", async () => {
    const repository = new InMemoryEventRepository();
    const pipeline = processEventPipeline(dataset(), { now });

    const firstSave = await persistPipelineEvents(repository, pipeline, now.toISOString());
    const secondSave = await persistPipelineEvents(repository, pipeline, now.toISOString());
    const snapshot = await hydrateEventSnapshot(repository);

    expect(firstSave.length).toBeGreaterThan(0);
    expect(secondSave).toHaveLength(firstSave.length);
    expect(snapshot.eventCount).toBe(firstSave.length);
    expect(firstSave.every((record) => record.immutable)).toBe(true);
  });

  it("restores timeline and entity-filtered operational history", async () => {
    const repository = new InMemoryEventRepository();
    const pipeline = processEventPipeline(dataset(), { now });
    await persistPipelineEvents(repository, pipeline, now.toISOString());

    const timeline = await reconstructOperationalTimeline(repository);
    const shipmentHistory = await queryOperationalHistory(repository, { entityType: "shipment" });
    const recovery = await restoreRuntimeState(repository, now.toISOString());

    expect(timeline.length).toBeGreaterThan(0);
    expect(shipmentHistory.every((record) => record.event.entity.entityType === "shipment")).toBe(true);
    expect(recovery.replayKeys).toHaveLength(recovery.snapshot.eventCount);
  });

  it("queues notifications by delivery priority and supports acknowledgement", () => {
    const pipeline = processEventPipeline(dataset(), { now });
    const queue = createNotificationQueue(pipeline.notifications, pipeline.processedEvents, now.toISOString());
    const acknowledged = markNotificationAcknowledged(queue[0], now.toISOString());

    expect(queue.length).toBeGreaterThan(0);
    expect(queue[0].priority).toBe("critical");
    expect(acknowledged.status).toBe("acknowledged");
    expect(acknowledged.acknowledgedAt).toBe(now.toISOString());
  });

  it("applies retry-safe delivery logic and channel policies", () => {
    const pipeline = processEventPipeline(dataset(), { now });
    const queue = createNotificationQueue(pipeline.notifications, pipeline.processedEvents, now.toISOString());
    const result = deliverNotificationQueue(queue.slice(0, 1), {
      now,
      failChannels: ["email_ready"],
    });
    const policy = getDeliveryPolicy(queue[0].priority);

    expect(policy.maxAttempts).toBeGreaterThan(1);
    expect(result.queue[0].attempts).toBe(1);
    expect(result.queue[0].status).toBe("retry_scheduled");
    expect(result.history.length).toBe(queue[0].channels.length);
  });

  it("bootstraps runtime recovery with replay-safe second run", async () => {
    const repository = new InMemoryEventRepository();
    const first = await bootstrapRuntimeInfrastructure(dataset(), repository, { now });
    const second = await bootstrapRuntimeInfrastructure(dataset(), repository, { now });
    const snapshot = await buildRuntimeSnapshot(repository, first.deliveryQueue, first.deliveryHistory);

    expect(first.persistedEvents.length).toBeGreaterThan(0);
    expect(first.deliveryHistory.length).toBeGreaterThan(0);
    expect(second.pipeline.processedEvents).toHaveLength(0);
    expect(second.recovery.snapshot.eventCount).toBe(first.recovery.snapshot.eventCount);
    expect(snapshot.eventSnapshot.eventCount).toBe(first.recovery.snapshot.eventCount);
  });
});
