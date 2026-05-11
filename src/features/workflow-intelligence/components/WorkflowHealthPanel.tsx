import { Activity, AlertTriangle, Gauge, ShieldCheck, TimerReset } from "lucide-react";
import { ReadableMetricCard, ResponsiveInfoGrid, SectionHelpBox } from "@/components/readable/ReadableCards";
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
    helpTitle: "How do I use workflow health?",
    helpBody: "Use these indicators to see whether work is flowing normally or if blocked stages need attention.",
    helpExample: "If blocked workflows increase, review the repeated failure stage before recovery planning or escalation.",
  },
  ar: {
    title: "صحة سير العمل",
    efficiency: "درجة الكفاءة",
    stability: "درجة الاستقرار",
    blocked: "مسارات متوقفة",
    escalated: "مسارات مصعدة",
    unresolved: "مشكلات غير محلولة",
    recovery: "متوسط أيام التعافي",
    helpTitle: "كيف أتعامل مع صحة سير العمل؟",
    helpBody: "هذه المؤشرات توضح هل تسير العمليات بسلاسة أم توجد نقاط توقف تحتاج متابعة.",
    helpExample: "إذا زادت المسارات المتوقفة، راجع المرحلة التي تتكرر فيها المشكلة قبل إنشاء خطة تعاف أو تصعيد.",
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
      <SectionHelpBox className="mt-4" title={t.helpTitle} body={t.helpBody} example={t.helpExample} />
      <ResponsiveInfoGrid className="mt-4" min="minmax(min(100%, 11rem), 1fr)">
        {items.map((item) => (
          <ReadableMetricCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
        ))}
      </ResponsiveInfoGrid>
    </div>
  );
}
