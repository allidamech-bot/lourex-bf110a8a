import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPredictiveIntelligence } from "./predictiveEngine";

describe("buildPredictiveIntelligence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-24T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("surfaces high-priority operational signals from incomplete requests, stale shipments, and finance edits", () => {
    const result = buildPredictiveIntelligence(
      {
        requests: [
          {
            id: "request-1",
            requestNumber: "REQ-001",
            status: "awaiting_clarification",
            createdAt: "2026-05-18T00:00:00.000Z",
            productName: "Industrial pump",
            quantity: 0,
            customer: { fullName: "Customer One", email: "customer@example.com" },
          },
          {
            id: "request-2",
            requestNumber: "REQ-002",
            status: "ready_for_conversion",
            createdAt: "2026-05-20T00:00:00.000Z",
            productName: "Packaging line",
            productDescription: "Complete packaging line with conveyor and sealing unit",
            quantity: 2,
            destination: "Riyadh",
            technicalSpecs: "220V, stainless steel",
            referenceLink: "https://example.com/product",
            material: "steel",
            attachments: [{}],
            customer: { fullName: "Customer Two", email: "customer2@example.com" },
          },
        ],
        deals: [],
        shipments: [
          {
            id: "shipment-1",
            stage: "in_transit",
            updatedAt: "2026-05-10T00:00:00.000Z",
            timeline: [],
          },
        ],
        financialEditRequests: [
          { id: "edit-1", status: "pending", createdAt: "2026-05-22T00:00:00.000Z" },
          { id: "edit-2", status: "approved", createdAt: "2026-05-22T00:00:00.000Z" },
        ],
      },
      "en",
    );

    expect(result.metrics.openRequests).toBe(2);
    expect(result.metrics.readyForConversion).toBe(1);
    expect(result.metrics.clarificationBacklog).toBe(1);
    expect(result.metrics.staleShipments).toBe(1);
    expect(result.metrics.pendingFinanceEdits).toBe(1);
    expect(result.signals.map((signal) => signal.id)).toEqual(
      expect.arrayContaining([
        "request-risk-request-1",
        "conversion-request-2",
        "shipment-stale-shipment-1",
        "finance-edit-backlog",
      ]),
    );
    expect(result.portfolioScore).toBeGreaterThanOrEqual(35);
    expect(result.nextActions.length).toBeGreaterThan(0);
  });

  it("returns a stable low-risk portfolio when there are no active signals", () => {
    const result = buildPredictiveIntelligence(
      {
        requests: [
          {
            id: "request-completed",
            requestNumber: "REQ-DONE",
            status: "completed",
            createdAt: "2026-05-21T00:00:00.000Z",
            productName: "Completed product",
            productDescription: "A complete product description for an already closed request",
            quantity: 5,
            destination: "Jeddah",
            technicalSpecs: "Detailed specs",
            referenceLink: "https://example.com/completed",
            brand: "Brand",
            attachments: [{}],
            customer: { fullName: "Completed Customer", email: "done@example.com" },
          },
        ],
        deals: [],
        shipments: [{ id: "shipment-delivered", stage: "delivered", updatedAt: "2026-05-23T00:00:00.000Z", timeline: [{}] }],
        financialEditRequests: [],
      },
      "ar",
    );

    expect(result.portfolioScore).toBe(12);
    expect(result.portfolioLevel).toBe("low");
    expect(result.signals).toHaveLength(0);
    expect(result.nextActions).toHaveLength(0);
    expect(result.summary).toContain("تم تحليل 0 طلب مفتوح");
  });
});
