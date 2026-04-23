import type { FinancialEntry } from "@/types/lourex";
import type { OperationsCustomer, OperationsDeal, OperationsFinancialEditRequest, OperationsRequest } from "@/domain/operations/types";

export const normalizeFinancialText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const normalizeFinancialCurrency = (value: string) =>
  normalizeFinancialText(value).toUpperCase();

export const isValidFinancialCurrency = (value: string) =>
  /^[A-Z]{3}$/.test(normalizeFinancialCurrency(value));

export const validateFinancialEntryInput = (input: {
  dealId?: string;
  customerId?: string;
  scope: "deal_linked" | "global" | "customer_linked";
  amount: number;
  currency: string;
  note: string;
  method: string;
  counterparty: string;
  category: string;
  entryDate: string;
}) => {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "The financial amount must be greater than zero.";
  }

  if (!input.entryDate) {
    return "The financial entry date is required.";
  }

  if (!isValidFinancialCurrency(input.currency)) {
    return "A valid 3-letter currency code is required.";
  }

  if (
    !normalizeFinancialText(input.note) ||
    !normalizeFinancialText(input.method) ||
    !normalizeFinancialText(input.counterparty) ||
    !normalizeFinancialText(input.category)
  ) {
    return "All required financial entry details must be completed.";
  }

  if (input.scope === "deal_linked" && !input.dealId) {
    return "A deal-linked financial entry requires a linked deal.";
  }

  if (input.scope === "customer_linked" && !input.customerId) {
    return "A customer-linked financial entry requires a linked customer.";
  }

  if (input.scope === "global" && (input.dealId || input.customerId)) {
    return "A global financial entry cannot include a linked deal or customer.";
  }

  return null;
};

const normalizeEditableFinancialValue = (key: string, value: unknown) => {
  if (key === "amount") {
    return Number(value ?? 0);
  }

  return normalizeFinancialText(value);
};

export const sanitizeFinancialEditProposal = (proposal: Record<string, unknown>) => {
  const allowedKeys = ["amount", "method", "counterparty", "category", "note", "referenceLabel", "currency", "entryDate"];

  return Object.fromEntries(
    Object.entries(proposal)
      .filter(([key]) => allowedKeys.includes(key))
      .map(([key, value]) => [key, key === "currency" ? normalizeFinancialCurrency(String(value ?? "")) : normalizeEditableFinancialValue(key, value)]),
  );
};

export const hasMeaningfulFinancialEditChange = (
  previousValue: Record<string, unknown>,
  proposedValue: Record<string, unknown>,
) => {
  const previous = sanitizeFinancialEditProposal(previousValue);
  const proposed = sanitizeFinancialEditProposal(proposedValue);
  const candidateKeys = Object.keys(proposed);

  if (candidateKeys.length === 0) {
    return false;
  }

  return candidateKeys.some((key) => previous[key] !== proposed[key]);
};

export const summarizeFinancialEntries = (entries: FinancialEntry[]) => {
  const income = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);

  return {
    count: entries.length,
    lockedCount: entries.filter((entry) => entry.locked).length,
    income,
    expense,
    net: income - expense,
    dealCount: entries.filter((entry) => entry.scope === "deal").length,
    customerCount: entries.filter((entry) => entry.scope === "customer").length,
    globalCount: entries.filter((entry) => entry.scope === "global").length,
  };
};

export const getCustomerScopedFinancialEntries = (
  customerId: string,
  deals: Array<Pick<OperationsDeal, "id" | "customerId">>,
  entries: FinancialEntry[],
) => {
  const dealIds = new Set(deals.filter((deal) => deal.customerId === customerId).map((deal) => deal.id));

  return entries.filter(
    (entry) => entry.customerId === customerId || (entry.dealId ? dealIds.has(entry.dealId) : false),
  );
};

export const buildCustomerFinancialSummary = (
  customer: OperationsCustomer,
  deals: Array<Pick<OperationsDeal, "id" | "customerId">>,
  requests: Array<Pick<OperationsRequest, "id" | "createdAt" | "customer">>,
  entries: FinancialEntry[],
  editRequests: Array<Pick<OperationsFinancialEditRequest, "customerId" | "dealId" | "status">>,
) => {
  const customerEntries = getCustomerScopedFinancialEntries(customer.id, deals, entries);
  const totals = summarizeFinancialEntries(customerEntries);
  const customerDealIds = new Set(deals.filter((deal) => deal.customerId === customer.id).map((deal) => deal.id));
  const pendingEditRequests = editRequests.filter(
    (request) =>
      request.status === "pending" &&
      (request.customerId === customer.id || (request.dealId ? customerDealIds.has(request.dealId) : false)),
  ).length;

  const lastRequestDate = requests
    .filter((request) => request.customer.id === customer.id)
    .map((request) => new Date(request.createdAt).getTime())
    .filter(Number.isFinite);

  return {
    ...customer,
    financialEntriesCount: totals.count,
    financialIncome: totals.income,
    financialExpense: totals.expense,
    financialBalance: totals.net,
    pendingEditRequests,
    lastActivityAt: lastRequestDate.length ? new Date(Math.max(...lastRequestDate)).toISOString() : "",
  };
};
