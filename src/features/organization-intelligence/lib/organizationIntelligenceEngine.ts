import { PurchaseRequest, DealOperation, FinancialEntry, PartnerSettlement } from "@/types/lourex";

export interface BranchProfile {
  id: string;
  name: string;
  region: string;
  activeRequests: number;
  activeShipments: number;
  completedOperations: number;
  pendingFinanceItems: number;
  performanceScore: number;
  healthStatus: 'Excellent' | 'Strong' | 'Attention Needed' | 'Critical';
}

export interface BranchRiskScore {
  branchId: string;
  branchName: string;
  operationalRisk: number;
  financeRisk: number;
  shipmentRisk: number;
  customerFollowUpRisk: number;
  overallRisk: number;
  recommendedMitigation: string;
}

export interface TeamWorkload {
  ownerName: string;
  assignedWorkload: number;
  pendingActions: number;
  isOverloaded: boolean;
  recommendedRedistribution: string;
}

export interface RegionalSummary {
  region: string;
  operationsCount: number;
  shipmentDistribution: Record<string, number>;
  requestConcentration: number;
  riskConcentration: number;
}

export interface BranchFinancialSummary {
  branchId: string;
  branchName: string;
  receivableExposure: number;
  payableExposure: number;
  settlementPressure: number;
  proofCoverage: number;
  financeReadiness: number;
}

export interface OwnershipAccountability {
  ownerName: string;
  unresolvedResponsibilities: number;
  staleActions: number;
  alerts: string[];
}

export interface BranchRecommendation {
  branchId: string;
  branchName: string;
  recommendation: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface ExecutiveSummary {
  bestPerformingBranch: string;
  branchNeedingAttention: string;
  totalWorkload: number;
  recommendations: string[];
}

/**
 * Deterministic Local intelligence for Branch/Organization grouping
 */

const FALLBACK_BRANCH = "Main Branch";
const FALLBACK_REGION = "General Operations";

type OperationalItem = Record<string, unknown> & { turkishPartnerName?: string; saudiPartnerName?: string; destination?: string; customer?: { country?: string } };

const getBranchName = (item: OperationalItem): string => {
  if (item.turkishPartnerName) return item.turkishPartnerName;
  if (item.saudiPartnerName) return item.saudiPartnerName;
  if (item.destination) return `${item.destination} Operations`;
  return FALLBACK_BRANCH;
};

const getRegionName = (item: OperationalItem): string => {
  if (item.destination) return item.destination;
  if (item.customer?.country) return item.customer.country;
  return FALLBACK_REGION;
};

export const generateBranchProfiles = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  financials: FinancialEntry[]
): BranchProfile[] => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeDeals = Array.isArray(deals) ? deals : [];
  const safeFinancials = Array.isArray(financials) ? financials : [];
  const branchMap: Record<string, BranchProfile> = {};

  const getOrCreateBranch = (name: string, region: string) => {
    if (!branchMap[name]) {
      branchMap[name] = {
        id: name,
        name,
        region,
        activeRequests: 0,
        activeShipments: 0,
        completedOperations: 0,
        pendingFinanceItems: 0,
        performanceScore: 85, // Default
        healthStatus: 'Strong',
      };
    }
    return branchMap[name];
  };

  safeRequests.forEach(r => {
    if (!r) return;
    const branch = getOrCreateBranch(getBranchName(r), getRegionName(r));
    if (r.status !== 'completed' && r.status !== 'cancelled') {
      branch.activeRequests++;
    }
  });

  safeDeals.forEach(d => {
    if (!d) return;
    const branch = getOrCreateBranch(getBranchName(d), getRegionName(d));
    if (d.operationalStatus === 'closed' || d.shipmentStage === 'closed' || d.shipmentStage === 'delivered') {
      branch.completedOperations++;
    } else {
      branch.activeShipments++;
    }
  });

  safeFinancials.forEach(f => {
    if (!f) return;
    const branch = getOrCreateBranch(getBranchName(f), getRegionName(f));
    if (!f.locked) {
      branch.pendingFinanceItems++;
    }
  });

  // Calculate scores and health
  return Object.values(branchMap).map(b => {
    let score = 70;
    if (b.completedOperations > 0) score += 10;
    if (b.activeShipments > 5) score += 5;
    if (b.pendingFinanceItems > 10) score -= 10;
    if (b.activeRequests > 20) score += 5;

    score = Math.min(100, Math.max(0, score));

    let health: BranchProfile['healthStatus'] = 'Strong';
    if (score > 90) health = 'Excellent';
    else if (score < 60) health = 'Attention Needed';
    else if (score < 40) health = 'Critical';

    return { ...b, performanceScore: score, healthStatus: health };
  });
};

export const calculateBranchPerformance = (branchId: string, deals: DealOperation[]): number => {
  const safeDeals = Array.isArray(deals) ? deals : [];
  const branchDeals = safeDeals.filter(d => d && getBranchName(d) === branchId);
  if (branchDeals.length === 0) return 0;

  const completed = branchDeals.filter(d => d && d.operationalStatus === 'closed').length;
  return Math.round((completed / branchDeals.length) * 100);
};

export const calculateBranchRiskScore = (
  branchId: string,
  requests: PurchaseRequest[],
  deals: DealOperation[],
  financials: FinancialEntry[]
): BranchRiskScore => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeDeals = Array.isArray(deals) ? deals : [];
  const safeFinancials = Array.isArray(financials) ? financials : [];

  const branchDeals = safeDeals.filter(d => d && getBranchName(d) === branchId);
  const branchRequests = safeRequests.filter(r => r && getBranchName(r) === branchId);
  const branchFinancials = safeFinancials.filter(f => f && getBranchName(f) === branchId);

  const opRisk = Math.min(100, branchDeals.filter(d => d && d.operationalStatus === 'awaiting_assignment').length * 10);
  const finRisk = Math.min(100, branchFinancials.filter(f => f && !f.locked).length * 5);
  const shipRisk = Math.min(100, branchDeals.filter(d => d && d.shipmentStage === 'factory').length * 2);
  const followUpRisk = Math.min(100, branchRequests.filter(r => r && r.status === 'intake_submitted').length * 5);

  const overall = Math.round((opRisk + finRisk + shipRisk + followUpRisk) / 4);

  let mitigation = "Monitor operations normally.";
  if (overall > 70) mitigation = "Immediate executive intervention required.";
  else if (overall > 40) mitigation = "Review workload and partner assignments.";

  return {
    branchId,
    branchName: branchId,
    operationalRisk: opRisk,
    financeRisk: finRisk,
    shipmentRisk: shipRisk,
    customerFollowUpRisk: followUpRisk,
    overallRisk: overall,
    recommendedMitigation: mitigation,
  };
};

export const generateTeamWorkloadInsights = (
  requests: PurchaseRequest[],
  deals: DealOperation[]
): TeamWorkload[] => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeDeals = Array.isArray(deals) ? deals : [];
  const workloadMap: Record<string, { assigned: number; pending: number }> = {};

  const increment = (name: string, type: 'assigned' | 'pending') => {
    if (!workloadMap[name]) workloadMap[name] = { assigned: 0, pending: 0 };
    workloadMap[name][type]++;
  };

  safeDeals.forEach(d => {
    if (!d) return;
    if (d.turkishPartnerName) increment(d.turkishPartnerName, 'assigned');
    if (d.saudiPartnerName) increment(d.saudiPartnerName, 'assigned');
  });

  safeRequests.forEach(r => {
    if (r && r.status === 'intake_submitted') {
      increment("Operations Team", 'pending');
    }
  });

  return Object.entries(workloadMap).map(([name, data]) => ({
    ownerName: name,
    assignedWorkload: data.assigned,
    pendingActions: data.pending,
    isOverloaded: data.assigned > 10,
    recommendedRedistribution: data.assigned > 10 ? "Reassign new deals to other partners." : "Maintain current capacity."
  }));
};

export const generateRegionalOperationsSummary = (
  requests: PurchaseRequest[],
  deals: DealOperation[]
): RegionalSummary[] => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeDeals = Array.isArray(deals) ? deals : [];
  const regionMap: Record<string, RegionalSummary> = {};

  const getOrCreateRegion = (region: string) => {
    if (!regionMap[region]) {
      regionMap[region] = {
        region,
        operationsCount: 0,
        shipmentDistribution: {},
        requestConcentration: 0,
        riskConcentration: 0,
      };
    }
    return regionMap[region];
  };

  safeDeals.forEach(d => {
    if (!d) return;
    const regionName = getRegionName(d);
    const summary = getOrCreateRegion(regionName);
    summary.operationsCount++;
    if (d.shipmentStage) {
      summary.shipmentDistribution[d.shipmentStage] = (summary.shipmentDistribution[d.shipmentStage] || 0) + 1;
    }
  });

  safeRequests.forEach(r => {
    if (!r) return;
    const regionName = getRegionName(r);
    const summary = getOrCreateRegion(regionName);
    summary.requestConcentration++;
  });

  return Object.values(regionMap);
};

export const generateCrossBranchExecutiveSummary = (
  profiles: BranchProfile[],
  workloads: TeamWorkload[]
): ExecutiveSummary => {
  if (profiles.length === 0) {
    return {
      bestPerformingBranch: "N/A",
      branchNeedingAttention: "N/A",
      totalWorkload: 0,
      recommendations: ["Initialize system data."]
    };
  }

  const sorted = [...profiles].sort((a, b) => b.performanceScore - a.performanceScore);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const totalW = workloads.reduce((acc, w) => acc + w.assignedWorkload, 0);

  const recommendations = [];
  if (worst.performanceScore < 60) {
    recommendations.push(`Support ${worst.name} with additional resources.`);
  }
  if (totalW > 50) {
    recommendations.push("Consider onboarding new regional partners.");
  }

  return {
    bestPerformingBranch: best.name,
    branchNeedingAttention: worst.name,
    totalWorkload: totalW,
    recommendations: recommendations.length > 0 ? recommendations : ["Maintain current operational standards."]
  };
};

export const generateBranchFinancialSummary = (
  branchId: string,
  financials: FinancialEntry[],
  settlements: PartnerSettlement[]
): BranchFinancialSummary => {
  const branchFinancials = financials.filter(f => getBranchName(f) === branchId);
  const branchSettlements = settlements.filter(s => s.partnerName === branchId);

  const receivable = branchFinancials.filter(f => f.type === 'income').reduce((acc, f) => acc + f.amount, 0);
  const payable = branchFinancials.filter(f => f.type === 'expense').reduce((acc, f) => acc + f.amount, 0);
  const pressure = branchSettlements.filter(s => s.status === 'pending_review' || s.status === 'approved').reduce((acc, s) => acc + s.netDue, 0);

  const lockedCount = branchFinancials.filter(f => f.locked).length;
  const totalCount = branchFinancials.length;
  const coverage = totalCount > 0 ? (lockedCount / totalCount) * 100 : 100;

  return {
    branchId,
    branchName: branchId,
    receivableExposure: receivable,
    payableExposure: payable,
    settlementPressure: pressure,
    proofCoverage: Math.round(coverage),
    financeReadiness: Math.round(coverage * 0.8 + (pressure > 0 ? 0 : 20)),
  };
};

export const generateOwnershipAccountabilityInsights = (
  ownerName: string,
  requests: PurchaseRequest[],
  deals: DealOperation[]
): OwnershipAccountability => {
  const ownerRequests = requests.filter(r => r.customer.fullName === ownerName);
  const ownerDeals = deals.filter(d => d.turkishPartnerName === ownerName || d.saudiPartnerName === ownerName);

  const unresolved = ownerRequests.filter(r => r.status === 'awaiting_clarification').length +
                     ownerDeals.filter(d => d.operationalStatus === 'awaiting_assignment').length;

  const stale = ownerDeals.filter(d => {
    const lastUpdate = d.trackingUpdates?.[0]?.occurredAt;
    if (!lastUpdate) return true;
    const diff = new Date().getTime() - new Date(lastUpdate).getTime();
    return diff > 1000 * 60 * 60 * 24 * 7; // 7 days
  }).length;

  const alerts = [];
  if (unresolved > 5) alerts.push("High number of unresolved actions.");
  if (stale > 2) alerts.push("Shipments require tracking updates.");

  return {
    ownerName,
    unresolvedResponsibilities: unresolved,
    staleActions: stale,
    alerts,
  };
};

export const generateBranchRecommendations = (
  profile: BranchProfile,
  risk: BranchRiskScore
): BranchRecommendation => {
  let rec = "Continue standard operations.";
  let priority: BranchRecommendation['priority'] = 'Low';

  if (risk.overallRisk > 60) {
    rec = "Conduct immediate operational audit.";
    priority = 'High';
  } else if (profile.performanceScore < 70) {
    rec = "Enhance team training and support.";
    priority = 'Medium';
  }

  return {
    branchId: profile.id,
    branchName: profile.name,
    recommendation: rec,
    priority,
  };
};
