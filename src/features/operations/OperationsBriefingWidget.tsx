import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, CheckCircle2, ClipboardList, RefreshCw, ShieldAlert, TrendingUp } from "lucide-react";
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
  fetchAuditCount,
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
import type { OperationsDeal, OperationsRequest } from "@/domain/operations/types";

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
  const [shipments, setShipments] = useState<any[]>([]);
  const [editRequests, setEditRequests] = useState<any[]>([]);

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

  const recommendations = useMemo(
    () => generateRecommendations(deals, requests),
    [deals, requests]
  );

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
    () => generateBranchProfiles(requests as any, deals as any, []),
    [requests, deals]
  );

  const branchRiskScores = useMemo(
    () => branchProfiles.map(b => calculateBranchRiskScore(b.id, requests as any, deals as any, [])),
    [branchProfiles, requests, deals]
  );

  const teamWorkload = useMemo(
    () => generateTeamWorkloadInsights(requests as any, deals as any),
    [requests, deals]
  );

  const topRecommendations = useMemo(() => report?.recommendations.slice(0, 4) || [], [report]);

  if (loading && !report) {
    return (
      <BentoCard className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-36 rounded-2xl" />
      </BentoCard>
    );
  }

  if (!report) return null;

  const RiskIcon = riskIcon[report.riskLevel];

  return (
    <BentoCard className="space-y-5 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">AI Operations Brain</p>
              <h3 className="font-serif text-2xl font-semibold text-stone-100">Today's operations briefing</h3>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400 font-medium">
            Risk-weighted operational summary based on purchase requests, deals, shipments, and financial review queues.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${riskTone[report.riskLevel]} font-bold uppercase tracking-wider text-[10px] px-3 py-1`} variant="outline">
            <RiskIcon className="mr-1.5 h-3.5 w-3.5" />
            {riskLabel[report.riskLevel]} · {report.riskScore}/100
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void loadReport()} disabled={loading} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
            <RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin text-amber-500" : "text-amber-500"}`} />
            Refresh
          </Button>
        </div>
      </div>

      {!loading && (
        <div className="space-y-6">
          <div className="grid gap-5 xl:grid-cols-2">
            <OperationsHealthCenter
              activeRequests={requests.filter(r => r.status !== "completed" && r.status !== "cancelled").length}
              pendingOperations={deals.filter(d => d.operationalStatus !== "delivered" && d.operationalStatus !== "closed").length}
              inTransitCount={shipments.filter(s => s.stage === "in_transit").length}
              delayedCount={shipments.filter(s => s.stage !== "delivered" && s.stage !== "closed").length}
              blockedWorkflows={editRequests.filter(e => e.status === "pending").length}
              completionScore={82}
            />
            <OperationalRiskCenter risks={operationalRisks} />
          </div>

          <BranchRiskScorePanel risks={branchRiskScores} />
          <TeamWorkloadDistribution workloads={teamWorkload} />
        </div>
      )}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
        {report.metrics.map((metric) => (
          <div key={metric.id} className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <ClipboardList className="h-4 w-4 text-stone-600" />
              <Badge className={`${severityTone[metric.severity]} text-[10px] font-bold uppercase tracking-widest px-2 py-0.5`} variant="outline">
                {metric.severity}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-stone-100">{metric.value}</p>
            <p className="mt-1 text-sm font-bold text-stone-300 uppercase tracking-tight">{metric.label}</p>
            <p className="mt-2 text-xs leading-5 text-stone-500 font-medium">{metric.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600 mb-4">Source coverage</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SourceCount label="Requests" value={report.sourceCounts.requests} />
            <SourceCount label="Deals" value={report.sourceCounts.deals} />
            <SourceCount label="Shipments" value={report.sourceCounts.shipments} />
            <SourceCount label="Finance reviews" value={report.sourceCounts.financialEditRequests} />
          </div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-stone-700">Generated {new Date(report.generatedAt).toLocaleString()}</p>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">Recommended priorities</p>
          {topRecommendations.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-400 font-medium">
              No urgent operational priorities detected from the current data.
            </div>
          ) : (
            topRecommendations.map((item) => (
              <div key={item.id} className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-bold text-stone-200 uppercase tracking-tight">{item.title}</p>
                  <Badge className={`${priorityTone[item.priority]} text-[10px] font-bold uppercase tracking-widest px-2 py-0.5`} variant="outline">
                    {item.priority}
                  </Badge>
                </div>
                {item.entityLabel ? <p className="mt-1 text-[10px] font-bold text-stone-500 uppercase tracking-widest">{item.entityLabel}</p> : null}
                <p className="mt-2 text-sm leading-6 text-stone-400 font-medium">{item.reason}</p>
                <p className="mt-3 text-sm leading-7 text-amber-200 font-bold border-t border-amber-200/10 pt-3">{item.action}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </BentoCard>
  );
}

const SourceCount = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl bg-stone-950/40 border border-amber-200/5 p-3">
    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{label}</p>
    <p className="mt-1 text-lg font-bold text-stone-200">{value}</p>
  </div>
);
