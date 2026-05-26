import { AlertTriangle, CheckCircle2, Clock3, Radar } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { Badge } from "@/components/ui/badge";
import { getNotificationCoverageSummary, notificationCoverageItems, type NotificationCoverageStatus } from "@/domain/notifications/coverage";

const statusTone: Record<NotificationCoverageStatus, string> = {
  covered: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  partial: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  pending: "border-stone-700 bg-stone-900 text-stone-400",
};

const statusIcon = {
  covered: CheckCircle2,
  partial: AlertTriangle,
  pending: Clock3,
};

const CoverageTile = ({ label, value, tone }: { label: string; value: number; tone?: "ready" | "warning" | "neutral" }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4 shadow-inner shadow-black/20">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">{label}</p>
    <p className={`mt-2 text-2xl font-black ${tone === "ready" ? "text-emerald-300" : tone === "warning" ? "text-amber-300" : "text-stone-100"}`}>{value}</p>
  </div>
);

export const NotificationCoveragePanel = () => {
  const summary = getNotificationCoverageSummary();

  return (
    <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/55 shadow-2xl shadow-black/25 backdrop-blur-xl">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/70">Coverage audit</p>
          <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-100">Notification workflow coverage</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
            Shows which operational events already feed the notification center and which ones need deeper hooks before provider delivery is enabled.
          </p>
        </div>
        <Radar className="h-5 w-5 text-amber-300" />
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
        <CoverageTile label="Total flows" value={summary.total} />
        <CoverageTile label="Covered" value={summary.covered} tone="ready" />
        <CoverageTile label="Partial" value={summary.partial} tone="warning" />
        <CoverageTile label="Pending" value={summary.pending} />
      </div>

      <div className="space-y-3">
        {notificationCoverageItems.map((item) => {
          const Icon = statusIcon[item.status];
          return (
            <div key={item.id} className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-xl border p-1.5 ${statusTone[item.status]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <p className="font-semibold text-stone-100">{item.title}</p>
                    <Badge variant="outline" className={statusTone[item.status]}>{item.status}</Badge>
                    <Badge variant="outline" className="border-amber-200/10 text-stone-400">{item.area}</Badge>
                  </div>
                  <p className="mt-2 font-mono text-xs text-amber-200/75">{item.eventType}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-500">{item.impact}</p>
                  <p className="mt-2 text-sm leading-6 text-amber-200/70">Next: {item.nextAction}</p>
                </div>
                <p className="max-w-sm text-xs leading-5 text-stone-600">Source: {item.source}</p>
              </div>
            </div>
          );
        })}
      </div>
    </BentoCard>
  );
};

export default NotificationCoveragePanel;
