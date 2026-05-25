import { Activity, AlertTriangle, CircleDollarSign, Scale } from "lucide-react";
import { ReadableMetricCard, ResponsiveInfoGrid, SectionHelpBox } from "@/components/readable/ReadableCards";
import type { ExecutiveMetrics, InsightLanguage } from "@/features/ai-ops/types/aiOpsTypes";

const labels = {
  en: {
    title: "Executive risk overview",
    health: "AI operational health",
    exposure: "Financial exposure",
    delayed: "Delayed orders",
    customers: "High-risk customers",
    settlements: "Pending settlements",
    helpTitle: "How should I read AI risk?",
    helpBody: "These cards group the highest-impact operational risks so managers can review delays, exposure, and pending settlements before approving action.",
    helpExample: "If delayed orders or pending settlements rise, review the cause first, then decide whether approval or escalation is needed.",
  },
  ar: {
    title: "نظرة تنفيذية على المخاطر",
    health: "الصحة التشغيلية بالذكاء الاصطناعي",
    exposure: "الانكشاف المالي",
    delayed: "طلبات متأخرة",
    customers: "عملاء عالي الخطورة",
    settlements: "تسويات معلقة",
    helpTitle: "كيف أقرأ مخاطر الذكاء التشغيلي؟",
    helpBody: "هذه البطاقات تجمع أهم مؤشرات الخطر حتى تعرف أين تحتاج العملية إلى مراجعة أو قرار إداري.",
    helpExample: "إذا ارتفع عدد الطلبات المتأخرة أو التسويات المعلقة، ابدأ بمراجعة السبب ثم حدد هل تحتاج موافقة أو تصعيد.",
  },
} as const;

export function ExecutiveRiskOverview({
  metrics,
  language,
  locale,
}: {
  metrics: ExecutiveMetrics;
  language: InsightLanguage;
  locale: string;
}) {
  const t = labels[language];
  const money = `${metrics.totalFinancialExposure.toLocaleString(locale)} SAR`;

  return (
    <div className="rounded-2xl border border-amber-200/10 bg-stone-900/50 backdrop-blur-xl p-5 shadow-2xl">
      <div className="flex items-center gap-3">
        <Activity className="h-5 w-5 text-amber-500" />
        <h3 className="font-serif text-xl font-semibold text-stone-100">{t.title}</h3>
      </div>
      <SectionHelpBox className="mt-4 border-amber-200/15 bg-amber-500/10" title={t.helpTitle} body={t.helpBody} example={t.helpExample} />
      <ResponsiveInfoGrid className="mt-4" min="minmax(min(100%, 11rem), 1fr)">
        {[
          { label: t.health, value: `${metrics.aiOperationalHealthScore.toLocaleString(locale)}%`, icon: Activity },
          { label: t.exposure, value: money, icon: CircleDollarSign },
          { label: t.delayed, value: metrics.delayedOrdersCount.toLocaleString(locale), icon: AlertTriangle },
          { label: t.customers, value: metrics.highRiskCustomersCount.toLocaleString(locale), icon: AlertTriangle },
          { label: t.settlements, value: metrics.pendingSettlementsCount.toLocaleString(locale), icon: Scale },
        ].map((item) => (
          <ReadableMetricCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
        ))}
      </ResponsiveInfoGrid>
    </div>
  );
}
