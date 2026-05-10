import { Activity, AlertTriangle, Gauge, ShieldCheck, TimerReset } from "lucide-react";
import type { WorkflowHealthMetrics, WorkflowLanguage } from "@/features/workflow-intelligence/types/workflowTypes";

const labels = {
  en: {
    title: "Workflow health",
    efficiency: "Efficiency score",
    stability: "Stability score",
    blocked: "Blocked workflows",
    escalated: "Escalated workflows",
    unresolved: "Unresolved issues",
    recovery: "Avg. recovery days",
  },
  ar: {
    title: "صحة سير العمل",
    efficiency: "درجة الكفاءة",
    stability: "درجة الاستقرار",
    blocked: "مسارات متوقفة",
    escalated: "مسارات مصعدة",
    unresolved: "مشكلات غير محلولة",
    recovery: "متوسط أيام الاسترداد",
  },
} as const;

export function WorkflowHealthPanel({
  health,
  language,
  locale,
}: {
  health: WorkflowHealthMetrics;
  language: WorkflowLanguage;
  locale: string;
}) {
  const t = labels[language];
  const items = [
    { label: t.efficiency, value: `${health.workflowEfficiencyScore.toLocaleString(locale)}%`, icon: Gauge },
    { label: t.stability, value: `${health.operationalStabilityScore.toLocaleString(locale)}%`, icon: ShieldCheck },
    { label: t.blocked, value: health.blockedWorkflowCount.toLocaleString(locale), icon: AlertTriangle },
    { label: t.escalated, value: health.escalatedWorkflowCount.toLocaleString(locale), icon: Activity },
    { label: t.unresolved, value: health.unresolvedOperationalIssues.toLocaleString(locale), icon: AlertTriangle },
    { label: t.recovery, value: health.averageRecoveryDurationDays.toLocaleString(locale), icon: TimerReset },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Gauge className="h-5 w-5 text-cyan-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
              <Icon className="h-4 w-4 text-cyan-200" />
              <p className="mt-3 text-xs leading-5 text-slate-400">{item.label}</p>
              <p className="mt-1 break-words text-lg font-bold text-white">{item.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
