import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Database, RefreshCw, ShieldAlert } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  loadBackendReadinessReport,
  type BackendReadinessProbe,
  type BackendReadinessReport,
  type BackendReadinessStatus,
} from "@/features/system/backendReadiness";

const statusTone: Record<BackendReadinessStatus, string> = {
  ready: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  missing: "border-red-500/30 bg-red-500/10 text-red-300",
  unknown: "border-stone-700 bg-stone-900 text-stone-400",
};

const overallTone: Record<BackendReadinessReport["overallStatus"], string> = {
  ready: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  attention: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  blocked: "border-red-500/30 bg-red-500/10 text-red-300",
};

const statusIcon = {
  ready: CheckCircle2,
  warning: AlertTriangle,
  missing: ShieldAlert,
  unknown: Clock3,
};

const statusOrder: BackendReadinessStatus[] = ["missing", "warning", "unknown", "ready"];

const formatDateTime = (value: string) => new Date(value).toLocaleString();

const groupByArea = (probes: BackendReadinessProbe[]) =>
  probes.reduce<Record<string, BackendReadinessProbe[]>>((groups, probe) => {
    groups[probe.area] = [...(groups[probe.area] || []), probe];
    return groups;
  }, {});

export function BackendReadinessPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState<BackendReadinessReport | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await loadBackendReadinessReport());
    } catch (loadError) {
      setReport(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load backend readiness report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => groupByArea(report?.probes || []), [report]);

  if (loading) {
    return (
      <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
        <Skeleton className="h-20 rounded-2xl bg-stone-950/40" />
        <Skeleton className="h-32 rounded-2xl bg-stone-950/40" />
        <Skeleton className="h-32 rounded-2xl bg-stone-950/40" />
      </BentoCard>
    );
  }

  if (error || !report) {
    return (
      <BentoCard className="space-y-4 border-red-500/20 bg-red-500/5 backdrop-blur-xl shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-300">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-semibold text-stone-100">Backend readiness could not be loaded</h3>
            <p className="mt-2 text-sm leading-7 text-stone-400">{error || "Unknown readiness error."}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => void load()} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
          <RefreshCw className="me-2 h-4 w-4 text-amber-500" />
          Retry
        </Button>
      </BentoCard>
    );
  }

  return (
    <div className="space-y-4">
      <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Production readiness</p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-100">Lovable Cloud Backend Readiness</h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-400">
                Checks the backend foundation behind public, customer, admin, accounting, tracking, AI, and notification workflows.
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                Generated {formatDateTime(report.generatedAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`${overallTone[report.overallStatus]} font-bold uppercase tracking-widest text-[10px]`}>
              {report.overallStatus}
            </Badge>
            <Button variant="outline" onClick={() => void load()} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
              <RefreshCw className="me-2 h-4 w-4 text-amber-500" />
              Refresh checks
            </Button>
          </div>
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
          <SummaryTile label="Total checks" value={report.summary.total} />
          <SummaryTile label="Ready" value={report.summary.ready} tone="ready" />
          <SummaryTile label="Warnings" value={report.summary.warnings} tone="warning" />
          <SummaryTile label="Missing" value={report.summary.missing} tone="missing" />
          <SummaryTile label="Manual review" value={report.summary.manual} tone="unknown" />
          <SummaryTile label="Critical missing" value={report.summary.criticalMissing} tone={report.summary.criticalMissing > 0 ? "missing" : "ready"} />
        </div>
      </BentoCard>

      {Object.entries(grouped).map(([area, probes]) => (
        <BentoCard key={area} className="space-y-3 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-serif text-xl font-semibold text-stone-100">{area}</h4>
            <Badge variant="outline" className="border-stone-700 bg-stone-900 text-stone-500 font-bold uppercase tracking-widest text-[10px]">
              {probes.length} checks
            </Badge>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {probes
              .slice()
              .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))
              .map((probe) => (
                <ReadinessProbeCard key={probe.id} probe={probe} />
              ))}
          </div>
        </BentoCard>
      ))}
    </div>
  );
}

function SummaryTile({ label, value, tone = "unknown" }: { label: string; value: number; tone?: BackendReadinessStatus }) {
  return (
    <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone === "ready" ? "text-emerald-300" : tone === "warning" ? "text-amber-300" : tone === "missing" ? "text-red-300" : "text-stone-100"}`}>
        {value}
      </p>
    </div>
  );
}

function ReadinessProbeCard({ probe }: { probe: BackendReadinessProbe }) {
  const Icon = statusIcon[probe.status];

  return (
    <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${statusTone[probe.status]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="break-words text-sm font-bold text-stone-100">{probe.label}</h5>
            <Badge variant="outline" className={`${statusTone[probe.status]} font-bold uppercase tracking-widest text-[10px]`}>
              {probe.status}
            </Badge>
            <Badge variant="outline" className="border-stone-700 bg-stone-900 text-stone-500 font-bold uppercase tracking-widest text-[10px]">
              {probe.requirement}
            </Badge>
          </div>
          {probe.table ? (
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-200/70">{probe.table}</p>
          ) : null}
          <p className="mt-2 text-sm leading-6 text-stone-400">{probe.message}</p>
          {probe.details?.description ? (
            <p className="mt-2 text-xs leading-6 text-stone-500">{String(probe.details.description)}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
