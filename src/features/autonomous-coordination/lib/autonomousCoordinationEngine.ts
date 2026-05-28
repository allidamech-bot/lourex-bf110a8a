import { PurchaseRequest, DealOperation, FinancialEntry, PartnerSettlement, FinancialEditRequest } from "@/types/lourex";

export interface OperationalBlocker {
  id: string;
  type: 'missing_info' | 'financial_lock' | 'partner_assignment' | 'shipping_delay' | 'settlement_dispute';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  impactedEntityId: string;
  impactedEntityType: 'request' | 'deal' | 'shipment' | 'finance';
  propagationRisk: number; // 0-100
}

export interface ExecutionStep {
  id: string;
  action: string;
  priority: 'Urgent' | 'High' | 'Normal';
  expectedImpact: string;
  owner: string;
  targetId: string;
}

export interface OperationalPlan {
  id: string;
  title: string;
  priorities: ExecutionStep[];
  blockers: OperationalBlocker[];
  readinessScore: number;
  confidenceScore: number;
}

export interface WorkflowDependency {
  sourceId: string;
  targetId: string;
  type: 'prerequisite' | 'blocker' | 'link';
  status: 'Met' | 'Pending' | 'Blocked';
  description: string;
}

export interface OperationalMomentum {
  state: 'Strong' | 'Stable' | 'Slowing' | 'Blocked';
  score: number;
  throughputQuality: number;
  riskDrag: number;
  stalledCount: number;
  completionTrend: 'up' | 'down' | 'flat';
}

export interface NextBestAction {
  id: string;
  action: string;
  reason: string;
  owner: string;
  urgency: 'Critical' | 'High' | 'Normal';
  expectedOutcome: string;
}

export interface CoordinationWarning {
  id: string;
  title: string;
  description: string;
  type: 'conflict' | 'missing_data' | 'overload' | 'financial';
}

/**
 * Autonomous Coordination Engine - Local Deterministic Intelligence
 */

export const detectOperationalBlockers = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  financials: FinancialEntry[],
  editRequests: FinancialEditRequest[]
): OperationalBlocker[] => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeDeals = Array.isArray(deals) ? deals : [];
  const safeEditRequests = Array.isArray(editRequests) ? editRequests : [];
  const blockers: OperationalBlocker[] = [];

  // Request Blockers
  safeRequests.forEach(r => {
    if (r && r.status === 'awaiting_clarification') {
      blockers.push({
        id: `blocker-req-${r.id}`,
        type: 'missing_info',
        severity: 'High',
        description: `Request ${r.requestNumber} is stalled awaiting customer clarification.`,
        impactedEntityId: r.id,
        impactedEntityType: 'request',
        propagationRisk: 60,
      });
    }
  });

  // Deal/Shipment Blockers
  safeDeals.forEach(d => {
    if (!d) return;
    if (d.operationalStatus === 'awaiting_assignment') {
      blockers.push({
        id: `blocker-deal-assign-${d.id}`,
        type: 'partner_assignment',
        severity: 'Critical',
        description: `Deal ${d.dealNumber} has no assigned partners.`,
        impactedEntityId: d.id,
        impactedEntityType: 'deal',
        propagationRisk: 90,
      });
    }
    if (String(d.shipmentStage ?? "").toLowerCase().includes('customs_clearance')) {
      // Potentially stuck if no updates for 3 days
      const lastUpdate = d.trackingUpdates?.[0]?.occurredAt;
      if (lastUpdate && (Date.now() - new Date(lastUpdate).getTime() > 1000 * 60 * 60 * 24 * 3)) {
         blockers.push({
          id: `blocker-ship-customs-${d.id}`,
          type: 'shipping_delay',
          severity: 'High',
          description: `Shipment ${d.dealNumber} has been in customs for >3 days.`,
          impactedEntityId: d.id,
          impactedEntityType: 'deal',
          propagationRisk: 40,
        });
      }
    }
  });

  // Financial Blockers
  safeEditRequests.forEach(er => {
    if (er && er.status === 'pending') {
      blockers.push({
        id: `blocker-fin-edit-${er.id}`,
        type: 'financial_lock',
        severity: 'Medium',
        description: `Pending edit request for ${er.targetEntryNumber} prevents financial locking.`,
        impactedEntityId: er.id,
        impactedEntityType: 'finance',
        propagationRisk: 30,
      });
    }
  });

  return blockers;
};

export const detectWorkflowDependencies = (
  requests: PurchaseRequest[],
  deals: DealOperation[]
): WorkflowDependency[] => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeDeals = Array.isArray(deals) ? deals : [];
  const dependencies: WorkflowDependency[] = [];

  safeDeals.forEach(d => {
    if (d && d.sourceRequestId) {
      const req = safeRequests.find(r => r && r.id === d.sourceRequestId);
      dependencies.push({
        sourceId: d.sourceRequestId,
        targetId: d.id,
        type: 'prerequisite',
        status: req?.status === 'completed' ? 'Met' : 'Pending',
        description: `Deal ${d.dealNumber} depends on Request ${req?.requestNumber || 'Unknown'}.`
      });
    }
  });

  return dependencies;
};

export const analyzeBlockerPropagation = (blockers: OperationalBlocker[]): OperationalBlocker[] => {
  const safeBlockers = Array.isArray(blockers) ? blockers : [];
  return safeBlockers.map(b => {
    if (!b) return b;
    let risk = b.propagationRisk;
    if (b.severity === 'Critical') risk += 20;
    if (b.severity === 'High') risk += 10;
    return { ...b, propagationRisk: Math.min(100, risk) };
  });
};

export const generateExecutionSequence = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  blockers: OperationalBlocker[]
): ExecutionStep[] => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeDeals = Array.isArray(deals) ? deals : [];
  const safeBlockers = Array.isArray(blockers) ? blockers : [];
  const steps: ExecutionStep[] = [];

  // 1. Critical Assignment fixes
  safeBlockers.filter(b => b && b.type === 'partner_assignment' && b.severity === 'Critical').forEach(b => {
    steps.push({
      id: `step-assign-${b.impactedEntityId}`,
      action: 'Assign Partners',
      priority: 'Urgent',
      expectedImpact: 'Unlocks operational execution for this deal.',
      owner: 'Operations Manager',
      targetId: b.impactedEntityId
    });
  });

  // 2. Ready for conversion
  safeRequests.filter(r => r && r.status === 'ready_for_conversion').forEach(r => {
    steps.push({
      id: `step-convert-${r.id}`,
      action: 'Convert to Deal',
      priority: 'High',
      expectedImpact: 'Transitions lead to active revenue-generating deal.',
      owner: 'Operations Team',
      targetId: r.id
    });
  });

  // 3. Address High Severity Blockers
  safeBlockers.filter(b => b && b.severity === 'High' && b.type === 'missing_info').forEach(b => {
    steps.push({
      id: `step-followup-${b.impactedEntityId}`,
      action: 'Follow up with Customer',
      priority: 'High',
      expectedImpact: 'Resolves information gap to resume workflow.',
      owner: 'Customer Success',
      targetId: b.impactedEntityId
    });
  });

  return steps.slice(0, 10); // Return top 10 steps
};

export const calculateReadinessScore = (requests: PurchaseRequest[], deals: DealOperation[]): number => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  if (safeRequests.length === 0) return 100;
  const ready = safeRequests.filter(r => r && r.status === 'ready_for_conversion').length;
  const underReview = safeRequests.filter(r => r && r.status === 'under_review').length;
  return Math.round(((ready + (underReview * 0.5)) / safeRequests.length) * 100);
};

export const calculateExecutionConfidence = (blockers: OperationalBlocker[]): number => {
  const safeBlockers = Array.isArray(blockers) ? blockers : [];
  const criticalCount = safeBlockers.filter(b => b && b.severity === 'Critical').length;
  const highCount = safeBlockers.filter(b => b && b.severity === 'High').length;
  const base = 100;
  const penalty = (criticalCount * 15) + (highCount * 5);
  return Math.max(0, base - penalty);
};

export const generateAutonomousOperationsPlan = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  financials: FinancialEntry[],
  editRequests: FinancialEditRequest[]
): OperationalPlan => {
  const blockers = detectOperationalBlockers(requests, deals, financials, editRequests);
  const sequence = generateExecutionSequence(requests, deals, blockers);
  const readiness = calculateReadinessScore(requests, deals);
  const confidence = calculateExecutionConfidence(blockers);

  return {
    id: 'current-plan',
    title: `Autonomous Plan for ${new Date().toLocaleDateString()}`,
    priorities: sequence,
    blockers,
    readinessScore: readiness,
    confidenceScore: confidence,
  };
};

export const analyzeOperationalMomentum = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  blockers: OperationalBlocker[]
): OperationalMomentum => {
  const stalled = blockers.length;
  const activeCount = deals.filter(d => d.operationalStatus !== 'closed' && d.operationalStatus !== 'delivered').length;
  const completedRecent = deals.filter(d => {
    const created = new Date(d.createdAt).getTime();
    return (Date.now() - created) < 1000 * 60 * 60 * 24 * 7 && d.operationalStatus === 'closed';
  }).length;

  let score = 50;
  if (activeCount > 0) score += (completedRecent / activeCount) * 50;
  score -= (stalled * 5);
  score = Math.min(100, Math.max(0, score));

  let state: OperationalMomentum['state'] = 'Stable';
  if (score > 80) state = 'Strong';
  else if (score < 40) state = 'Slowing';
  if (blockers.some(b => b.severity === 'Critical')) state = 'Blocked';

  return {
    state,
    score: Math.round(score),
    throughputQuality: 85, // Heuristic
    riskDrag: stalled * 2,
    stalledCount: stalled,
    completionTrend: completedRecent > 2 ? 'up' : 'flat',
  };
};

export const generateSuggestedNextActions = (
  plan: OperationalPlan,
  momentum: OperationalMomentum
): NextBestAction[] => {
  const actions: NextBestAction[] = [];

  plan.priorities.forEach(p => {
    actions.push({
      id: `nba-${p.id}`,
      action: p.action,
      reason: p.expectedImpact,
      owner: p.owner,
      urgency: p.priority === 'Urgent' ? 'Critical' : p.priority === 'High' ? 'High' : 'Normal',
      expectedOutcome: 'Improved operational throughput.'
    });
  });

  return actions.slice(0, 5);
};

export const generateCoordinationWarnings = (
  blockers: OperationalBlocker[],
  dependencies: WorkflowDependency[]
): CoordinationWarning[] => {
  const warnings: CoordinationWarning[] = [];

  blockers.filter(b => b.severity === 'Critical').forEach(b => {
    warnings.push({
      id: `warn-${b.id}`,
      title: 'Critical Path Blocked',
      description: b.description,
      type: 'conflict'
    });
  });

  dependencies.filter(d => d.status === 'Blocked').forEach(d => {
    warnings.push({
      id: `warn-dep-${d.sourceId}`,
      title: 'Dependency Conflict',
      description: d.description,
      type: 'conflict'
    });
  });

  return warnings;
};
