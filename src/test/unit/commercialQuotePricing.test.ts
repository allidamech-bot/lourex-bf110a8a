import { describe, expect, it } from "vitest";
import { quotePricingPreview } from "@/features/commercial-quotes/components/CommercialQuotePricingEditor";
import {
  validateQuotePricingInput,
  type CommercialQuoteDraft,
  type CommercialQuotePricingInput,
} from "@/features/commercial-quotes/services/commercialQuoteDraftService";

const draft: CommercialQuoteDraft = {
  id: "00000000-0000-4000-8000-000000000100",
  number: "LQ-2026-ABC",
  versionNo: 1,
  requestId: "00000000-0000-4000-8000-000000000200",
  customerId: "00000000-0000-4000-8000-000000000300",
  currency: "USD", status: "draft", approvedAt: null, issuedAt: null, customerResponseNote: "",
  paymentTerms: "", deliveryTerms: "", incoterm: "", leadTime: "",
  validityDays: 30, shippingCost: 0, discountAmount: 0, internalNotes: "", createdAt: "",
  items: [
    { id: "a", lineNumber: 1, name: "Oil", quantity: 100, unit: "cartons",
      specifications: "", moq: "", packaging: "", origin: "", unitPrice: null },
    { id: "b", lineNumber: 2, name: "Biscuits", quantity: 50, unit: "boxes",
      specifications: "", moq: "", packaging: "", origin: "", unitPrice: null },
  ],
};
const prices: CommercialQuotePricingInput = {
  currency: "EUR", paymentTerms: "50% advance", deliveryTerms: "CIF destination",
  incoterm: "CIF", leadTime: "4–6 weeks", validityDays: 30,
  shippingCost: "50", discountAmount: "12.50", internalNotes: "",
  lines: [{ itemId: "a", unitPrice: "12.5000" }, { itemId: "b", unitPrice: "3.25" }],
};

describe("Commercial quote pricing draft", () => {
  it("accurately calculates a multi-item subtotal and total", () => {
    expect(quotePricingPreview(draft, prices)).toEqual({ subtotal: "1412.50", total: "1450.00" });
  });
  it("supports 4 decimal unit prices without floating-point drift", () => {
    const withFraction = {
      ...draft, items: [{ ...draft.items[0], quantity: 3 }],
    };
    const input = { ...prices, lines: [{ itemId: "a", unitPrice: "0.3333" }] };
    expect(quotePricingPreview(withFraction, { ...input, shippingCost: "0", discountAmount: "0" }))
      .toEqual({ subtotal: "1.00", total: "1.00" });
  });
  it("will not present totals for an incomplete commercial quote", () => {
    expect(quotePricingPreview(draft, { ...prices, lines: [{ itemId: "a", unitPrice: "12" }, { itemId: "b", unitPrice: "" }] })).toBeNull();
  });
  it("validates exact quote IDs, currency and price precision", () => {
    const payload = validateQuotePricingInput(draft, prices);
    expect(payload.p_line_prices).toEqual([{ item_id: "a", unit_price: 12.5 }, { item_id: "b", unit_price: 3.25 }]);
    expect(payload.p_currency).toBe("EUR");
    expect(() => validateQuotePricingInput(draft, { ...prices, currency: "BTC" })).toThrow();
    expect(() => validateQuotePricingInput(draft, { ...prices, lines: [{ itemId: "a", unitPrice: "1.12345" }, { itemId: "b", unitPrice: "3" }] })).toThrow();
    expect(() => validateQuotePricingInput(draft, { ...prices, lines: [{ itemId: "a", unitPrice: "12" }, { itemId: "a", unitPrice: "12" }] })).toThrow();
    expect(() => validateQuotePricingInput(draft, { ...prices, discountAmount: "-1" })).toThrow();
  });
});
