import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Database, RefreshCw, ShieldAlert } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildSystemHealthReport, type SystemHealthCheck, type SystemHealthReport, type SystemHealthStatus } from "@/domain/system/health";
import { toast } from "sonner";

const statusClass: Record<SystemHealthStatus, string> = {
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  error: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const statusIcon = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: ShieldAlert,
};

const statusLabel: Record<SystemHealthStatus, string> = {
  ok: "Healthy",
  warning: "Needs review",
  error: "Action required",
};

const checkGroupLabel = (check: SystemHealthCheck) => {
  if (check.id.startsWith("table-")) return "Tables";
  if (check.id.startsWith("storage-")) return "Storage";
  if (check.id.includes("supabase")) return "Runtime";
  return "System";
};

export function SystemHealthPanel() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SystemHealthReport | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const nextReport = await buildSystemHealthReport();
      setReport(nextReport);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load system health report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const summary = useMemo(() => {
    const checks = report?.checks || [];
    return {
      ok: checks.filter((check) => check.status === "ok").length,
      warning: checks.filter((check) => check.status === "warning").length,
      error: checks.filter((check) => check.status === "error").length,
      total: checks.length,
    };
  }, [report]);

  const groupedChecks = useMemo(() => {
    const groups = new Map<string, SystemHealthCheck[]>();
    (report?.checks || []).forEach((check) => {
      const group = checkGroupLabel(check);
      groups.set(group, [...(groups.get(group) || []), check]);
    });
    return Array.from(groups.entries());
  }, [report]);

  if (loading && !report) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[1.75rem]" />
        <Skeleton className="h-64 rounded-[1.75rem]" />
      </div>
    );
  }

  if (!report) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="System health is unavailable"
        description="Refresh the report or verify the current Lovable Cloud runtime configuration."
      />
    );
  }

  const OverallIcon = statusIcon[report.overallStatus];

  return (
    <div className="space-y-5">
      <BentoCard className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">System Health</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <OverallIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-serif text-3xl font-semibold">{statusLabel[report.overallStatus]}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generated {new Date(report.generatedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Runtime checks for Lovable Cloud configuration, critical tables, optional backend features, and storage buckets. This panel is read-only and does not require direct SQL access.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadReport()} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            Refresh report
          </Button>
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
          <HealthMetric icon={Activity} label="Total checks" value={summary.total} />
          <HealthMetric icon={CheckCircle2} label="Healthy" value={summary.ok} status="ok" />
          <HealthMetric icon={AlertTriangle} label="Warnings" value={summary.warning} status="warning" />
          <HealthMetric icon={ShieldAlert} label="Errors" value={summary.error} status="error" />
        </div>
      </BentoCard>

      {groupedChecks.map(([group, checks]) => (
        <BentoCard key={group} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-semibold">{group}</h3>
              <p className="text-sm text-muted-foreground">{checks.length} checks</p>
            </div>
          </div>
          <div className="space-y-3">
            {checks.map((check) => {
              const Icon = statusIcon[check.status];
              return (
                <div key={check.id} className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold">{check.label}</p>
                        <Badge className={statusClass[check.status]} variant="outline">
                          {check.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{check.details}</p>
                    </div>
                  </div>
                  {check.metadata ? (
                    <pre className="mt-3 max-h-44 overflow-auto rounded-xl bg-secondary/30 p-3 text-xs leading-5 text-muted-foreground">
                      {JSON.stringify(check.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>
              );
            })}
          </div>
        </BentoCard>
      ))}
    </div>
  );
}

const HealthMetric = ({
  icon: Icon,
  label,
  value,
  status,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  status?: SystemHealthStatus;
}) => (
  <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={status ? `text-xl font-semibold ${statusClass[status].split(" ").at(-1) || ""}` : "text-xl font-semibold"}>{value}</p>
      </div>
    </div>
  </div>
);
