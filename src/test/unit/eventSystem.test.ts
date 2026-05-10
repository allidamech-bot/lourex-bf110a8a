import { describe, expect, it } from "vitest";
import { buildEventTimeline } from "@/features/event-system/events/eventTimeline";
import { buildOperationalEvents, createOperationalEvent } from "@/features/event-system/events/operationalEvents";
import { dedupeQueuedEvents, queueOperationalEvents } from "@/features/event-system/pipeline/eventBus";
import { processEventPipeline } from "@/features/event-system/pipeline/eventPipeline";
import { routeNotifications } from "@/features/event-system/notifications/notificationRouter";
import { evaluateRealtimeSignals } from "@/features/event-system/realtime/realtimeSignals";
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

describe("event system", () => {
  it("creates replay-safe operational events from workflow intelligence", () => {
    const events = buildOperationalEvents(dataset());

    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.advisoryOnly)).toBe(true);
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining([
      "shipment_delay",
      "finance_alert",
      "escalation_trigger",
      "ai_recommendation",
    ]));
    expect(events[0].dedupeKey).toContain(events[0].type);
    expect(events[0].replayKey).toContain(events[0].occurredAt);
  });

  it("deduplicates and prioritizes queued events deterministically", () => {
    const first = createOperationalEvent({
      id: "event-1",
      type: "finance_alert",
      severity: "critical",
      createdAt: now.toISOString(),
      occurredAt: now.toISOString(),
      entity: { entityType: "deal", entityId: "deal-1", label: "DL-1" },
      sourceModule: "event_system",
      title: "Finance alert",
      summary: "Review exposure",
      metadata: { financialExposure: 90_000 },
    });
    const duplicate = { ...first, id: "event-2" };
    const low = createOperationalEvent({
      id: "event-3",
      type: "shipment_update",
      severity: "low",
      createdAt: now.toISOString(),
      occurredAt: now.toISOString(),
      entity: { entityType: "shipment", entityId: "shipment-1", label: "TRK-1" },
      sourceModule: "event_system",
      title: "Shipment update",
      summary: "Informational update",
      metadata: {},
    });

    const queue = queueOperationalEvents([low, duplicate, first], now);
    const deduped = dedupeQueuedEvents(queue);

    expect(queue[0].event.type).toBe("finance_alert");
    expect(deduped).toHaveLength(2);
    expect(deduped[0].priority).toBeGreaterThan(deduped[1].priority);
  });

  it("routes notifications to operational audiences with customer recommendations only", () => {
    const customerEvent = createOperationalEvent({
      id: "event-customer",
      type: "customer_operational_event",
      severity: "high",
      createdAt: now.toISOString(),
      occurredAt: now.toISOString(),
      entity: { entityType: "customer", entityId: "customer-1", label: "Customer A" },
      sourceModule: "event_system",
      title: "Customer issue",
      summary: "Coordinate follow-up",
      metadata: {},
    });

    const routes = routeNotifications([customerEvent]);

    expect(routes.map((route) => route.audience)).toEqual(expect.arrayContaining(["operations", "customers"]));
    expect(routes.find((route) => route.audience === "customers")?.recommendationOnly).toBe(true);
    expect(routes[0].priority).toBe("urgent");
  });

  it("processes replay-safe pipeline records and propagates escalation signals", () => {
    const firstRun = processEventPipeline(dataset(), { now });
    const secondRun = processEventPipeline(dataset(), {
      now,
      previouslyProcessedReplayKeys: firstRun.processedEvents.map((event) => event.replayKey),
    });

    expect(firstRun.processedEvents.length).toBeGreaterThan(0);
    expect(firstRun.notifications.length).toBeGreaterThan(0);
    expect(firstRun.realtimeSignals.map((signal) => signal.type)).toEqual(expect.arrayContaining([
      "unresolved_escalations",
      "finance_risk_spike",
    ]));
    expect(secondRun.processedEvents).toHaveLength(0);
    expect(secondRun.processingRecords.every((record) => record.status === "replayed")).toBe(true);
  });

  it("evaluates realtime signals and timeline ordering from processed events", () => {
    const events = buildOperationalEvents(dataset());
    const signals = evaluateRealtimeSignals(events, now);
    const timeline = buildEventTimeline(events);

    expect(signals.length).toBeGreaterThan(0);
    expect(signals.some((signal) => signal.severity === "critical")).toBe(true);
    expect(timeline[0].occurredAt >= timeline[timeline.length - 1].occurredAt).toBe(true);
  });
});
