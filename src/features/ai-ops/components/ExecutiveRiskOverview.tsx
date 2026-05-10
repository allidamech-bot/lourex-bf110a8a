import { Activity, AlertTriangle, CircleDollarSign, Scale } from "lucide-react";
import type { ExecutiveMetrics, InsightLanguage } from "@/features/ai-ops/types/aiOpsTypes";

const labels = {
  en: {
    title: "Executive risk overview",
    health: "AI operational health",
    exposure: "Financial exposure",
    delayed: "Delayed orders",
    customers: "High-risk customers",
    settlements: "Pending settlements",
  },
  ar: {
    title: "نظرة تنفيذية على المخاطر",
    health: "الصحة التشغيلية بالذكاء الاصطناعي",
    exposure: "الانكشاف المالي",
    delayed: "طلبات متأخرة",
    customers: "عملاء عالي الخطورة",
    settlements: "تسويات معلقة",
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Activity className="h-5 w-5 text-blue-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {[
          { label: t.health, value: `${metrics.aiOperationalHealthScore.toLocaleString(locale)}%`, icon: Activity },
          { label: t.exposure, value: money, icon: CircleDollarSign },
          { label: t.delayed, value: metrics.delayedOrdersCount.toLocaleString(locale), icon: AlertTriangle },
          { label: t.customers, value: metrics.highRiskCustomersCount.toLocaleString(locale), icon: AlertTriangle },
          { label: t.settlements, value: metrics.pendingSettlementsCount.toLocaleString(locale), icon: Scale },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
              <Icon className="h-4 w-4 text-blue-200" />
              <p className="mt-3 text-xs text-slate-400">{item.label}</p>
              <p className="mt-1 break-words text-lg font-bold text-white">{item.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
