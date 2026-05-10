import { Siren } from "lucide-react";
import type {
  EscalationRecommendation,
  OperationalTrigger,
  WorkflowLanguage,
} from "@/features/workflow-intelligence/types/workflowTypes";

const labels = {
  en: {
    title: "Escalation monitor",
    empty: "No escalation backlog is currently detected.",
    route: "Route",
    retry: "Retry",
    hours: "h",
  },
  ar: {
    title: "مراقبة التصعيد",
    empty: "لا توجد قائمة تصعيد متراكمة حاليا.",
    route: "المسار",
    retry: "إعادة المحاولة",
    hours: "ساعة",
  },
} as const;

export function EscalationMonitor({
  escalations,
  triggers,
  language,
}: {
  escalations: EscalationRecommendation[];
  triggers: OperationalTrigger[];
  language: WorkflowLanguage;
}) {
  const t = labels[language];
  const triggerById = new Map(triggers.map((trigger) => [trigger.id, trigger]));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Siren className="h-5 w-5 text-amber-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {escalations.slice(0, 5).map((item) => {
          const trigger = triggerById.get(item.triggerId);
          return (
            <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-white">{trigger?.entityLabel || item.triggerId}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{trigger?.suggestedFollowUp}</p>
                </div>
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-100">{item.level}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 px-2.5 py-1">{t.route}: {item.routeTo}</span>
                <span className="rounded-full border border-white/10 px-2.5 py-1">
                  {t.retry}: {item.retryStrategy.retryAfterHours}{t.hours}
                </span>
              </div>
            </div>
          );
        })}
        {escalations.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
