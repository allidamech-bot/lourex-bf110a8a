import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, CheckCircle2, RefreshCw, ShieldAlert, TrendingUp, ClipboardList } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildOperationsBriefingReport,
  type OperationsBriefingMetric,
  type OperationsBriefingRecommendation,
  type OperationsBriefingReport,
  type OperationsRiskLevel,
} from "@/domain/operations/operationsBriefing";
import {
  fetchDeals,
  fetchFinancialEditRequests,
  fetchRequests,
  fetchShipments,
} from "@/domain/operations/service";
import { logOperationalError } from "@/lib/monitoring";
import { OperationsHealthCenter } from "@/features/operations-intelligence/components/OperationsHealthCenter";
import { OperationalRiskCenter, type OperationalRisk } from "@/features/operations-intelligence/components/OperationalRiskCenter";
import { generateRecommendations } from "@/features/operations-intelligence/lib/operationsRecommendationEngine";
import {
  generateBranchProfiles,
  generateTeamWorkloadInsights,
  calculateBranchRiskScore
} from "@/features/organization-intelligence/lib/organizationIntelligenceEngine";
import { BranchRiskScorePanel } from "@/features/organization-intelligence/components/BranchRiskScorePanel";
import { TeamWorkloadDistribution } from "@/features/organization-intelligence/components/TeamWorkloadDistribution";
import {
  detectOperationalBlockers,
  generateExecutionSequence,
} from "@/features/autonomous-coordination/lib/autonomousCoordinationEngine";
import { ExecutionSequencePanel } from "@/features/autonomous-coordination/components/ExecutionSequencePanel";
import {
  generatePartnerProfiles,
  generatePartnerPerformanceScorecard,
  detectPartnerBottlenecks
} from "@/features/partner-intelligence/lib/partnerIntelligenceEngine";
import { PartnerPerformanceScorecard } from "@/features/partner-intelligence/components/PartnerPerformanceScorecard";
import { PartnerBottleneckAlerts } from "@/features/partner-intelligence/components/PartnerBottleneckAlerts";
import {
  generateCustomerProfiles,
  generateCustomerFollowupRecommendations
} from "@/features/customer-success-intelligence/lib/customerSuccessEngine";
import { CustomerFollowupCenter } from "@/features/customer-success-intelligence/components/CustomerFollowupCenter";
import { CustomerPriorityMatrix } from "@/features/customer-success-intelligence/components/CustomerPriorityMatrix";
import {
  generateExecutiveWorkspaceState
} from "@/features/executive-command/lib/executiveWorkspaceEngine";
import { ExecutiveCommandWorkspace } from "@/features/executive-command/components/ExecutiveCommandWorkspace";
import { CriticalActionQueue } from "@/features/executive-command/components/CriticalActionQueue";
import type { OperationsDeal, OperationsRequest } from "@/domain/operations/types";
import { DashboardGrid } from "@/components/layout/DashboardGrid";
import { cn } from "@/lib/utils";

const riskTone: Record<OperationsRiskLevel, string> = {
  excellent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  good: "border-amber-200/30 bg-amber-500/5 text-amber-200",
  needs_attention: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
};

const severityTone: Record<OperationsBriefingMetric["severity"], string> = {
  info: "border-amber-200/30 bg-stone-50/5 text-amber-200",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
};

const priorityTone: Record<OperationsBriefingRecommendation["priority"], string> = {
  low: "border-stone-700 bg-stone-800 text-stone-500",
  medium: "border-amber-200/30 bg-stone-50/5 text-amber-200",
  high: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
};

const riskLabel: Record<OperationsRiskLevel, string> = {
  excellent: "Excellent",
  good: "Good",
  needs_attention: "Needs attention",
  critical: "Critical",
};

const riskIcon = {
  excellent: CheckCircle2,
  good: TrendingUp,
  needs_attention: AlertTriangle,
  critical: ShieldAlert,
};

export function OperationsBriefingWidget() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<OperationsBriefingReport | null>(null);
  const [deals, setDeals] = useState<OperationsDeal[]>([]);
  const [requests, setRequests] = useState<OperationsRequest[]>([]);
  const [shipments, setShipments] = useState<Awaited<ReturnType<typeof fetchShipments>>>([]);
  const [editRequests, setEditRequests] = useState<Awaited<ReturnType<typeof fetchFinancialEditRequests>>>([]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [rpt, dealsData, requestsData, shipmentsData, editsData] = await Promise.all([
        buildOperationsBriefingReport(),
        fetchDeals(),
        fetchRequests(),
        fetchShipments(),
        fetchFinancialEditRequests(),
      ]);
      setReport(rpt);
      setDeals(dealsData);
      setRequests(requestsData);
      setShipments(shipmentsData);
      setEditRequests(editsData);
    } catch (error) {
      logOperationalError("operations_briefing_widget_load", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const operationalRisks = useMemo<OperationalRisk[]>(() => {
    const risks: OperationalRisk[] = [];
    const delayedShipments = deals.filter(d => d.shipmentStage === "customs_clearance" || d.shipmentStage === "in_transit");

    if (delayedShipments.length > 0) {
      risks.push({
        id: "risk-delayed",
        type: "delay",
        level: delayedShipments.length > 3 ? "HIGH" : "MEDIUM",
        title: `${delayedShipments.length} shipments in high-latency stages`,
        titleAr: `${delayedShipments.length} شحنات في مراحل بطيئة`,
        recommendation: "Check clearing status and follow up with local Saudi agent.",
        recommendationAr: "تحقق من حالة التخليص وتابع مع وكيل السعودية المحلي.",
      });
    }

    const pendingEdits = editRequests.filter(e => e.status === "pending");
    if (pendingEdits.length > 0) {
      risks.push({
        id: "risk-accounting",
        type: "missing_info",
        level: "MEDIUM",
        title: `${pendingEdits.length} pending financial adjustments`,
        titleAr: `${pendingEdits.length} تعديلات مالية معلقة`,
        recommendation: "Review and lock financial entries to prevent settlement delays.",
        recommendationAr: "راجع وأقفل القيود المالية لتجنب تأخير التسويات.",
      });
    }

    return risks;
  }, [deals, editRequests]);

  const branchProfiles = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generateBranchProfiles(requests as any, deals as any, []),
    [requests, deals]
  );

  const branchRiskScores = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => branchProfiles.map(b => calculateBranchRiskScore(b.id, requests as any, deals as any, [])),
    [branchProfiles, requests, deals]
  );

  const teamWorkload = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generateTeamWorkloadInsights(requests as any, deals as any),
    [requests, deals]
  );

  const autonomousBlockers = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => detectOperationalBlockers(requests as any, deals as any, [], editRequests as any),
    [requests, deals, editRequests]
  );

  const executionSequence = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generateExecutionSequence(requests as any, deals as any, autonomousBlockers),
    [requests, deals, autonomousBlockers]
  );

  const partnerProfiles = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generatePartnerProfiles(requests as any, deals as any, shipments, []),
    [requests, deals, shipments]
  );

  const partnerScorecards = useMemo(
    () => partnerProfiles.slice(0, 2).map(p => ({
      name: p.name,
      scorecard: generatePartnerPerformanceScorecard(p)
    })),
    [partnerProfiles]
  );

  const partnerBottlenecks = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => partnerProfiles.slice(0, 2).flatMap(p => detectPartnerBottlenecks(p.id, deals as any, shipments)),
    [partnerProfiles, deals, shipments]
  );

  const customerProfiles = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generateCustomerProfiles(requests as any, deals as any, []),
    [requests, deals]
  );

  const customerFollowups = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generateCustomerFollowupRecommendations(customerProfiles, requests as any),
    [customerProfiles, requests]
  );

  const executiveWorkspaceState = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generateExecutiveWorkspaceState(requests as any, deals as any, [], [], editRequests as any),
    [requests, deals, editRequests]
  );

  const topRecommendations = useMemo(() => report?.recommendations.slice(0, 4) || [], [report]);

  if (loading && !report) {
    return (
      <BentoCard className="p-8">
        <Skeleton className="h-12 w-1/3 mb-8" />
        <DashboardGrid variant="kpi">
           {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </DashboardGrid>
      </BentoCard>
    );
  }

  if (!report) return null;

  const RiskIcon = riskIcon[report.riskLevel];

  return (
    <BentoCard className="p-8 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl space-y-12">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-950/20">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/80">AI Operations Fabric</p>
              <h3 className="font-serif text-3xl font-bold text-stone-100 mt-1">Today's operations briefing</h3>
            </div>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-stone-500 font-medium">
            Real-time risk-weighted synthesis of systemic throughput, partner performance, and customer success queues.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={cn("font-black uppercase tracking-widest text-[10px] px-4 py-1.5 h-10 flex items-center border", riskTone[report.riskLevel])} variant="outline">
            <RiskIcon className="mr-2 h-4 w-4" />
            {riskLabel[report.riskLevel]} · {report.riskScore}% Readiness
          </Badge>
          <Button variant="outline" size="lg" onClick={() => void loadReport()} disabled={loading} className="rounded-xl border-amber-200/10 bg-stone-950/40 text-stone-200 hover:text-amber-200 h-10">
            <RefreshCw className={cn("me-2 h-4 w-4", loading && "animate-spin text-amber-500")} />
            Sync Fabric
          </Button>
        </div>
      </div>

      {!loading && (
        <div className="space-y-12">
          <ExecutiveCommandWorkspace state={executiveWorkspaceState} />

          <DashboardGrid variant="balanced">
            <OperationsHealthCenter
              activeRequests={requests.filter(r => r.status !== "completed" && r.status !== "cancelled").length}
              pendingOperations={deals.filter(d => d.operationalStatus !== "delivered" && d.operationalStatus !== "closed").length}
              inTransitCount={shipments.filter(s => s.stage === "in_transit").length}
              delayedCount={shipments.filter(s => s.stage !== "delivered" && s.stage !== "closed").length}
              blockedWorkflows={editRequests.filter(e => e.status === "pending").length}
              completionScore={82}
            />
            <OperationalRiskCenter risks={operationalRisks} />
          </DashboardGrid>

          <DashboardGrid variant="balanced">
            <CriticalActionQueue actions={executiveWorkspaceState.criticalActions} />
            <ExecutionSequencePanel steps={executionSequence} />
          </DashboardGrid>

          <div className="space-y-8">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-600 text-center">Branch & Partner Audit</p>
            <DashboardGrid variant="balanced">
              <div className="space-y-6">
                {partnerScorecards.map(ps => (
                  <PartnerPerformanceScorecard key={ps.name} details={ps.scorecard} partnerName={ps.name} />
                ))}
              </div>
              <BranchRiskScorePanel risks={branchRiskScores} />
            </DashboardGrid>
          </div>

          <div className="space-y-8">
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-600 text-center">Success & Workload</p>
             <DashboardGrid variant="balanced">
              <CustomerFollowupCenter recommendations={customerFollowups.slice(0, 5)} />
              <TeamWorkloadDistribution workloads={teamWorkload} />
            </DashboardGrid>
          </div>
        </div>
      )}

      <div className="space-y-8 pt-12 border-t border-amber-200/5">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600">Metric Breakdown</p>
        <DashboardGrid variant="kpi">
          {report.metrics.map((metric) => (
            <div key={metric.id} className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <ClipboardList className="h-4 w-4 text-stone-700" />
                <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border", severityTone[metric.severity])} variant="outline">
                  {metric.severity}
                </Badge>
              </div>
              <p className="text-3xl font-black text-stone-100">{metric.value}</p>
              <p className="mt-1 text-[10px] font-black text-stone-500 uppercase tracking-widest">{metric.label}</p>
              <p className="mt-3 text-xs leading-5 text-stone-600 font-medium">{metric.description}</p>
            </div>
          ))}
        </DashboardGrid>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr] pt-8">
        <BentoCard className="p-6 border-amber-200/5 bg-stone-950/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-600 mb-6">Synthesis Coverage</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <SourceCount label="Requests" value={report.sourceCounts.requests} />
            <SourceCount label="Deals" value={report.sourceCounts.deals} />
            <SourceCount label="Shipments" value={report.sourceCounts.shipments} />
            <SourceCount label="Finance" value={report.sourceCounts.financialEditRequests} />
          </div>
          <p className="mt-8 text-[9px] font-black uppercase tracking-[0.2em] text-stone-800 text-center">Verified at {new Date(report.generatedAt).toLocaleTimeString()}</p>
        </BentoCard>

        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-600 px-2">Priority Directives</p>
          <div className="grid grid-cols-1 gap-4">
            {topRecommendations.map((item) => (
              <div key={item.id} className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-5 group hover:border-amber-200/20 transition-all">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="font-bold text-stone-200 uppercase tracking-tight text-sm">{item.title}</p>
                    {item.entityLabel && <p className="mt-1 text-[10px] font-black text-amber-500/50 uppercase tracking-widest">{item.entityLabel}</p>}
                  </div>
                  <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border", priorityTone[item.priority])} variant="outline">
                    {item.priority}
                  </Badge>
                </div>
                <p className="text-xs leading-6 text-stone-500 font-medium mb-4 italic">"{item.reason}"</p>
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-xs leading-6 text-amber-200 font-bold">{item.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BentoCard>
  );
}

const SourceCount = ({ label, value }: { label: string; value: number }) => (
  <div className="p-4 rounded-xl bg-stone-900/50 border border-stone-800">
    <p className="text-[9px] font-black uppercase tracking-widest text-stone-600 mb-1">{label}</p>
    <p className="text-xl font-black text-stone-200">{value}</p>
  </div>
);
