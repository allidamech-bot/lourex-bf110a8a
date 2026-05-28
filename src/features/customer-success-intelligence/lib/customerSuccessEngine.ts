import { PurchaseRequest, DealOperation, FinancialEntry, PartnerSettlement } from "@/types/lourex";

export type CustomerClassification = 'VIP' | 'Priority' | 'Standard' | 'At Risk' | 'Dormant';

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  classification: CustomerClassification;
  healthScore: number;
  retentionRisk: number;
  estimatedLTV: number;
  activeRequests: number;
  activeShipments: number;
  totalDeals: number;
  financialConsistency: number;
  lastActivityAt: string;
}

export interface CustomerSuccessInsight {
  id: string;
  title: string;
  description: string;
  type: 'satisfaction' | 'pattern' | 'financial' | 'trust';
  severity: 'info' | 'positive' | 'warning';
}

export interface CustomerSuccessAlert {
  id: string;
  customerId: string;
  customerName: string;
  type: 'stalled_followup' | 'escalation_risk' | 'long_wait' | 'inactive_repeat';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export interface FollowupRecommendation {
  id: string;
  customerId: string;
  action: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
}

export const calculateCustomerHealthScore = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  financials: FinancialEntry[]
): number => {
  let score = 70; // Base score

  const completedDeals = deals.filter(d => d.operationalStatus === 'closed').length;
  score += completedDeals * 5;

  const pendingFinance = financials.filter(f => !f.locked).length;
  score -= pendingFinance * 2;

  const cancelledRequests = requests.filter(r => r.status === 'cancelled').length;
  score -= cancelledRequests * 10;

  return Math.max(0, Math.min(100, score));
};

export const calculateCustomerRetentionRisk = (
  healthScore: number,
  lastActivityAt: string
): number => {
  let risk = 100 - healthScore;
  const daysSinceActivity = (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceActivity > 30) risk += 20;
  if (daysSinceActivity > 90) risk += 40;

  return Math.max(0, Math.min(100, risk));
};

export const classifyCustomerPriority = (
  profile: Partial<CustomerProfile>,
  deals: DealOperation[]
): CustomerClassification => {
  const totalValue = deals.reduce((acc, d) => acc + (d.value || 0), 0);
  const repeatCount = deals.length;
  const health = profile.healthScore || 0;
  const daysSinceActivity = (Date.now() - new Date(profile.lastActivityAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24);

  if (health < 40) return 'At Risk';
  if (daysSinceActivity > 180) return 'Dormant';
  if (totalValue > 100000 || repeatCount > 20) return 'VIP';
  if (totalValue > 25000 || repeatCount > 5) return 'Priority';

  return 'Standard';
};

export const calculateCustomerLifetimeValueEstimate = (deals: DealOperation[]): number => {
  return deals.reduce((acc, d) => acc + (d.value || 0), 0);
};

export const generateCustomerProfiles = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  financials: FinancialEntry[]
): CustomerProfile[] => {
  const customerMap: Record<string, {
    reqs: PurchaseRequest[],
    deals: DealOperation[],
    fins: FinancialEntry[],
    name: string,
    email: string
  }> = {};

  requests.forEach(r => {
    const id = r.customer.id;
    if (!customerMap[id]) customerMap[id] = { reqs: [], deals: [], fins: [], name: r.customer.fullName, email: r.customer.email };
    customerMap[id].reqs.push(r);
  });

  deals.forEach(d => {
    const id = d.customerId;
    if (!id) return;
    if (!customerMap[id]) customerMap[id] = { reqs: [], deals: [], fins: [], name: d.customerName, email: d.customerEmail || '' };
    customerMap[id].deals.push(d);
  });

  return Object.entries(customerMap).map(([id, data]) => {
    const healthScore = calculateCustomerHealthScore(data.reqs, data.deals, data.fins);
    const lastActivity = data.reqs.length > 0 ? data.reqs[0].createdAt : (data.deals.length > 0 ? data.deals[0].createdAt : new Date().toISOString());

    const profile: Partial<CustomerProfile> = {
      id,
      name: data.name,
      email: data.email,
      healthScore,
      retentionRisk: calculateCustomerRetentionRisk(healthScore, lastActivity),
      estimatedLTV: calculateCustomerLifetimeValueEstimate(data.deals),
      activeRequests: data.reqs.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length,
      activeShipments: data.deals.filter(d => d.operationalStatus !== 'closed' && d.operationalStatus !== 'delivered').length,
      totalDeals: data.deals.length,
      financialConsistency: 90, // Placeholder logic
      lastActivityAt: lastActivity,
    };

    return {
      ...profile,
      classification: classifyCustomerPriority(profile, data.deals)
    } as CustomerProfile;
  });
};

export const detectRepeatRequestPatterns = (requests: PurchaseRequest[]): CustomerSuccessInsight[] => {
  const insights: CustomerSuccessInsight[] = [];
  const products = requests.map(r => r.productName.toLowerCase());
  const duplicates = products.filter((item, index) => products.indexOf(item) !== index);

  if (duplicates.length > 0) {
    insights.push({
      id: 'pattern-repeat',
      title: 'Repeat Sourcing Pattern',
      description: `Customer frequently requests: ${Array.from(new Set(duplicates)).join(', ')}.`,
      type: 'pattern',
      severity: 'positive'
    });
  }

  return insights;
};

export const detectCustomerEscalationRisk = (
  requests: PurchaseRequest[],
  deals: DealOperation[]
): number => {
  let risk = 0;
  const longPending = requests.filter(r => r.status === 'intake_submitted' && (Date.now() - new Date(r.createdAt).getTime() > 1000 * 60 * 60 * 24 * 3)).length;
  risk += longPending * 15;

  const stalledDeals = deals.filter(d => d.operationalStatus === 'awaiting_assignment').length;
  risk += stalledDeals * 20;

  return Math.min(100, risk);
};

export const generateCustomerFollowupRecommendations = (
  profiles: CustomerProfile[],
  requests: PurchaseRequest[]
): FollowupRecommendation[] => {
  const recommendations: FollowupRecommendation[] = [];

  profiles.forEach(p => {
    if (p.classification === 'At Risk') {
      recommendations.push({
        id: `rec-risk-${p.id}`,
        customerId: p.id,
        action: 'Account Recovery Call',
        reason: 'Customer health score dropped below 40%.',
        urgency: 'high'
      });
    }

    const customerReqs = requests.filter(r => r.customer.id === p.id);
    if (customerReqs.some(r => r.status === 'awaiting_clarification')) {
      recommendations.push({
        id: `rec-clarify-${p.id}`,
        customerId: p.id,
        action: 'Clarification Nudge',
        reason: 'Requests are stalled awaiting customer input.',
        urgency: 'medium'
      });
    }
  });

  return recommendations;
};

export const generateCustomerSuccessInsights = (
  requests: PurchaseRequest[],
  deals: DealOperation[]
): CustomerSuccessInsight[] => {
  const insights: CustomerSuccessInsight[] = [];

  if (deals.every(d => d.operationalStatus === 'delivered' || d.operationalStatus === 'closed')) {
    insights.push({
      id: 'insight-delivery',
      title: 'Perfect Delivery Rate',
      description: 'All historical deals have been successfully delivered.',
      type: 'satisfaction',
      severity: 'positive'
    });
  }

  return insights;
};

export const generateCustomerSuccessAlerts = (
  profiles: CustomerProfile[]
): CustomerSuccessAlert[] => {
  return profiles
    .filter(p => p.retentionRisk > 50)
    .map(p => ({
      id: `alert-risk-${p.id}`,
      customerId: p.id,
      customerName: p.name,
      type: 'escalation_risk',
      severity: p.retentionRisk > 80 ? 'CRITICAL' : 'HIGH',
      description: `High retention risk detected (${p.retentionRisk}%). Immediate engagement suggested.`
    }));
};
