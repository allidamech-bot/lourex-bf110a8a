import { describe, expect, it } from "vitest";
import {
  canAdvanceShipmentStage,
  canConvertPurchaseRequest,
  canTransitionPurchaseRequestStatus,
  getNextShipmentStageCode,
  isAssignedPartnerForDeal,
} from "@/domain/operations/guards";

describe("operations guards", () => {
  it("allows only safe purchase request review transitions", () => {
    expect(canTransitionPurchaseRequestStatus("intake_submitted", "under_review")).toBe(true);
    expect(canTransitionPurchaseRequestStatus("under_review", "ready_for_conversion")).toBe(true);
    expect(canTransitionPurchaseRequestStatus("in_progress", "under_review")).toBe(false);
  });

  it("requires a management role and ready status before conversion", () => {
    expect(
      canConvertPurchaseRequest({
        role: "operations_employee",
        status: "ready_for_conversion",
      }),
    ).toBe(true);
    expect(canConvertPurchaseRequest({ role: "turkish_partner", status: "ready_for_conversion" })).toBe(false);
    expect(canConvertPurchaseRequest({ role: "owner", status: "under_review" })).toBe(false);
    expect(
      canConvertPurchaseRequest({
        role: "owner",
        status: "ready_for_conversion",
        convertedDealNumber: "DL-2026-12345",
      }),
    ).toBe(false);
  });

  it("only allows shipment advancement to the immediate next stage", () => {
    expect(getNextShipmentStageCode("deal_accepted")).toBe("product_preparation");
    expect(
      canAdvanceShipmentStage({
        role: "operations_employee",
        currentStage: "deal_accepted",
        nextStage: "product_preparation",
      }),
    ).toBe(true);
    expect(
      canAdvanceShipmentStage({
        role: "operations_employee",
        currentStage: "deal_accepted",
        nextStage: "at_origin_port",
      }),
    ).toBe(false);
  });

  it("limits Saudi partner tracking updates to destination-side stages", () => {
    expect(
      canAdvanceShipmentStage({
        role: "saudi_partner",
        currentStage: "transit_to_destination",
        nextStage: "arrived_destination",
      }),
    ).toBe(true);
    expect(
      canAdvanceShipmentStage({
        role: "saudi_partner",
        currentStage: "deal_accepted",
        nextStage: "product_preparation",
      }),
    ).toBe(false);
  });

  it("limits Turkish partner tracking updates to source-side stages", () => {
    expect(
      canAdvanceShipmentStage({
        role: "turkish_partner",
        currentStage: "deal_accepted",
        nextStage: "product_preparation",
      }),
    ).toBe(true);
    expect(
      canAdvanceShipmentStage({
        role: "turkish_partner",
        currentStage: "left_origin_country",
        nextStage: "transit_to_destination",
      }),
    ).toBe(false);
  });

  it("requires partner assignment before allowing partner-scoped deal access", () => {
    expect(
      isAssignedPartnerForDeal({
        role: "turkish_partner",
        profileId: "turkish-1",
        turkishPartnerId: "turkish-1",
      }),
    ).toBe(true);
    expect(
      isAssignedPartnerForDeal({
        role: "saudi_partner",
        profileId: "saudi-1",
        saudiPartnerId: "saudi-2",
      }),
    ).toBe(false);
    expect(
      isAssignedPartnerForDeal({
        role: "operations_employee",
        profileId: "ops-1",
      }),
    ).toBe(true);
  });
});
