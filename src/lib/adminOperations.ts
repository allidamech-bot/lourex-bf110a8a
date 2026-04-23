import type { FinancialEntry } from "@/types/lourex";
import type { DashboardReportSnapshot } from "@/lib/reportsDomain";
import type { OperationsDeal, OperationsFinancialEditRequest, OperationsShipment } from "@/domain/operations/types";

const normalizeTerm = (value: string) => value.trim().toLowerCase();

export const filterDeals = (rows: OperationsDeal[], search: string) => {
  const normalized = normalizeTerm(search);
  if (!normalized) return rows;

  return rows.filter((row) =>
    [
      row.dealNumber,
      row.customerName,
      row.customerEmail,
      row.requestNumber,
      row.trackingId,
      row.operationTitle,
      row.accountingReference,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized)),
  );
};

export const filterShipments = (rows: OperationsShipment[], search: string) => {
  const normalized = normalizeTerm(search);
  if (!normalized) return rows;

  return rows.filter((row) =>
    [row.trackingId, row.dealNumber, row.clientName, row.destination, row.stage]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized)),
  );
};

export const filterFinancialEditRequests = (
  rows: OperationsFinancialEditRequest[],
  search: string,
  status: "all" | "pending" | "approved" | "rejected",
) => {
  const normalized = normalizeTerm(search);

  return rows.filter((row) => {
    const matchesStatus = status === "all" ? true : row.status === status;
    const matchesSearch =
      !normalized ||
      [row.requestedBy, row.requestedByEmail, row.dealNumber, row.targetEntryNumber, row.reason]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));

    return matchesStatus && matchesSearch;
  });
};

const escapeCsv = (value: string | number | null | undefined) => {
  const normalized = value == null ? "" : String(value);
  return /[",\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
};

export const buildReportCsv = (snapshot: DashboardReportSnapshot) => {
  const lines = [
    ["Metric", "Value"],
    ["Requests", snapshot.summary.requests],
    ["Deals", snapshot.summary.deals],
    ["Shipments", snapshot.summary.shipments],
    ["Customers", snapshot.summary.customers],
    ["Income", snapshot.summary.income],
    ["Expense", snapshot.summary.expense],
    ["Locked entries", snapshot.summary.lockedEntries],
    ["Pending edit requests", snapshot.summary.pendingEditRequests],
    [],
    ["Top customer", "Outstanding balance", "Pending edit requests"],
    ...snapshot.topCustomers.map((customer) => [
      customer.fullName,
      customer.outstandingBalance,
      customer.pendingEditRequests,
    ]),
  ];

  return lines.map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
};

export const buildAccountingEntriesCsv = (entries: FinancialEntry[]) => {
  const lines = [
    ["Entry number", "Scope", "Deal", "Customer", "Type", "Amount", "Currency", "Category", "Counterparty", "Date"],
    ...entries.map((entry) => [
      entry.entryNumber,
      entry.scope,
      entry.dealNumber || "",
      entry.customerName || "",
      entry.type,
      entry.amount,
      entry.currency,
      entry.category,
      entry.counterparty,
      entry.entryDate,
    ]),
  ];

  return lines.map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
};

export const downloadCsv = (filename: string, content: string) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  return true;
};
