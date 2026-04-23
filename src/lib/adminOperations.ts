import type { FinancialEntry } from "@/types/lourex";
import type { DashboardReportSnapshot } from "@/lib/reportsDomain";
import type { OperationsDeal, OperationsFinancialEditRequest, OperationsShipment } from "@/domain/operations/types";

type ReportCsvLabels = {
  metric: string;
  value: string;
  requests: string;
  deals: string;
  shipments: string;
  customers: string;
  income: string;
  expense: string;
  lockedEntries: string;
  pendingEditRequests: string;
  topCustomer: string;
  outstandingBalance: string;
};

type AccountingCsvLabels = {
  entryNumber: string;
  scope: string;
  deal: string;
  customer: string;
  type: string;
  amount: string;
  currency: string;
  category: string;
  counterparty: string;
  date: string;
};

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

export const buildReportCsv = (snapshot: DashboardReportSnapshot, labels: ReportCsvLabels) => {
  const lines = [
    [labels.metric, labels.value],
    [labels.requests, snapshot.summary.requests],
    [labels.deals, snapshot.summary.deals],
    [labels.shipments, snapshot.summary.shipments],
    [labels.customers, snapshot.summary.customers],
    [labels.income, snapshot.summary.income],
    [labels.expense, snapshot.summary.expense],
    [labels.lockedEntries, snapshot.summary.lockedEntries],
    [labels.pendingEditRequests, snapshot.summary.pendingEditRequests],
    [],
    [labels.topCustomer, labels.outstandingBalance, labels.pendingEditRequests],
    ...snapshot.topCustomers.map((customer) => [
      customer.fullName,
      customer.outstandingBalance,
      customer.pendingEditRequests,
    ]),
  ];

  return lines.map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
};

export const buildAccountingEntriesCsv = (entries: FinancialEntry[], labels: AccountingCsvLabels) => {
  const lines = [
    [
      labels.entryNumber,
      labels.scope,
      labels.deal,
      labels.customer,
      labels.type,
      labels.amount,
      labels.currency,
      labels.category,
      labels.counterparty,
      labels.date,
    ],
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
