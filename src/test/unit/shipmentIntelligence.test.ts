import { describe, expect, it } from "vitest";
import {
  analyzeShipmentIntelligence,
  buildCustomerSafeShipmentView,
  deriveShipmentDocumentChecklist,
  deriveShipmentRiskFlags,
} from "@/features/shipments/lib/shipmentIntelligence";
import type { OperationalShipment } from "@/lib/operationsDomain";

const baseShipment = (overrides: Partial<OperationalShipment> = {}): OperationalShipment => ({
  id: "shipment-1",
  trackingId: "TRK-100",
  clientName: "Acme",
  destination: "Riyadh",
  pallets: 2,
  weight: 400,
  dealId: "deal-1",
  dealNumber: "DL-100",
  requestNumber: "RFQ-100",
  stage: "in_transit",
  updatedAt: "2026-05-08T09:00:00.000Z",
  customerVisibleNote: "Shipment is in transit.",
  timeline: [
    {
      id: "update-1",
      shipmentId: "shipment-1",
      dealId: "deal-1",
      stageCode: "in_transit",
      previousStageCode: "departed_turkey",
      note: "Shipment departed Turkey.",
      customerNote: "Shipment is in transit.",
      visibility: "customer_visible",
      occurredAt: "2026-05-08T09:00:00.000Z",
      createdAt: "2026-05-08T09:05:00.000Z",
    },
  ],
  shipmentEvents: [],
  ...overrides,
});

describe("shipment intelligence", () => {
  const now = new Date("2026-05-09T09:00:00.000Z");

  it("classifies a recently updated preparation shipment with customer-visible notes as on track", () => {
    const analysis = analyzeShipmentIntelligence(baseShipment({ stage: "factory" }), now);

    expect(analysis.healthState).toBe("on_track");
    expect(analysis.riskFlags).not.toContain("missing_required_documents");
    expect(analysis.riskFlags).not.toContain("stale_stage");
  });

  it("detects stale and delayed active shipments", () => {
    const shipment = baseShipment({
      updatedAt: "2026-04-20T09:00:00.000Z",
      timeline: [],
      shipmentEvents: [],
      customerVisibleNote: "",
    });

    const flags = deriveShipmentRiskFlags(shipment, now);
    const analysis = analyzeShipmentIntelligence(shipment, now);

    expect(flags).toContain("stale_stage");
    expect(flags).toContain("active_without_recent_update");
    expect(flags).toContain("missing_customer_visible_update");
    expect(analysis.healthState).toBe("delayed");
  });

  it("prioritizes customs risk for stale customs-clearance shipments", () => {
    const analysis = analyzeShipmentIntelligence(
      baseShipment({
        stage: "customs_clearance",
        updatedAt: "2026-05-04T09:00:00.000Z",
        timeline: [],
        customerVisibleNote: "Customs review is in progress.",
      }),
      now,
    );

    expect(analysis.riskFlags).toContain("customs_stage_attention");
    expect(analysis.healthState).toBe("customs_risk");
  });

  it("derives document checklist requirements by stage", () => {
    const checklist = deriveShipmentDocumentChecklist(baseShipment({ stage: "delivered" }));

    expect(checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "commercial_invoice", importance: "required", status: "missing" }),
        expect.objectContaining({ key: "proof_of_delivery", importance: "required", status: "missing" }),
      ]),
    );
  });

  it("keeps customer-safe shipment view separate from internal risk flags", () => {
    const shipment = baseShipment({
      updatedAt: "2026-04-20T09:00:00.000Z",
      customerVisibleNote: "",
      timeline: [],
    });
    const view = buildCustomerSafeShipmentView(shipment, analyzeShipmentIntelligence(shipment, now));

    expect(view).toEqual({
      trackingId: "TRK-100",
      stage: "in_transit",
      customerVisibleNote: "",
      nextStepKey: "transit",
      healthState: "delayed",
    });
    expect("riskFlags" in view).toBe(false);
  });
});
