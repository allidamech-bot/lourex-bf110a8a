import { PurchaseRequest, DealOperation, FinancialEntry, PartnerSettlement, FinancialEditRequest } from "@/types/lourex";

export interface PartnerProfile {
  id: string;
  name: string;
  activeShipments: number;
  activeDeals: number;
  activeRequests: number;
  pendingSettlements: number;
  performanceScore: number;
  responsibilityScore: number;
  communicationReadiness: number;
  healthStatus: 'Excellent' | 'Strong' | 'Attention Needed' | 'Critical';
}

export interface PartnerTask {
  id: string;
  title: string;
  priority: 'Urgent' | 'High' | 'Normal';
  reason: string;
  recommendedAction: string;
  partnerId: string;
}

export interface PartnerShipmentInsight {
  shipmentId: string;
  dealNumber: string;
  currentStage: string;
  isResponsible: boolean;
  staleUpdates: boolean;
  deliveryRisk: 'High' | 'Medium' | 'Low';
  nextAction: string;
}

export interface PartnerSettlementInsight {
  partnerId: string;
  pendingAmount: number;
  approvedUnpaidAmount: number;
  disputedCount: number;
  settlementPressure: number;
  mitigation: string;
}

export interface PartnerPerformanceDetails {
  responsiveness: number;
  settlementReadiness: number;
  shipmentExecution: number;
  documentCompleteness: number;
  bottleneckRate: number;
  overallHealth: 'Excellent' | 'Strong' | 'Attention Needed' | 'Critical';
}

export interface PartnerBottleneck {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium';
  mitigation: string;
}

export interface PartnerCommunicationInsight {
  readiness: number;
  followUpSuggestions: string[];
  updateSummary: string;
  suggestedTopics: string[];
  nextCheckIn: string;
}

type PartnerItem = Record<string, unknown> & { turkishPartnerName?: string; saudiPartnerName?: string; partnerName?: string; supplierName?: string; brokerName?: string; assignedPartner?: string };
type ShipmentItem = PartnerItem & { id?: string; stage?: string; updatedAt?: string; dealNumber?: string };

const FALLBACK_PARTNER = "Primary Partner";

const getPartnerName = (item: PartnerItem): string => {
  return item.turkishPartnerName || item.saudiPartnerName || item.partnerName || item.supplierName || item.brokerName || item.assignedPartner || FALLBACK_PARTNER;
};

export const generatePartnerProfiles = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  shipments: ShipmentItem[],
  settlements: PartnerSettlement[]
): PartnerProfile[] => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeDeals = Array.isArray(deals) ? deals : [];
  const safeShipments = Array.isArray(shipments) ? shipments : [];
  const safeSettlements = Array.isArray(settlements) ? settlements : [];
  const partnerMap: Record<string, PartnerProfile> = {};

  const getOrCreatePartner = (name: string) => {
    if (!partnerMap[name]) {
      partnerMap[name] = {
        id: name,
        name,
        activeShipments: 0,
        activeDeals: 0,
        activeRequests: 0,
        pendingSettlements: 0,
        performanceScore: 80,
        responsibilityScore: 85,
        communicationReadiness: 90,
        healthStatus: 'Strong',
      };
    }
    return partnerMap[name];
  };

  safeDeals.forEach(d => {
    if (!d) return;
    const names = [d.turkishPartnerName, d.saudiPartnerName].filter(Boolean) as string[];
    names.forEach(name => {
      const p = getOrCreatePartner(name);
      if (d.operationalStatus !== 'closed' && d.operationalStatus !== 'delivered') {
        p.activeDeals++;
      }
    });
  });

  safeShipments.forEach(s => {
    if (!s) return;
    // shipments usually linked via dealId, let's assume we can map them back to partners if needed
    // or if shipment has partner fields directly
    const name = getPartnerName(s);
    const p = getOrCreatePartner(name);
    if (s.stage !== 'delivered' && s.stage !== 'closed') {
      p.activeShipments++;
    }
  });

  safeSettlements.forEach(s => {
    if (s && s.partnerName) {
      const p = getOrCreatePartner(s.partnerName);
      if (s.status === 'pending_review' || s.status === 'approved') {
        p.pendingSettlements++;
      }
    }
  });

  return Object.values(partnerMap).map(p => {
    const perf = calculatePartnerPerformanceScore(p);
    const resp = calculatePartnerResponsibilityScore(p);

    let health: PartnerProfile['healthStatus'] = 'Strong';
    if (perf > 90) health = 'Excellent';
    else if (perf < 60) health = 'Attention Needed';
    else if (perf < 40) health = 'Critical';

    return {
      ...p,
      performanceScore: perf,
      responsibilityScore: resp,
      healthStatus: health,
    };
  });
};

export const calculatePartnerPerformanceScore = (partner: Partial<PartnerProfile>): number => {
  let score = 85;
  if (partner.pendingSettlements && partner.pendingSettlements > 5) score -= 10;
  if (partner.activeShipments && partner.activeShipments > 10) score += 5;
  return Math.min(100, Math.max(0, score));
};

export const calculatePartnerResponsibilityScore = (partner: Partial<PartnerProfile>): number => {
  let score = 90;
  if (partner.activeDeals && partner.activeDeals > 5) score -= 5;
  return Math.min(100, Math.max(0, score));
};

export const generatePartnerTaskQueue = (
  partnerId: string,
  deals: DealOperation[],
  shipments: ShipmentItem[],
  settlements: PartnerSettlement[]
): PartnerTask[] => {
  const safeDeals = Array.isArray(deals) ? deals : [];
  const safeShipments = Array.isArray(shipments) ? shipments : [];
  const safeSettlements = Array.isArray(settlements) ? settlements : [];
  const tasks: PartnerTask[] = [];

  safeDeals.filter(d => d && (d.turkishPartnerName === partnerId || d.saudiPartnerName === partnerId)).forEach(d => {
    if (d.operationalStatus === 'awaiting_assignment') {
      tasks.push({
        id: `task-assign-${d.id}`,
        title: 'Confirm Assignment',
        priority: 'High',
        reason: 'Deal is pending partner confirmation to start execution.',
        recommendedAction: 'Accept assignment in portal.',
        partnerId
      });
    }
  });

  safeShipments.filter(s => s && getPartnerName(s) === partnerId).forEach(s => {
    const daysSinceUpdate = s.updatedAt ? (Date.now() - new Date(s.updatedAt).getTime()) / (1000 * 60 * 60 * 24) : 0;
    if (daysSinceUpdate > 3 && s.stage !== 'delivered' && s.stage !== 'closed') {
      tasks.push({
        id: `task-update-${s.id}`,
        title: 'Update Shipment Status',
        priority: 'Urgent',
        reason: 'No updates for over 3 days.',
        recommendedAction: 'Provide current location or stage update.',
        partnerId
      });
    }
  });

  safeSettlements.filter(s => s && s.partnerName === partnerId).forEach(s => {
    if (s.status === 'pending_review') {
      tasks.push({
        id: `task-settle-${s.id}`,
        title: 'Review Settlement',
        priority: 'Normal',
        reason: 'Settlement draft is ready for review.',
        recommendedAction: 'Verify amounts and approve or dispute.',
        partnerId
      });
    }
  });

  return tasks;
};

export const generatePartnerShipmentInsights = (
  partnerId: string,
  shipments: ShipmentItem[]
): PartnerShipmentInsight[] => {
  const safeShipments = Array.isArray(shipments) ? shipments : [];
  return safeShipments
    .filter(s => s && getPartnerName(s) === partnerId)
    .map(s => {
      const daysSinceUpdate = s.updatedAt ? (Date.now() - new Date(s.updatedAt).getTime()) / (1000 * 60 * 60 * 24) : 0;
      return {
        shipmentId: s.id,
        dealNumber: s.dealNumber || 'N/A',
        currentStage: s.stage || "Unknown",
        isResponsible: true, // simplified
        staleUpdates: daysSinceUpdate > 2,
        deliveryRisk: daysSinceUpdate > 5 ? 'High' : daysSinceUpdate > 3 ? 'Medium' : 'Low',
        nextAction: 'Provide tracking update.'
      };
    });
};

export const generatePartnerSettlementInsights = (
  partnerId: string,
  settlements: PartnerSettlement[]
): PartnerSettlementInsight => {
  const safeSettlements = Array.isArray(settlements) ? settlements : [];
  const partnerSettlements = safeSettlements.filter(s => s && s.partnerName === partnerId);
  const pending = partnerSettlements.filter(s => s.status === 'pending_review').reduce((acc, s) => acc + s.netDue, 0);
  const approved = partnerSettlements.filter(s => s.status === 'approved').reduce((acc, s) => acc + s.netDue, 0);
  const disputed = partnerSettlements.filter(s => s.status === 'disputed').length;

  return {
    partnerId,
    pendingAmount: pending,
    approvedUnpaidAmount: approved,
    disputedCount: disputed,
    settlementPressure: pending + approved,
    mitigation: disputed > 0 ? "Resolve open disputes to unlock payments." : "Ensure all documentation is uploaded for pending items."
  };
};

export const detectPartnerBottlenecks = (
  partnerId: string,
  deals: DealOperation[],
  shipments: ShipmentItem[]
): PartnerBottleneck[] => {
  const safeShipments = Array.isArray(shipments) ? shipments : [];
  const bottlenecks: PartnerBottleneck[] = [];
  const staleShipments = safeShipments.filter(s => s && getPartnerName(s) === partnerId && s.updatedAt && (Date.now() - new Date(s.updatedAt).getTime() > 1000 * 60 * 60 * 24 * 5));

  if (staleShipments.length > 2) {
    bottlenecks.push({
      id: 'bottleneck-updates',
      title: 'Stale Tracking Updates',
      description: 'Multiple shipments have not been updated for 5+ days.',
      severity: 'High',
      mitigation: 'Bulk update shipments with latest status.'
    });
  }

  return bottlenecks;
};

export const generatePartnerRecommendations = (
  profile: PartnerProfile,
  insights: PartnerSettlementInsight
): string[] => {
  const recs = [];
  if (profile && profile.performanceScore < 70) recs.push("Improve responsiveness to tracking update requests.");
  if (insights && insights.disputedCount > 0) recs.push("Review and resolve disputed settlements.");
  if (recs.length === 0) recs.push("Maintain current high performance levels.");
  return recs;
};

export const generatePartnerFinancialSummary = (
  partnerId: string,
  financials: FinancialEntry[]
): { receivable: number; payable: number; net: number } => {
  const safeFinancials = Array.isArray(financials) ? financials : [];
  const partnerFins = safeFinancials.filter(f => f && (f.customerName === partnerId || f.counterparty === partnerId));
  const receivable = partnerFins.filter(f => f.type === 'income').reduce((acc, f) => acc + f.amount, 0);
  const payable = partnerFins.filter(f => f.type === 'expense').reduce((acc, f) => acc + f.amount, 0);

  return {
    receivable,
    payable,
    net: receivable - payable,
  };
};

export const calculatePartnerCommunicationReadiness = (partnerId: string): number => {
  // Mock logic based on readiness
  return 85;
};

export const generatePartnerPerformanceScorecard = (partner: PartnerProfile): PartnerPerformanceDetails => {
  return {
    responsiveness: partner.communicationReadiness,
    settlementReadiness: 90,
    shipmentExecution: partner.performanceScore,
    documentCompleteness: 85,
    bottleneckRate: 15,
    overallHealth: partner.healthStatus,
  };
};

export const generatePartnerCommunicationInsight = (partnerId: string): PartnerCommunicationInsight => {
  return {
    readiness: 85,
    followUpSuggestions: ["Confirm ETA for shipment #TR-293", "Review settlement for Period 2026-04"],
    updateSummary: "Stable engagement with 3 active deals and 5 shipments.",
    suggestedTopics: ["Logistics capacity for next month", "Payment term review"],
    nextCheckIn: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toLocaleDateString(),
  };
};
