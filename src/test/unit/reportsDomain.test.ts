import { describe, expect, it } from "vitest";
import { buildFinancialSummaryReport } from "@/lib/reportsDomain";

describe("reports domain", () => {
  it("builds consistent financial totals, daily rows, and monthly trends", () => {
    const report = buildFinancialSummaryReport([
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
        createdAt: "2026-04-20T10:00:00Z",
        entryDate: "2026-04-20T10:00:00Z",
        method: "Bank",
        counterparty: "Customer",
        category: "Payment",
        note: "Deposit",
      },
      {
        id: "2",
        entryNumber: "FE-2",
        scope: "deal",
        relationType: "deal_linked",
        type: "expense",
        amount: 200,
        currency: "SAR",
        locked: true,
        createdBy: "u1",
        createdAt: "2026-04-21T10:00:00Z",
        entryDate: "2026-04-21T10:00:00Z",
        method: "Cash",
        counterparty: "Carrier",
        category: "Shipping",
        note: "Transit fee",
      },
      {
        id: "3",
        entryNumber: "FE-3",
        scope: "global",
        relationType: "general",
        type: "income",
        amount: 300,
        currency: "SAR",
        locked: true,
        createdBy: "u1",
        createdAt: "2026-05-01T10:00:00Z",
        entryDate: "2026-05-01T10:00:00Z",
        method: "Bank",
        counterparty: "Partner",
        category: "Settlement",
        note: "Partner share",
      },
    ]);

    expect(report.totalIncome).toBe(1300);
    expect(report.totalExpense).toBe(200);
    expect(report.netProfit).toBe(1100);
    expect(report.byDate).toHaveLength(3);
    expect(report.trends).toEqual([
      { month: "2026-04", income: 1000, expense: 200, net: 800 },
      { month: "2026-05", income: 300, expense: 0, net: 300 },
    ]);
  });
});
