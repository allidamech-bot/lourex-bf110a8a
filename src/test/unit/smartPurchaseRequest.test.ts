import { describe, expect, it } from "vitest";
import {
  analyzeSmartPurchaseRequest,
  buildSupplierBriefDraft,
  mapRequestWorkflowStatus,
} from "@/features/purchase-requests/lib/smartRequest";
import type { PurchaseRequest } from "@/types/lourex";

const buildRequest = (overrides: Partial<PurchaseRequest> = {}): PurchaseRequest => ({
  id: "request-1",
  requestNumber: "PR-2026-001",
  status: "under_review",
  customer: {
    id: "customer-1",
    fullName: "Demo Customer",
    phone: "+966500000000",
    email: "customer@example.com",
    country: "Saudi Arabia",
    city: "Riyadh",
  },
  productName: "Industrial pump",
  productDescription: "Industrial water pump for a commercial facility with documented usage requirements.",
  quantity: 25,
  sizeDimensions: "120x80x45 cm",
  color: "Black",
  material: "Steel",
  technicalSpecs: "220V, corrosion-resistant steel body, replacement filters, installation kit.",
  referenceLink: "https://example.com/pump",
  preferredShippingMethod: "Sea",
  deliveryNotes: "Export packaging required with reinforced pallet protection.",
  imageUrls: ["https://example.com/pump.jpg"],
  createdAt: "2026-05-09T10:00:00.000Z",
  reviewedAt: null,
  attachments: [],
  isReadyMade: true,
  hasPreviousSample: true,
  destination: "Saudi Arabia",
  isFullSourcing: true,
  trackingCode: "TRK-1",
  ...overrides,
});

describe("smart purchase request analysis", () => {
  it("scores complete requests as ready with low operational signals", () => {
    const analysis = analyzeSmartPurchaseRequest(buildRequest());

    expect(analysis.readinessScore).toBeGreaterThanOrEqual(85);
    expect(analysis.completenessScore).toBeGreaterThanOrEqual(85);
    expect(analysis.sourcingDifficulty).toBe("low");
    expect(analysis.complianceRisk).toBe("low");
    expect(analysis.missingInformation).toEqual([]);
  });

  it("flags vague RFQs with structured missing information", () => {
    const analysis = analyzeSmartPurchaseRequest(
      buildRequest({
        productDescription: "Need this item",
        quantity: 0,
        sizeDimensions: "",
        technicalSpecs: "",
        preferredShippingMethod: "",
        deliveryNotes: "",
        imageUrls: [],
        attachments: [],
        destination: "",
        customer: {
          ...buildRequest().customer,
          country: "",
        },
      }),
    );

    expect(analysis.readinessScore).toBeLessThan(50);
    expect(analysis.sourcingDifficulty).toBe("high");
    expect(analysis.missingInformation).toContain("missing_specifications");
    expect(analysis.missingInformation).toContain("missing_images");
    expect(analysis.missingInformation).toContain("missing_target_quantity");
    expect(analysis.missingInformation).toContain("missing_shipping_method");
  });

  it("maps database-safe statuses into Smart Request workflow labels", () => {
    expect(mapRequestWorkflowStatus(buildRequest({ status: "awaiting_clarification" }))).toBe(
      "clarification_requested",
    );
    expect(mapRequestWorkflowStatus(buildRequest({ status: "ready_for_conversion" }))).toBe("ready_for_sourcing");
    expect(mapRequestWorkflowStatus(buildRequest({ status: "in_progress" }))).toBe("quotation_in_progress");
  });

  it("generates supplier brief drafts without mutating the request", () => {
    const request = buildRequest();
    const brief = buildSupplierBriefDraft(request, "en");

    expect(brief).toContain("Supplier brief");
    expect(brief).toContain(request.requestNumber);
    expect(request.status).toBe("under_review");
  });
});
