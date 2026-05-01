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

type PdfReportSection = {
  title: string;
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
};

type PdfReportInput = {
  title: string;
  filename: string;
  appName: string;
  generatedAtLabel: string;
  generatedAt: string;
  direction: "ltr" | "rtl";
  filters?: Array<[string, string]>;
  sections: PdfReportSection[];
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

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const printPdfReport = (input: PdfReportInput) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const printWindow = window.open("", "_blank", "width=980,height=720");
  if (!printWindow) return false;

  const filters = input.filters?.length
    ? `<div class="filters">${input.filters
        .map(([label, value]) => `<div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`)
        .join("")}</div>`
    : "";

  const sections = input.sections
    .filter((section) => section.rows.length > 0)
    .map(
      (section) => `
        <section>
          <h2>${escapeHtml(section.title)}</h2>
          <table>
            <thead>
              <tr>${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${section.rows
                .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
                .join("")}
            </tbody>
          </table>
        </section>
      `,
    )
    .join("");

  printWindow.document.write(`<!doctype html>
    <html dir="${input.direction}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(input.filename)}</title>
        <style>
          body { margin: 32px; color: #111827; font-family: Arial, "Tahoma", sans-serif; }
          header { border-bottom: 2px solid #d4af37; margin-bottom: 24px; padding-bottom: 16px; }
          .app { color: #8a6d1d; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
          h1 { margin: 8px 0; font-size: 26px; }
          h2 { margin: 28px 0 12px; font-size: 18px; }
          .meta { color: #4b5563; font-size: 12px; }
          .filters { display: grid; gap: 8px; margin: 16px 0 4px; }
          .filters div { display: flex; gap: 8px; font-size: 12px; }
          table { border-collapse: collapse; margin-bottom: 18px; width: 100%; }
          th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: start; vertical-align: top; }
          th { background: #f3f4f6; font-size: 12px; }
          td { font-size: 12px; }
          @media print { body { margin: 20mm; } button { display: none; } }
        </style>
      </head>
      <body>
        <header>
          <div class="app">${escapeHtml(input.appName)}</div>
          <h1>${escapeHtml(input.title)}</h1>
          <div class="meta">${escapeHtml(input.generatedAtLabel)}: ${escapeHtml(input.generatedAt)}</div>
          ${filters}
        </header>
        ${sections}
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>`);
  printWindow.document.close();
  return true;
};
