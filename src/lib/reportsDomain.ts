import { supabase } from "@/integrations/supabase/client";
import { 
  loadDeals, 
  loadFinancialEntries, 
  loadPurchaseRequests, 
  loadShipments,
  loadCustomerDashboards
} from "./operationsDomain";
import type { 
  OperationalDeal, 
  FinancialEntry, 
  OperationalPurchaseRequest, 
  OperationalShipment,
  CustomerDashboard
} from "@/types/lourex";

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
  requestsCount: number;
  dealsCount: number;
  totalFinancialValue: number;
  outstandingBalance: number;
  activeDeals: number;
  lastActivity: string;
};

export type OperationsReport = {
  activeDeals: number;
  dealsByStage: Record<string, number>;
  averageProcessingTimeDays: number;
};

/**
 * Aggregates financial data with trend analysis.
 * Respects RLS as it uses operationsDomain loaders which use authenticated supabase client.
 */
export const getFinancialSummaryReport = async (startDate?: Date, endDate?: Date): Promise<FinancialSummaryReport> => {
  const entries = await loadFinancialEntries();
  
  const filtered = entries.filter(e => {
    const d = new Date(e.entryDate);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  const totalIncome = filtered.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = filtered.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  
  const byDateMap = new Map<string, { income: number; expense: number }>();
  const trendsMap = new Map<string, { income: number; expense: number }>();
  
  filtered.forEach(e => {
    const date = e.entryDate.split('T')[0];
    const month = date.substring(0, 7); // YYYY-MM
    
    const currentDay = byDateMap.get(date) || { income: 0, expense: 0 };
    const currentMonth = trendsMap.get(month) || { income: 0, expense: 0 };
    
    if (e.type === 'income') {
      currentDay.income += e.amount;
      currentMonth.income += e.amount;
    } else {
      currentDay.expense += e.amount;
      currentMonth.expense += e.amount;
    }
    
    byDateMap.set(date, currentDay);
    trendsMap.set(month, currentMonth);
  });

  const byDate = Array.from(byDateMap.entries())
    .map(([date, vals]) => ({
      date,
      income: vals.income,
      expense: vals.expense,
      profit: vals.income - vals.expense
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const trends = Array.from(trendsMap.entries())
    .map(([month, vals]) => ({
      month,
      income: vals.income,
      expense: vals.expense,
      net: vals.income - vals.expense
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    trends,
    byDate
  };
};

/**
 * Aggregates customer data with deeper analytics.
 */
export const getCustomerReport = async (): Promise<CustomerReportItem[]> => {
  const dashboards = await loadCustomerDashboards();
  const deals = await loadDeals();
  
  return dashboards.map(d => {
    const customerDeals = deals.filter(deal => deal.customerId === d.id);
    const totalValue = customerDeals.reduce((sum, deal) => sum + (deal.totalValue || 0), 0);
    const activeDeals = customerDeals.filter(deal => !['closed', 'delivered', 'cancelled'].includes(deal.status)).length;
    
    // Find last activity (latest update among deals or requests)
    const dealDates = customerDeals.map(deal => new Date(deal.updatedAt || deal.createdAt || 0).getTime());
    const lastDate = dealDates.length > 0 ? new Date(Math.max(...dealDates)).toISOString() : '';

    return {
      customerId: d.id,
      fullName: d.fullName,
      requestsCount: d.requestsCount,
      dealsCount: d.dealsCount,
      totalFinancialValue: totalValue,
      outstandingBalance: d.financialBalance,
      activeDeals,
      lastActivity: lastDate
    };
  });
};

/**
 * Aggregates operations data.
 * Processing time is calculated as the average days between deal creation and the 'delivered' stage update.
 */
export const getOperationsReport = async (): Promise<OperationsReport> => {
  const deals = await loadDeals();
  const activeDeals = deals.filter(d => d.status !== 'closed' && d.status !== 'delivered' && d.status !== 'cancelled').length;
  
  const dealsByStage: Record<string, number> = {};
  deals.forEach(d => {
    const stage = d.stage || 'unknown';
    dealsByStage[stage] = (dealsByStage[stage] || 0) + 1;
  });

  // Calculate average processing time from created_at to delivered
  // RULE: Only consider 'delivered' deals with a valid 'delivered' stage timestamp in timeline.
  let totalTime = 0;
  let count = 0;
  
  deals.forEach(d => {
    if ((d.status === 'delivered' || d.stage === 'delivered') && d.createdAt) {
      const deliveryDate = d.timeline?.find(t => t.stageCode === 'delivered')?.occurredAt;
      if (deliveryDate) {
        const start = new Date(d.createdAt).getTime();
        const end = new Date(deliveryDate).getTime();
        if (end > start) {
          totalTime += (end - start);
          count++;
        }
      }
    }
  });

  const averageProcessingTimeDays = count > 0 
    ? (totalTime / count) / (1000 * 60 * 60 * 24) 
    : 0;

  return {
    activeDeals,
    dealsByStage,
    averageProcessingTimeDays
  };
};

/**
 * Helper to fetch drill-down details for a specific metric.
 */
export const getMetricDetails = async (metric: 'active_deals' | 'pending_requests' | 'recent_expenses', limit = 10) => {
  if (metric === 'active_deals') {
    const deals = await loadDeals();
    return deals
      .filter(d => !['closed', 'delivered', 'cancelled'].includes(d.status))
      .slice(0, limit);
  }
  
  if (metric === 'pending_requests') {
    const requests = await loadPurchaseRequests();
    return requests
      .filter(r => r.status === 'pending')
      .slice(0, limit);
  }

  if (metric === 'recent_expenses') {
    const entries = await loadFinancialEntries();
    return entries
      .filter(e => e.type === 'expense')
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
      .slice(0, limit);
  }

  return [];
};
