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
import { logOperationalError } from "@/lib/monitoring";

const riskTone: Record<OperationsRiskLevel, string> = {
  excellent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  good: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  needs_attention: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const severityTone: Record<OperationsBriefingMetric["severity"], string> = {
  info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const priorityTone: Record<OperationsBriefingRecommendation["priority"], string> = {
  low: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  medium: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  high: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
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

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await buildOperationsBriefingReport());
    } catch (error) {
      logOperationalError("operations_briefing_widget_load", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

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
    <BentoCard className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">AI Operations Brain</p>
              <h3 className="font-serif text-2xl font-semibold">Today's operations briefing</h3>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Risk-weighted operational summary based on purchase requests, deals, shipments, and financial review queues.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={riskTone[report.riskLevel]} variant="outline">
            <RiskIcon className="mr-1 h-3.5 w-3.5" />
            {riskLabel[report.riskLevel]} · {report.riskScore}/100
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void loadReport()} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
        {report.metrics.map((metric) => (
          <div key={metric.id} className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <Badge className={severityTone[metric.severity]} variant="outline">
                {metric.severity}
              </Badge>
            </div>
            <p className="text-2xl font-semibold">{metric.value}</p>
            <p className="mt-1 text-sm font-medium">{metric.label}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{metric.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <div className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
          <p className="text-sm font-semibold">Source coverage</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <SourceCount label="Requests" value={report.sourceCounts.requests} />
            <SourceCount label="Deals" value={report.sourceCounts.deals} />
            <SourceCount label="Shipments" value={report.sourceCounts.shipments} />
            <SourceCount label="Finance reviews" value={report.sourceCounts.financialEditRequests} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Generated {new Date(report.generatedAt).toLocaleString()}</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Recommended priorities</p>
          {topRecommendations.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              No urgent operational priorities detected from the current data.
            </div>
          ) : (
            topRecommendations.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <Badge className={priorityTone[item.priority]} variant="outline">
                    {item.priority}
                  </Badge>
                </div>
                {item.entityLabel ? <p className="mt-1 text-xs text-muted-foreground">{item.entityLabel}</p> : null}
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.reason}</p>
                <p className="mt-2 text-sm leading-6">{item.action}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </BentoCard>
  );
}

const SourceCount = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl bg-background/40 p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold">{value}</p>
  </div>
);
