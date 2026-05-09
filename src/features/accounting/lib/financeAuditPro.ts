import type { FinancialEditRequest, FinancialEntry, PartnerSettlement } from "@/types/lourex";
import { normalizeFinancialCurrency, summarizeFinancialEntriesByCurrency } from "@/domain/accounting/utils";

export type FinancialRiskState =
  | "locked"
  | "under_review"
  | "pending_correction"
  | "financial_risk"
  | "inconsistent"
  | "missing_reference"
  | "awaiting_approval"
  | "customer_balance_attention"
  | "healthy";

export type FinancialRiskFlag =
  | "orphaned_entry"
  | "missing_deal_reference"
  | "missing_customer_reference"
  | "inconsistent_currency"
  | "unusually_large_balance"
  | "pending_edit_request"
  | "negative_operational_balance"
  | "possible_duplicate_entry"
  | "weak_audit_context"
  | "unlocked_entry";

export type ImmutableAccountingStatus = "locked" | "correction_required" | "open_needs_review";

export type FinancialRiskAnalysis = {
  state: FinancialRiskState;
  riskFlags: FinancialRiskFlag[];
  score: number;
  pendingEditRequests: number;
  duplicateGroups: Array<{ key: string; entryNumbers: string[] }>;
};

export type SettlementVisibilityState =
  | "ready_for_review"
  | "pending_settlement"
  | "awaiting_payment"
  | "paid"
  | "disputed"
  | "needs_attention";

export type SettlementVisibilitySummary = {
  state: SettlementVisibilityState;
  pendingCount: number;
  approvedUnpaidCount: number;
  disputedCount: number;
  totalDue: number;
  paidTotal: number;
  roleBreakdown: Record<string, number>;
};

export type FinanceAuditExportRow = {
  entryNumber: string;
  dealNumber: string;
  customerName: string;
  status: ImmutableAccountingStatus;
  riskFlags: string;
  type: FinancialEntry["type"];
  amount: number;
  currency: string;
  category: string;
  counterparty: string;
  entryDate: string;
  createdAt: string;
};

const LARGE_BALANCE_THRESHOLD = 50_000;

const hasText = (value?: string | null) => Boolean(value?.trim());

const hasPendingEditRequest = (entry: FinancialEntry, editRequests: FinancialEditRequest[]) =>
  editRequests.some((request) => request.financialEntryId === entry.id && request.status === "pending");

export const getImmutableAccountingStatus = (
  entry: Pick<FinancialEntry, "locked">,
  pendingEditRequests = 0,
): ImmutableAccountingStatus => {
  if (pendingEditRequests > 0) return "correction_required";
  return entry.locked ? "locked" : "open_needs_review";
};

export const detectPossibleDuplicateEntries = (entries: FinancialEntry[]) => {
  const groups = new Map<string, string[]>();

  entries.forEach((entry) => {
    const key = [
      entry.dealId || "global",
      entry.customerId || "no-customer",
      entry.type,
      entry.amount.toFixed(2),
      normalizeFinancialCurrency(entry.currency || ""),
      entry.entryDate,
      (entry.counterparty || "").trim().toLowerCase(),
      (entry.category || "").trim().toLowerCase(),
    ].join("|");

    groups.set(key, [...(groups.get(key) || []), entry.entryNumber]);
  });

  return [...groups.entries()]
    .filter(([, entryNumbers]) => entryNumbers.length > 1)
    .map(([key, entryNumbers]) => ({ key, entryNumbers }));
};

export const analyzeFinancialRisk = (
  entries: FinancialEntry[],
  editRequests: FinancialEditRequest[] = [],
): FinancialRiskAnalysis => {
  const flags = new Set<FinancialRiskFlag>();
  const currencyGroups = summarizeFinancialEntriesByCurrency(entries);
  const pendingEditRequests = editRequests.filter((request) => request.status === "pending").length;
  const duplicateGroups = detectPossibleDuplicateEntries(entries);
  const income = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
  const net = income - expense;

  entries.forEach((entry) => {
    if (!entry.locked) flags.add("unlocked_entry");
    if (entry.scope === "deal" && !entry.dealId) flags.add("missing_deal_reference");
    if (entry.scope === "customer" && !entry.customerId) flags.add("missing_customer_reference");
    if (!hasText(entry.dealId) && !hasText(entry.customerId) && entry.scope !== "global") flags.add("orphaned_entry");
    if (!hasText(entry.entryNumber) || !hasText(entry.createdBy) || !hasText(entry.createdAt)) flags.add("weak_audit_context");
    if (hasPendingEditRequest(entry, editRequests)) flags.add("pending_edit_request");
  });

  if (currencyGroups.length > 1) flags.add("inconsistent_currency");
  if (Math.abs(net) >= LARGE_BALANCE_THRESHOLD) flags.add("unusually_large_balance");
  if (net < 0) flags.add("negative_operational_balance");
  if (pendingEditRequests > 0) flags.add("pending_edit_request");
  if (duplicateGroups.length > 0) flags.add("possible_duplicate_entry");

  const state: FinancialRiskState = flags.has("pending_edit_request")
    ? "pending_correction"
    : flags.has("inconsistent_currency")
      ? "inconsistent"
      : flags.has("missing_deal_reference") || flags.has("missing_customer_reference") || flags.has("orphaned_entry")
        ? "missing_reference"
        : flags.has("negative_operational_balance") || flags.has("unusually_large_balance")
          ? "financial_risk"
          : flags.has("unlocked_entry")
            ? "under_review"
            : "healthy";

  const penalties: Record<FinancialRiskFlag, number> = {
    orphaned_entry: 24,
    missing_deal_reference: 18,
    missing_customer_reference: 18,
    inconsistent_currency: 14,
    unusually_large_balance: 12,
    pending_edit_request: 18,
    negative_operational_balance: 16,
    possible_duplicate_entry: 12,
    weak_audit_context: 10,
    unlocked_entry: 10,
  };

  return {
    state,
    riskFlags: [...flags],
    score: Math.max(0, 100 - [...flags].reduce((sum, flag) => sum + penalties[flag], 0)),
    pendingEditRequests,
    duplicateGroups,
  };
};

export const summarizeSettlementVisibility = (
  settlements: PartnerSettlement[],
): SettlementVisibilitySummary => {
  const pendingCount = settlements.filter((settlement) => settlement.status === "draft" || settlement.status === "pending_review").length;
  const approvedUnpaidCount = settlements.filter((settlement) => settlement.status === "approved").length;
  const disputedCount = settlements.filter((settlement) => settlement.status === "disputed").length;
  const paidTotal = settlements.filter((settlement) => settlement.status === "paid").reduce((sum, settlement) => sum + settlement.netDue, 0);
  const totalDue = settlements
    .filter((settlement) => settlement.status !== "paid")
    .reduce((sum, settlement) => sum + settlement.netDue, 0);

  const roleBreakdown = settlements.reduce<Record<string, number>>((acc, settlement) => {
    acc[settlement.partnerRole] = (acc[settlement.partnerRole] || 0) + settlement.netDue;
    return acc;
  }, {});

  const state: SettlementVisibilityState = disputedCount
    ? "disputed"
    : approvedUnpaidCount
      ? "awaiting_payment"
      : pendingCount
        ? "pending_settlement"
        : totalDue > 0
          ? "ready_for_review"
          : paidTotal > 0
            ? "paid"
            : "needs_attention";

  return {
    state,
    pendingCount,
    approvedUnpaidCount,
    disputedCount,
    totalDue,
    paidTotal,
    roleBreakdown,
  };
};

export const prepareFinanceAuditExportRows = (
  entries: FinancialEntry[],
  editRequests: FinancialEditRequest[] = [],
): FinanceAuditExportRow[] =>
  entries.map((entry) => {
    const entryPendingRequests = editRequests.filter(
      (request) => request.financialEntryId === entry.id && request.status === "pending",
    ).length;
    const entryAnalysis = analyzeFinancialRisk([entry], editRequests.filter((request) => request.financialEntryId === entry.id));

    return {
      entryNumber: entry.entryNumber,
      dealNumber: entry.dealNumber || "",
      customerName: entry.customerName || "",
      status: getImmutableAccountingStatus(entry, entryPendingRequests),
      riskFlags: entryAnalysis.riskFlags.join("; "),
      type: entry.type,
      amount: entry.amount,
      currency: entry.currency,
      category: entry.category,
      counterparty: entry.counterparty,
      entryDate: entry.entryDate,
      createdAt: entry.createdAt,
    };
  });

export const buildFinanceAuditCsv = (rows: FinanceAuditExportRow[]) => {
  const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const headers = [
    "entry_number",
    "deal_number",
    "customer_name",
    "immutable_status",
    "risk_flags",
    "type",
    "amount",
    "currency",
    "category",
    "counterparty",
    "entry_date",
    "created_at",
  ];

  return [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.entryNumber,
        row.dealNumber,
        row.customerName,
        row.status,
        row.riskFlags,
        row.type,
        row.amount,
        row.currency,
        row.category,
        row.counterparty,
        row.entryDate,
        row.createdAt,
      ].map(escapeCsv).join(","),
    ),
  ].join("\n");
};
