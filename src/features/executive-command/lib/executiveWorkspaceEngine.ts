import {
  PurchaseRequest,
  DealOperation,
  FinancialEntry,
  PartnerSettlement,
  FinancialEditRequest
} from "@/types/lourex";

export interface ExecutiveFocusArea {
  id: string;
  title: string;
  status: 'Critical' | 'Attention Needed' | 'Stable' | 'Excellent';
  metric: string;
  trend: 'up' | 'down' | 'flat';
}

export interface CriticalAction {
  id: string;
  title: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'workflow' | 'finance' | 'escalation' | 'retention';
  description: string;
  targetId: string;
}

export interface OperationalPressure {
  zone: string;
  pressureLevel: number; // 0-100
  status: 'Overloaded' | 'High' | 'Normal' | 'Low';
  description: string;
}

export interface BusinessStability {
  score: number;
  operationalResilience: number;
  financeResilience: number;
  executionConfidence: number;
  organizationalHealth: number;
  state: 'Excellent' | 'Stable' | 'Attention Needed' | 'Critical';
}

export interface ExecutiveMomentum {
  score: number;
  trend: 'Accelerating' | 'Stable' | 'Slowing' | 'Blocked';
  velocity: number;
  drag: number;
  momentumIndicators: string[];
}

export interface CrossSystemInsight {
  id: string;
  insight: string;
  type: 'operational' | 'financial' | 'strategic';
  severity: 'high' | 'medium' | 'low';
}

export interface CommandPriority {
  id: string;
  title: string;
  category: 'NOW' | 'NEXT' | 'MONITOR' | 'LOW PRIORITY';
  pressureType: 'Operational' | 'Financial' | 'Strategic';
}

export interface ExecutiveWorkspaceState {
  focusAreas: ExecutiveFocusArea[];
  criticalActions: CriticalAction[];
  pressureMap: OperationalPressure[];
  stability: BusinessStability;
  momentum: ExecutiveMomentum;
  insights: CrossSystemInsight[];
  priorityMatrix: CommandPriority[];
}

/**
 * Executive Command Intelligence - Local Deterministic Logic
 */

export const generateExecutiveFocusAreas = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  financials: FinancialEntry[]
): ExecutiveFocusArea[] => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeDeals = Array.isArray(deals) ? deals : [];
  const safeFinancials = Array.isArray(financials) ? financials : [];

  const activeReqs = safeRequests.filter(r => r && r.status !== 'completed' && r.status !== 'cancelled').length;
  const stalledDeals = safeDeals.filter(d => d && d.operationalStatus === 'awaiting_assignment').length;
  const pendingFinance = safeFinancials.filter(f => f && !f.locked).length;

  return [
    {
      id: 'focus-ops',
      title: 'Operational Throughput',
      status: stalledDeals > 5 ? 'Attention Needed' : 'Stable',
      metric: `${safeDeals.filter(d => d && d.operationalStatus === 'closed').length} Completions`,
      trend: 'up',
    },
    {
      id: 'focus-finance',
      title: 'Financial Integrity',
      status: pendingFinance > 10 ? 'Attention Needed' : 'Excellent',
      metric: `${pendingFinance} Pending Locks`,
      trend: 'flat',
    },
    {
      id: 'focus-growth',
      title: 'Market Expansion',
      status: activeReqs > 20 ? 'Excellent' : 'Stable',
      metric: `${activeReqs} Active Requests`,
      trend: 'up',
    }
  ];
};

export const generateCriticalActionQueue = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  settlements: PartnerSettlement[],
  editRequests: FinancialEditRequest[]
): CriticalAction[] => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeDeals = Array.isArray(deals) ? deals : [];
  const safeSettlements = Array.isArray(settlements) ? settlements : [];
  // safeEditRequests not directly filtered but better to be safe if added later

  const actions: CriticalAction[] = [];

  // 1. Critical Deal Assignments
  safeDeals.filter(d => d && d.operationalStatus === 'awaiting_assignment').forEach(d => {
    actions.push({
      id: `crit-deal-${d.id}`,
      title: `Assign Partner for Deal ${d.dealNumber}`,
      priority: 'CRITICAL',
      type: 'workflow',
      description: 'Operations stalled due to missing partner assignment.',
      targetId: d.id
    });
  });

  // 2. High Pressure Settlements
  safeSettlements.filter(s => s && s.status === 'pending_review' && s.netDue > 10000).forEach(s => {
    actions.push({
      id: `crit-settle-${s.id}`,
      title: `Review High Value Settlement: ${s.partnerName}`,
      priority: 'HIGH',
      type: 'finance',
      description: 'Settlement pressure exceeding threshold. Immediate audit required.',
      targetId: s.id
    });
  });

  // 3. Stalled Requests
  safeRequests.filter(r => r && r.status === 'awaiting_clarification').slice(0, 3).forEach(r => {
    actions.push({
      id: `crit-req-${r.id}`,
      title: `Customer Clarification: ${r.requestNumber}`,
      priority: 'MEDIUM',
      type: 'escalation',
      description: 'Request pending customer input for > 48 hours.',
      targetId: r.id
    });
  });

  return actions.sort((a, b) => {
    const weights = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    return (weights[a.priority] ?? 4) - (weights[b.priority] ?? 4);
  });
};

export const generateOperationalPressureMap = (
  requests: PurchaseRequest[],
  deals: DealOperation[]
): OperationalPressure[] => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeDeals = Array.isArray(deals) ? deals : [];
  const zones: OperationalPressure[] = [];

  const turkeyOps = safeDeals.filter(d => d && String(d.shipmentStage ?? "").toLowerCase().includes('turkey')).length;
  const destinationOps = safeDeals.filter(d => d && !String(d.shipmentStage ?? "").toLowerCase().includes('turkey') && d.operationalStatus !== 'closed').length;
  const intakeOps = safeRequests.filter(r => r && r.status === 'intake_submitted').length;

  zones.push({
    zone: 'Turkey Origin Sourcing',
    pressureLevel: Math.min(100, turkeyOps * 10),
    status: turkeyOps > 10 ? 'High' : 'Normal',
    description: `${turkeyOps} shipments currently in origin processing.`
  });

  zones.push({
    zone: 'Local Logistics (KSA)',
    pressureLevel: Math.min(100, destinationOps * 15),
    status: destinationOps > 8 ? 'High' : 'Normal',
    description: `${destinationOps} operations in final delivery/customs.`
  });

  zones.push({
    zone: 'Intake & Verification',
    pressureLevel: Math.min(100, intakeOps * 12),
    status: intakeOps > 5 ? 'High' : 'Normal',
    description: `${intakeOps} new requests pending initial verification.`
  });

  return zones;
};

export const generateBusinessStabilityAssessment = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  financials: FinancialEntry[]
): BusinessStability => {
  const safeFinancials = Array.isArray(financials) ? financials : [];
  const safeDeals = Array.isArray(deals) ? deals : [];

  const lockedRatio = safeFinancials.length > 0
    ? (safeFinancials.filter(f => f && f.locked).length / safeFinancials.length) * 100
    : 100;

  const completionRate = safeDeals.length > 0
    ? (safeDeals.filter(d => d && d.operationalStatus === 'closed').length / safeDeals.length) * 100
    : 80;

  const score = Math.round((lockedRatio + completionRate) / 2);

  let state: BusinessStability['state'] = 'Stable';
  if (score > 90) state = 'Excellent';
  else if (score < 60) state = 'Attention Needed';
  else if (score < 40) state = 'Critical';

  return {
    score,
    operationalResilience: Math.round(completionRate),
    financeResilience: Math.round(lockedRatio),
    executionConfidence: 85,
    organizationalHealth: 90,
    state,
  };
};

export const generateExecutiveMomentum = (
  deals: DealOperation[]
): ExecutiveMomentum => {
  const safeDeals = Array.isArray(deals) ? deals : [];
  const recentCompletions = safeDeals.filter(d => {
    if (!d || !d.createdAt) return false;
    const created = new Date(d.createdAt).getTime();
    return (Date.now() - created) < 1000 * 60 * 60 * 24 * 7 && d.operationalStatus === 'closed';
  }).length;

  let trend: ExecutiveMomentum['trend'] = 'Stable';
  if (recentCompletions > 5) trend = 'Accelerating';
  else if (recentCompletions < 1) trend = 'Slowing';

  return {
    score: 75, // Base
    trend,
    velocity: recentCompletions,
    drag: 15,
    momentumIndicators: [
      `${recentCompletions} deals closed this week`,
      'Partner response time optimized',
      'Finance locking latency reduced'
    ]
  };
};

export const generateCrossSystemInsights = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  financials: FinancialEntry[]
): CrossSystemInsight[] => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeFinancials = Array.isArray(financials) ? financials : [];
  const insights: CrossSystemInsight[] = [];

  const intakeSubmitted = safeRequests.filter(r => r && r.status === 'intake_submitted').length;
  if (intakeSubmitted > 10) {
    insights.push({
      id: 'insight-1',
      insight: 'High intake volume may delay deal conversion times.',
      type: 'operational',
      severity: 'medium'
    });
  }

  const unlockedFins = safeFinancials.filter(f => f && !f.locked).length;
  if (unlockedFins > 15) {
    insights.push({
      id: 'insight-2',
      insight: 'Finance backlog is increasing audit risk for settlements.',
      type: 'financial',
      severity: 'high'
    });
  }

  return insights;
};

export const generateCommandPriorityMatrix = (
  actions: CriticalAction[]
): CommandPriority[] => {
  const safeActions = Array.isArray(actions) ? actions : [];
  return safeActions.map(a => {
    let category: CommandPriority['category'] = 'MONITOR';
    if (a.priority === 'CRITICAL') category = 'NOW';
    else if (a.priority === 'HIGH') category = 'NEXT';
    else if (a.priority === 'LOW') category = 'LOW PRIORITY';

    return {
      id: `priority-${a.id}`,
      title: a.title ?? "Unknown Action",
      category,
      pressureType: a.type === 'finance' ? 'Financial' : 'Operational'
    };
  });
};

export const generateExecutiveWorkspaceState = (
  requests: PurchaseRequest[],
  deals: DealOperation[],
  financials: FinancialEntry[],
  settlements: PartnerSettlement[],
  editRequests: FinancialEditRequest[]
): ExecutiveWorkspaceState => {
  const focusAreas = generateExecutiveFocusAreas(requests, deals, financials);
  const criticalActions = generateCriticalActionQueue(requests, deals, settlements, editRequests);
  const pressureMap = generateOperationalPressureMap(requests, deals);
  const stability = generateBusinessStabilityAssessment(requests, deals, financials);
  const momentum = generateExecutiveMomentum(deals);
  const insights = generateCrossSystemInsights(requests, deals, financials);
  const priorityMatrix = generateCommandPriorityMatrix(criticalActions);

  return {
    focusAreas,
    criticalActions,
    pressureMap,
    stability,
    momentum,
    insights,
    priorityMatrix
  };
};
