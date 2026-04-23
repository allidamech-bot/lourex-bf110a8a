import { describe, expect, it } from "vitest";
import { getCustomerFinancialSummaryCopy, getCustomerRequestStatusCopy } from "@/lib/customerExperience";

describe("customer experience helpers", () => {
  it("returns consistent customer request status guidance", () => {
    const copy = getCustomerRequestStatusCopy("awaiting_clarification", "en");

    expect(copy.label).toBe("Awaiting clarification");
    expect(copy.description).toContain("details");
    expect(copy.nextStep).toContain("contact channels");
  });

  it("explains mixed-currency financial summaries clearly", () => {
    const copy = getCustomerFinancialSummaryCopy("en", {
      hasMixedCurrencies: true,
      dealsCount: 2,
    });

    expect(copy).toContain("more than one currency");
    expect(copy).toContain("operational summary");
  });
});
