import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardReportSnapshot } from "@/lib/reportsDomain";
import { buildExecutiveReportAdvisor } from "./executiveReportAdvisor";

const baseSnapshot: DashboardReportSnapshot = {
  summary: {
    requests: 0,
    deals: 0,
    shipments: 0,
    customers: 0,
    audits: 0,
    linkedEntries: 0,
    lockedEntries: 0,
    pendingEditRequests: 0,
    income: 0,
    expense: 0,
    averageOperationValue: 0,
    inTransit: 0,
    destination: 0,
    delivered: 0,
    currencyGroups: 1,
    partnerSettlementTotalDue: 0,
    partnerSettlementUnpaid: 0,
    partnerSettlementPaid: 0,
    partnerSettlementDisputed: 0,
    totalReceived: 0,
    outstandingBalance: 0,
    settlementCoverageRatio: 0,
    unpaidDeals: 0,
  },
  operations: {
    activeDeals: 0,
    dealsByStage: {},
    averageProcessingTimeDays: 0,
  },
  financialSummary: {
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    trends: [],
    byDate: [],
  },
  topCustomers: [],
  topExpenseCategories: [],
};

describe("buildExecutiveReportAdvisor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-24T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("surfaces executive risks and action items for financially exposed reports", () => {
    const result = buildExecutiveReportAdvisor(
      {
        ...baseSnapshot,
        summary: {
          ...baseSnapshot.summary,
          requests: 12,
          deals: 6,
          shipments: 4,
          customers: 3,
          income: 100_000,
          expense: 118_000,
          pendingEditRequests: 6,
          currencyGroups: 2,
          outstandingBalance: 46_000,
          settlementCoverageRatio: 0.42,
          partnerSettlementDisputed: 1,
          unpaidDeals: 3,
        },
        operations: {
          activeDeals: 5,
          dealsByStage: { sourcing: 2, shipping: 3 },
          averageProcessingTimeDays: 16,
        },
        topCustomers: [
          {
            customerId: "customer-1",
            fullName: "High Impact Customer",
            email: "customer@example.com",
            requestsCount: 5,
            dealsCount: 3,
            totalFinancialValue: 90_000,
            outstandingBalance: 35_000,
            activeDeals: 2,
            financialIncome: 60_000,
            financialExpense: 20_000,
            pendingEditRequests: 1,
            lastActivity: "2026-05-23T00:00:00.000Z",
          },
        ],
      },
      "en",
    );

    expect(result.generatedAt).toBe("2026-05-24T00:00:00.000Z");
    expect(result.executiveLevel).toBe("critical");
    expect(result.executiveScore).toBeGreaterThanOrEqual(85);
    expect(result.metrics.netProfit).toBe(-18_000);
    expect(result.metrics.collectionExposure).toBe(46_000);
    expect(result.risks.map((risk) => risk.id)).toEqual(
      expect.arrayContaining([
        "negative-net-result",
        "collection-exposure",
        "pending-finance-edits",
        "unpaid-deals",
        "disputed-settlements",
      ]),
    );
    expect(result.opportunities.map((item) => item.id)).toEqual(expect.arrayContaining(["active-deal-opportunity"]));
    expect(result.actionPlan.length).toBeGreaterThan(0);
  });

  it("returns stable Arabic briefing for a healthy report", () => {
    const result = buildExecutiveReportAdvisor(
      {
        ...baseSnapshot,
        summary: {
          ...baseSnapshot.summary,
          requests: 3,
          deals: 2,
          shipments: 2,
          customers: 2,
          income: 140_000,
          expense: 70_000,
          outstandingBalance: 0,
          settlementCoverageRatio: 1,
        },
        operations: {
          activeDeals: 0,
          dealsByStage: {},
          averageProcessingTimeDays: 3,
        },
      },
      "ar",
    );

    expect(result.executiveScore).toBe(0);
    expect(result.executiveLevel).toBe("stable");
    expect(result.metrics.netProfit).toBe(70_000);
    expect(result.highlights.map((item) => item.id)).toContain("positive-net-result");
    expect(result.risks).toHaveLength(0);
    expect(result.summary).toContain("تم تحليل 3 طلب");
  });
});
