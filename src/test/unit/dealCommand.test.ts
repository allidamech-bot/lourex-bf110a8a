import { describe, expect, it } from "vitest";
import {
  analyzeDealHealth,
  buildDealTimeline,
  deriveDealRiskFlags,
} from "@/features/deals/lib/dealCommand";
import type { OperationsDeal } from "@/domain/operations/types";

const buildDeal = (overrides: Partial<OperationsDeal> = {}): OperationsDeal => ({
  id: "deal-1",
  dealNumber: "DL-2026-001",
  operationTitle: "Industrial pump sourcing",
  customerId: "customer-1",
  customerName: "Demo Customer",
  customerEmail: "customer@example.com",
  customerPhone: "+966500000000",
  sourceRequestId: "request-1",
  requestNumber: "PR-2026-001",
  status: "in_progress",
  operationalStatus: "sourcing",
  stage: "received_turkey",
  shipmentId: "shipment-1",
  trackingId: "TRK-1",
  accountingReference: "ACC-DL-2026-001",
  originCountry: "Turkey",
  destinationCountry: "Saudi Arabia",
  totalValue: 10000,
  currency: "SAR",
  createdAt: "2026-05-01T10:00:00.000Z",
  notes: "Operational notes",
  attachments: [],
  trackingUpdates: [
    {
      id: "tracking-1",
      shipmentId: "shipment-1",
      dealId: "deal-1",
      stageCode: "received_turkey",
      previousStageCode: "factory",
      note: "Received in Turkey.",
      customerNote: "Shipment preparation has started.",
      visibility: "customer_visible",
      occurredAt: "2026-05-08T10:00:00.000Z",
      createdAt: "2026-05-08T10:00:00.000Z",
    },
  ],
  turkishPartnerId: "turkish-1",
  turkishPartnerName: "Turkish Partner",
  saudiPartnerId: "saudi-1",
  saudiPartnerName: "Saudi Partner",
  accountingSummary: {
    income: 12000,
    expense: 8000,
    net: 4000,
    entriesCount: 2,
  },
  ...overrides,
});

describe("deal command center analysis", () => {
  it("classifies complete active deals as healthy", () => {
    const analysis = analyzeDealHealth(buildDeal(), new Date("2026-05-09T10:00:00.000Z"));

    expect(analysis.state).toBe("healthy");
    expect(analysis.score).toBe(100);
    expect(analysis.riskFlags).toEqual([]);
  });

  it("flags converted deals without shipment progress as blocked", () => {
    const deal = buildDeal({
      shipmentId: null,
      trackingId: "",
      stage: "factory",
      trackingUpdates: [],
      operationalStatus: "awaiting_assignment",
      turkishPartnerId: null,
      saudiPartnerId: null,
      accountingSummary: {
        income: 0,
        expense: 0,
        net: 0,
        entriesCount: 0,
      },
    });
    const analysis = analyzeDealHealth(deal, new Date("2026-05-10T10:00:00.000Z"));

    expect(analysis.state).toBe("blocked");
    expect(analysis.riskFlags).toContain("no_linked_shipment");
    expect(analysis.riskFlags).toContain("missing_turkish_partner");
    expect(analysis.riskFlags).toContain("missing_financial_entries");
  });

  it("detects stale shipment and customer waiting risk", () => {
    const flags = deriveDealRiskFlags(
      buildDeal({
        trackingUpdates: [
          {
            ...buildDeal().trackingUpdates[0],
            visibility: "internal",
            customerNote: "",
            occurredAt: "2026-05-01T10:00:00.000Z",
            createdAt: "2026-05-01T10:00:00.000Z",
          },
        ],
      }),
      new Date("2026-05-09T10:00:00.000Z"),
    );

    expect(flags).toContain("stale_shipment");
    expect(flags).toContain("customer_waiting_for_update");
  });

  it("derives a lightweight operational timeline", () => {
    const timeline = buildDealTimeline(buildDeal());

    expect(timeline.find((event) => event.key === "deal_created")?.active).toBe(true);
    expect(timeline.find((event) => event.key === "shipment_created")?.active).toBe(true);
    expect(timeline.find((event) => event.key === "closed")?.active).toBe(false);
  });
});
