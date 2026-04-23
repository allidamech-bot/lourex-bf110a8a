import { supabase } from "@/integrations/supabase/client";
import { loadFinancialEntries, loadFinancialEditRequests } from "@/domain/accounting/service";
import { summarizeFinancialEntries, summarizeFinancialEntriesByCurrency } from "@/domain/accounting/utils";
import { loadDeals, loadPurchaseRequests, loadCustomerDashboards, loadShipments } from "./operationsDomain";
import type { OperationsFinancialEntry as FinancialEntry } from "@/domain/operations/types";

export type FinancialTrend = {
  month: string;
  income: number;
  expense: number;
  net: number;
};

export type FinancialSummaryReport = {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  trends: FinancialTrend[];
  byDate: {
    date: string;
    income: number;
    expense: number;
    profit: number;
  }[];
};

export type CustomerReportItem = {
  customerId: string;
  fullName: string;
  email: string;
  requestsCount: number;
  dealsCount: number;
  totalFinancialValue: number;
  outstandingBalance: number;
  activeDeals: number;
  financialIncome: number;
  financialExpense: number;
  pendingEditRequests: number;
  lastActivity: string;
};

export type OperationsReport = {
  activeDeals: number;
  dealsByStage: Record<string, number>;
  averageProcessingTimeDays: number;
};

export type ReportSummary = {
  requests: number;
  deals: number;
  shipments: number;
  customers: number;
  audits: number;
  linkedEntries: number;
  lockedEntries: number;
  pendingEditRequests: number;
  income: number;
  expense: number;
  averageOperationValue: number;
  inTransit: number;
  destination: number;
  delivered: number;
  currencyGroups: number;
};

export type ExpenseCategory = {
  category: string;
  amount: number;
};

export type DashboardReportSnapshot = {
  summary: ReportSummary;
  operations: OperationsReport;
  financialSummary: FinancialSummaryReport;
  topCustomers: CustomerReportItem[];
  topExpenseCategories: ExpenseCategory[];
};

const isInRange = (dateValue: string | undefined | null, start?: Date, end?: Date) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

const filterEntriesByDate = (entries: FinancialEntry[], startDate?: Date, endDate?: Date) =>
  entries.filter((entry) => isInRange(entry.entryDate, startDate, endDate));

export const buildFinancialSummaryReport = (entries: FinancialEntry[]): FinancialSummaryReport => {
  const totals = summarizeFinancialEntries(entries);
  const byDateMap = new Map<string, { income: number; expense: number }>();
  const trendsMap = new Map<string, { income: number; expense: number }>();

  entries.forEach((entry) => {
    const date = entry.entryDate.split("T")[0];
    const month = date.substring(0, 7);
    const currentDay = byDateMap.get(date) || { income: 0, expense: 0 };
    const currentMonth = trendsMap.get(month) || { income: 0, expense: 0 };

    if (entry.type === "income") {
      currentDay.income += entry.amount;
      currentMonth.income += entry.amount;
    } else {
      currentDay.expense += entry.amount;
      currentMonth.expense += entry.amount;
    }

    byDateMap.set(date, currentDay);
    trendsMap.set(month, currentMonth);
  });

  return {
    totalIncome: totals.income,
    totalExpense: totals.expense,
    netProfit: totals.net,
    byDate: [...byDateMap.entries()]
      .map(([date, values]) => ({
        date,
        income: values.income,
        expense: values.expense,
        profit: values.income - values.expense,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    trends: [...trendsMap.entries()]
      .map(([month, values]) => ({
        month,
        income: values.income,
        expense: values.expense,
        net: values.income - values.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
};

export const getFinancialSummaryReport = async (startDate?: Date, endDate?: Date): Promise<FinancialSummaryReport> => {
  const entries = filterEntriesByDate(await loadFinancialEntries(), startDate, endDate);
  return buildFinancialSummaryReport(entries);
};

export const getCustomerReport = async (): Promise<CustomerReportItem[]> => {
  const dashboards = await loadCustomerDashboards();
  const deals = await loadDeals();

  return dashboards.map((dashboard) => {
    const customerDeals = deals.filter((deal) => deal.customerId === dashboard.id);
    const totalValue = customerDeals.reduce((sum, deal) => sum + (deal.totalValue || 0), 0);
    const activeDeals = customerDeals.filter((deal) => !["closed", "delivered", "cancelled"].includes(deal.status)).length;
    const dealDates = customerDeals.map((deal) => new Date(deal.createdAt || 0).getTime()).filter(Number.isFinite);
    const lastActivityTimestamp = [
      ...dealDates,
      dashboard.lastActivityAt ? new Date(dashboard.lastActivityAt).getTime() : NaN,
    ].filter(Number.isFinite);

    return {
      customerId: dashboard.id,
      fullName: dashboard.fullName,
      email: dashboard.email,
      requestsCount: dashboard.requestsCount,
      dealsCount: dashboard.dealsCount,
      totalFinancialValue: totalValue,
      outstandingBalance: dashboard.financialBalance,
      activeDeals,
      financialIncome: dashboard.financialIncome,
      financialExpense: dashboard.financialExpense,
      pendingEditRequests: dashboard.pendingEditRequests || 0,
      lastActivity: lastActivityTimestamp.length ? new Date(Math.max(...lastActivityTimestamp)).toISOString() : "",
    };
  });
};

export const getOperationsReport = async (): Promise<OperationsReport> => {
  const deals = await loadDeals();
  const activeDeals = deals.filter((deal) => !["closed", "delivered", "cancelled"].includes(deal.status)).length;

  const dealsByStage: Record<string, number> = {};
  deals.forEach((deal) => {
    const stage = deal.stage || "unknown";
    dealsByStage[stage] = (dealsByStage[stage] || 0) + 1;
  });

  let totalTime = 0;
  let count = 0;

  deals.forEach((deal) => {
    if ((deal.status === "delivered" || deal.stage === "delivered") && deal.createdAt) {
      const deliveryDate = deal.trackingUpdates?.find((update) => update.stageCode === "delivered")?.occurredAt;
      if (deliveryDate) {
        const start = new Date(deal.createdAt).getTime();
        const end = new Date(deliveryDate).getTime();
        if (end > start) {
          totalTime += end - start;
          count += 1;
        }
      }
    }
  });

  return {
    activeDeals,
    dealsByStage,
    averageProcessingTimeDays: count > 0 ? totalTime / count / (1000 * 60 * 60 * 24) : 0,
  };
};

export const getDashboardReportSnapshot = async (startDate?: Date, endDate?: Date): Promise<DashboardReportSnapshot> => {
  const [entries, editRequests, deals, requests, shipments, customers, auditCount, operations] = await Promise.all([
    loadFinancialEntries(),
    loadFinancialEditRequests(),
    loadDeals(),
    loadPurchaseRequests(),
    loadShipments(),
    loadCustomerDashboards(),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
    getOperationsReport(),
  ]);

  const filteredEntries = filterEntriesByDate(entries, startDate, endDate);
  const filteredDeals = deals.filter((deal) => isInRange(deal.createdAt, startDate, endDate));
  const filteredRequests = requests.filter((request) => isInRange(request.createdAt, startDate, endDate));
  const filteredShipments = shipments.filter((shipment) => isInRange(shipment.updatedAt, startDate, endDate));
  const filteredEditRequests = editRequests.filter((request) => isInRange(request.submittedAt, startDate, endDate));
  const financialSummary = buildFinancialSummaryReport(filteredEntries);
  const currencyGroups = summarizeFinancialEntriesByCurrency(filteredEntries).length;
  const customerReport = await getCustomerReport();

  const categoryMap = new Map<string, number>();
  filteredEntries
    .filter((entry) => entry.type === "expense")
    .forEach((entry) => {
      const key = entry.category || "Uncategorized";
      categoryMap.set(key, (categoryMap.get(key) || 0) + entry.amount);
    });

  const topCustomers = [...customerReport]
    .sort(
      (a, b) =>
        b.outstandingBalance - a.outstandingBalance ||
        b.dealsCount - a.dealsCount ||
        b.requestsCount - a.requestsCount,
    )
    .slice(0, 4);

  const topExpenseCategories = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, amount]) => ({ category, amount }));

  return {
    summary: {
      requests: filteredRequests.length,
      deals: filteredDeals.length,
      shipments: filteredShipments.length,
      customers: customers.length,
      audits: auditCount.count || 0,
      linkedEntries: filteredEntries.filter((entry) => entry.dealId || entry.customerId).length,
      lockedEntries: filteredEntries.filter((entry) => entry.locked).length,
      pendingEditRequests: filteredEditRequests.filter((request) => request.status === "pending").length,
      income: financialSummary.totalIncome,
      expense: financialSummary.totalExpense,
      averageOperationValue:
        filteredDeals.length > 0
          ? filteredDeals.reduce((sum, deal) => sum + (deal.totalValue || 0), 0) / filteredDeals.length
          : 0,
      inTransit: filteredShipments.filter((shipment) => shipment.stage === "transit_to_destination").length,
      destination: filteredShipments.filter((shipment) =>
        ["arrived_destination", "destination_customs"].includes(shipment.stage),
      ).length,
      delivered: filteredShipments.filter((shipment) => shipment.stage === "delivered").length,
      currencyGroups,
    },
    operations,
    financialSummary,
    topCustomers,
    topExpenseCategories,
  };
};

export const getMetricDetails = async (metric: "active_deals" | "pending_requests" | "recent_expenses", limit = 10) => {
  if (metric === "active_deals") {
    const deals = await loadDeals();
    return deals.filter((deal) => !["closed", "delivered", "cancelled"].includes(deal.status)).slice(0, limit);
  }

  if (metric === "pending_requests") {
    const requests = await loadPurchaseRequests();
    const pendingStatuses = ["intake_submitted", "under_review", "awaiting_clarification"];
    return requests.filter((request) => pendingStatuses.includes(request.status)).slice(0, limit);
  }

  if (metric === "recent_expenses") {
    const entries = await loadFinancialEntries();
    return entries
      .filter((entry) => entry.type === "expense")
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
      .slice(0, limit);
  }

  return [];
};
