import { describe, expect, it } from "vitest";
import { buildAccountingEntriesCsv, buildReportCsv, filterDeals, filterFinancialEditRequests, filterShipments } from "@/lib/adminOperations";

describe("admin operations helpers", () => {
  it("filters deals by high-value operator fields", () => {
    const rows = [
      { id: "1", dealNumber: "DL-100", customerName: "Acme", operationTitle: "Steel order", accountingReference: "", requestNumber: "RQ-1", trackingId: "TRK-1" },
      { id: "2", dealNumber: "DL-200", customerName: "Bravo", operationTitle: "Food cargo", accountingReference: "ACC-22", requestNumber: "RQ-2", trackingId: "TRK-2" },
    ] as never[];

    expect(filterDeals(rows, "acc-22")).toHaveLength(1);
    expect(filterDeals(rows, "acme")).toHaveLength(1);
  });

  it("filters shipments and edit requests consistently", () => {
    expect(
      filterShipments([{ trackingId: "TRK-1", dealNumber: "DL-1", clientName: "Acme", destination: "Riyadh", stage: "delivered" }] as never[], "riyadh"),
    ).toHaveLength(1);

    expect(
      filterFinancialEditRequests(
        [{ requestedBy: "Mona", requestedByEmail: "mona@example.com", dealNumber: "DL-1", targetEntryNumber: "FE-1", reason: "Amount correction", status: "pending" }] as never[],
        "amount",
        "pending",
      ),
    ).toHaveLength(1);
  });

  it("builds csv exports for reports and accounting entries", () => {
    const reportLabels = {
      metric: "Metric",
      value: "Value",
      requests: "Requests",
      deals: "Deals",
      shipments: "Shipments",
      customers: "Customers",
      income: "Income",
      expense: "Expense",
      lockedEntries: "Locked entries",
      pendingEditRequests: "Pending Edit Requests",
      topCustomer: "Top Customer",
      outstandingBalance: "Outstanding Balance"
    };
    const reportCsv = buildReportCsv({
      summary: { requests: 1, deals: 2, shipments: 3, customers: 4, audits: 5, linkedEntries: 6, lockedEntries: 7, pendingEditRequests: 8, income: 100, expense: 40, averageOperationValue: 50, inTransit: 1, destination: 1, delivered: 1 },
      operations: { activeDeals: 2, dealsByStage: {}, averageProcessingTimeDays: 5 },
      financialSummary: { totalIncome: 100, totalExpense: 40, netProfit: 60, trends: [], byDate: [] },
      topCustomers: [{ fullName: "Acme", outstandingBalance: 200, pendingEditRequests: 1 }] as never[],
      topExpenseCategories: [],
    }, reportLabels);

    const accountingLabels = {
      entryNumber: "Entry Number",
      scope: "Scope",
      deal: "Deal",
      customer: "Customer",
      type: "Type",
      amount: "Amount",
      currency: "Currency",
      category: "Category",
      counterparty: "Counterparty",
      date: "Date"
    };
    const accountingCsv = buildAccountingEntriesCsv([
      { entryNumber: "FE-1", scope: "deal", dealNumber: "DL-1", customerName: "Acme", type: "income", amount: 100, currency: "SAR", category: "Payment", counterparty: "Acme", entryDate: "2026-01-01" },
    ] as never[], accountingLabels);

    expect(reportCsv).toContain("Locked entries,7");
    expect(reportCsv).toContain("Acme,200,1");
    expect(accountingCsv).toContain("FE-1,deal,DL-1,Acme,income,100,SAR");
  });
});
