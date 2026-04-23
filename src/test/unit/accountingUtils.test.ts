import { describe, expect, it } from "vitest";
import {
  buildCustomerFinancialSummary,
  hasMeaningfulFinancialEditChange,
  sanitizeFinancialEditProposal,
  summarizeFinancialEntries,
  validateFinancialEntryInput,
} from "@/domain/accounting/utils";

describe("accounting utils", () => {
  it("validates required financial entry fields and scope rules", () => {
    expect(
      validateFinancialEntryInput({
        scope: "global",
        amount: 1500,
        currency: "sar",
        note: "Customer payment",
        method: "Bank transfer",
        counterparty: "Customer",
        category: "Payment",
        entryDate: "2026-04-23",
      }),
    ).toBeNull();

    expect(
      validateFinancialEntryInput({
        scope: "deal_linked",
        amount: 1500,
        currency: "SAR",
        note: "Customer payment",
        method: "Bank transfer",
        counterparty: "Customer",
        category: "Payment",
        entryDate: "2026-04-23",
      }),
    ).toContain("linked deal");

    expect(
      validateFinancialEntryInput({
        scope: "global",
        dealId: "deal-1",
        amount: 1500,
        currency: "SAR",
        note: "Customer payment",
        method: "Bank transfer",
        counterparty: "Customer",
        category: "Payment",
        entryDate: "2026-04-23",
      }),
    ).toContain("cannot include");
  });

  it("detects only meaningful financial edit proposals", () => {
    expect(
      hasMeaningfulFinancialEditChange(
        { amount: 100, method: "Transfer", category: "Shipping" },
        { amount: 100, method: " Transfer ", category: "Shipping" },
      ),
    ).toBe(false);

    expect(
      hasMeaningfulFinancialEditChange(
        { amount: 100, method: "Transfer", category: "Shipping" },
        { amount: 120, method: "Transfer", category: "Shipping" },
      ),
    ).toBe(true);
  });

  it("sanitizes edit proposals to allowed mutable fields", () => {
    expect(
      sanitizeFinancialEditProposal({
        amount: "500",
        method: " Bank ",
        locked: false,
        createdBy: "user-id",
      }),
    ).toEqual({
      amount: 500,
      method: "Bank",
    });
  });

  it("summarizes financial entries consistently", () => {
    expect(
      summarizeFinancialEntries([
        {
          id: "1",
          entryNumber: "FE-1",
          scope: "deal",
          relationType: "deal_linked",
          type: "income",
          amount: 1000,
          currency: "SAR",
          locked: true,
          createdBy: "u1",
          createdAt: "2026-04-20",
          entryDate: "2026-04-20",
          method: "Bank",
          counterparty: "Customer",
          category: "Payment",
          note: "Deposit",
        },
        {
          id: "2",
          entryNumber: "FE-2",
          scope: "customer",
          relationType: "customer_linked",
          type: "expense",
          amount: 250,
          currency: "SAR",
          locked: true,
          createdBy: "u1",
          createdAt: "2026-04-21",
          entryDate: "2026-04-21",
          method: "Cash",
          counterparty: "Supplier",
          category: "Logistics",
          note: "Handling",
        },
      ]),
    ).toMatchObject({
      count: 2,
      lockedCount: 2,
      income: 1000,
      expense: 250,
      net: 750,
      dealCount: 1,
      customerCount: 1,
    });
  });

  it("builds customer summaries from direct and deal-linked financial entries", () => {
    const summary = buildCustomerFinancialSummary(
      {
        id: "customer-1",
        fullName: "Acme",
        phone: "",
        email: "acme@example.com",
        country: "",
        city: "",
        requestsCount: 0,
        dealsCount: 1,
        financialEntriesCount: 0,
        financialIncome: 0,
        financialExpense: 0,
        financialBalance: 0,
        auditCount: 0,
      },
      [{ id: "deal-1", customerId: "customer-1" }],
      [{ id: "req-1", createdAt: "2026-04-21", customer: { id: "customer-1" } as never }],
      [
        {
          id: "1",
          entryNumber: "FE-1",
          scope: "deal",
          relationType: "deal_linked",
          dealId: "deal-1",
          type: "income",
          amount: 1000,
          currency: "SAR",
          locked: true,
          createdBy: "u1",
          createdAt: "2026-04-20",
          entryDate: "2026-04-20",
          method: "Bank",
          counterparty: "Customer",
          category: "Payment",
          note: "Deposit",
        },
      ],
      [{ dealId: "deal-1", status: "pending" }],
    );

    expect(summary.financialIncome).toBe(1000);
    expect(summary.financialExpense).toBe(0);
    expect(summary.financialBalance).toBe(1000);
    expect(summary.pendingEditRequests).toBe(1);
  });
});
