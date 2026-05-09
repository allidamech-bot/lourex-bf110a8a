import { describe, expect, it } from "vitest";
import {
  analyzeFinancialRisk,
  buildFinanceAuditCsv,
  getImmutableAccountingStatus,
  prepareFinanceAuditExportRows,
  summarizeSettlementVisibility,
} from "@/features/accounting/lib/financeAuditPro";
import type { FinancialEditRequest, FinancialEntry, PartnerSettlement } from "@/types/lourex";

const entry = (overrides: Partial<FinancialEntry> = {}): FinancialEntry => ({
  id: "entry-1",
  entryNumber: "FE-1",
  scope: "deal",
  relationType: "deal_linked",
  dealId: "deal-1",
  dealNumber: "DL-1",
  customerId: "customer-1",
  customerName: "Customer",
  type: "income",
  amount: 1000,
  currency: "SAR",
  locked: true,
  createdBy: "user-1",
  createdAt: "2026-05-01T10:00:00.000Z",
  entryDate: "2026-05-01",
  method: "Bank",
  counterparty: "Customer",
  category: "Payment",
  referenceLabel: "REF-1",
  note: "Initial payment",
  ...overrides,
});

const editRequest = (overrides: Partial<FinancialEditRequest> = {}): FinancialEditRequest => ({
  id: "edit-1",
  financialEntryId: "entry-1",
  targetEntryNumber: "FE-1",
  requestedBy: "Ops",
  reason: "Correct amount",
  status: "pending",
  submittedAt: "2026-05-02T10:00:00.000Z",
  oldValue: {},
  proposedValue: { amount: 900 },
  ...overrides,
});

const settlement = (overrides: Partial<PartnerSettlement> = {}): PartnerSettlement => ({
  id: "settlement-1",
  partnerId: "partner-1",
  partnerName: "Partner",
  partnerRole: "turkish_partner",
  settlementPeriod: "2026-05",
  grossAmount: 1000,
  partnerCommission: 50,
  expenses: 100,
  netDue: 150,
  status: "pending_review",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  ...overrides,
});

describe("finance audit pro", () => {
  it("classifies pending corrections and immutable status", () => {
    const analysis = analyzeFinancialRisk([entry()], [editRequest()]);

    expect(analysis.state).toBe("pending_correction");
    expect(analysis.riskFlags).toContain("pending_edit_request");
    expect(getImmutableAccountingStatus(entry(), 1)).toBe("correction_required");
  });

  it("detects missing references, duplicate-like entries, and negative balances", () => {
    const first = entry({
      id: "entry-1",
      entryNumber: "FE-1",
      scope: "deal",
      relationType: "deal_linked",
      dealId: undefined,
      dealNumber: undefined,
      type: "expense",
      amount: 75_000,
    });
    const second = entry({
      id: "entry-2",
      entryNumber: "FE-2",
      scope: "deal",
      relationType: "deal_linked",
      dealId: undefined,
      dealNumber: undefined,
      type: "expense",
      amount: 75_000,
    });
    const analysis = analyzeFinancialRisk([first, second], []);

    expect(analysis.riskFlags).toEqual(expect.arrayContaining([
      "missing_deal_reference",
      "negative_operational_balance",
      "unusually_large_balance",
      "possible_duplicate_entry",
    ]));
    expect(analysis.duplicateGroups).toHaveLength(1);
  });

  it("summarizes settlement visibility", () => {
    const summary = summarizeSettlementVisibility([
      settlement(),
      settlement({ id: "settlement-2", status: "approved", netDue: 200, partnerRole: "saudi_partner" }),
      settlement({ id: "settlement-3", status: "paid", netDue: 300 }),
    ]);

    expect(summary.state).toBe("awaiting_payment");
    expect(summary.pendingCount).toBe(1);
    expect(summary.approvedUnpaidCount).toBe(1);
    expect(summary.paidTotal).toBe(300);
    expect(summary.roleBreakdown.saudi_partner).toBe(200);
  });

  it("prepares audit export rows and CSV", () => {
    const rows = prepareFinanceAuditExportRows([entry()], [editRequest()]);
    const csv = buildFinanceAuditCsv(rows);

    expect(rows[0]).toMatchObject({
      entryNumber: "FE-1",
      status: "correction_required",
      riskFlags: "pending_edit_request",
    });
    expect(csv).toContain("entry_number,deal_number,customer_name,immutable_status");
    expect(csv).toContain('"FE-1"');
  });
});
