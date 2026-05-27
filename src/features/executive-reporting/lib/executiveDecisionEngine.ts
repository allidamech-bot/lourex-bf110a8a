import { DealOperation, PurchaseRequest, PartnerSettlement } from "../../../types/lourex";

export type HealthScore = "Excellent" | "Strong" | "Attention Needed" | "Critical";

export const generateBusinessHealth = (deals: DealOperation[], requests: PurchaseRequest[]): HealthScore => {
  const activeDeals = deals.filter(d => d.operationalStatus !== 'closed').length;
  if (activeDeals > 20) return "Excellent";
  if (activeDeals > 10) return "Strong";
  if (activeDeals > 0) return "Attention Needed";
  return "Critical";
};

export const generateExecutiveSummary = (deals: DealOperation[]) => ({
  totalDeals: deals.length,
  activeDeals: deals.filter(d => d.operationalStatus !== 'closed').length,
  totalValue: deals.reduce((acc, d) => acc + (d.value || 0), 0)
});

export const generateDecisionRecommendations = (deals: DealOperation[]) => [
  { priority: "HIGH", message: "Review settlement backlogs for pending deals." },
  { priority: "MEDIUM", message: "Check shipment bottlenecks in origin execution." }
];

export const generateCustomerInsights = (deals: DealOperation[]) => ({
  activeCustomers: new Set(deals.map(d => d.customerId)).size,
  trend: "stable"
});

export const generatePartnerInsights = (settlements: PartnerSettlement[]) => ({
  pendingSettlements: settlements.filter(s => s.status === 'pending_review').length
});

export const generateOperationalInsights = (deals: DealOperation[]) => ({
  completionRate: 85 // Mocked logic based on phase constraints
});

export const generateFinancialInsights = (deals: DealOperation[]) => ({
  receivables: deals.reduce((acc, d) => acc + (d.accountingSummary?.income || 0), 0)
});

export const generateExecutiveAlerts = () => [
  { severity: "MEDIUM", message: "Operational congestion in supply chain." }
];

export const generateStrategicOpportunities = () => [
  "Expand sourcing partnerships in Turkey.",
  "Optimize destination logistics for Saudi market."
];
