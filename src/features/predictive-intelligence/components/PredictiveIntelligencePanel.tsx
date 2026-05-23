import { AlertTriangle, ArrowUpRight, BrainCircuit, CheckCircle2, Clock3, FileWarning, Gauge, ListChecks, PackageSearch, Truck } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import type { PredictiveIntelligenceResult, PredictiveRiskLevel, PredictiveSignal } from "@/features/predictive-intelligence/lib/predictiveEngine";

type Props = {
  result: PredictiveIntelligenceResult;
  language: "ar" | "en";
  locale: string;
};

const levelStyles: Record<PredictiveRiskLevel, string> = {
  low: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  medium: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  high: "border-orange-400/25 bg-orange-500/10 text-orange-100",
  critical: "border-rose-400/30 bg-rose-500/15 text-rose-100",
};

const categoryIcon = (category: PredictiveSignal["category"]) => {
  if (category === "shipment") return Truck;
  if (category === "finance") return FileWarning;
  if (category === "conversion") return PackageSearch;
  if (category === "clarification") return Clock3;
  return AlertTriangle;
};

const levelLabel = (level: PredictiveRiskLevel, language: "ar" | "en") => {
  const labels = {
    low: language === "ar" ? "منخفض" : "Low",
    medium: language === "ar" ? "متوسط" : "Medium",
    high: language === "ar" ? "مرتفع" : "High",
    critical: language === "ar" ? "حرج" : "Critical",
  } as const;
  return labels[level];
};

const metricLabel = (key: string, language: "ar" | "en") => {
  const labels: Record<string, string> = {
    openRequests: language === "ar" ? "طلبات مفتوحة" : "Open requests",
    highRiskRequests: language === "ar" ? "طلبات عالية الخطورة" : "High-risk requests",
    clarificationBacklog: language === "ar" ? "بانتظار توضيح" : "Awaiting clarification",
    readyForConversion: language === "ar" ? "جاهزة للتحويل" : "Ready for conversion",
    staleShipments: language === "ar" ? "شحنات تحتاج متابعة" : "Shipments to inspect",
    pendingFinanceEdits: language === "ar" ? "تعديلات مالية معلقة" : "Pending finance edits",
  };
  return labels[key] || key;
};

export function PredictiveIntelligencePanel({ result, language, locale }: Props) {
  const isArabic = language === "ar";
  const metricEntries = Object.entries(result.metrics);

  return (
    <section className="w-full min-w-0 space-y-5" dir={isArabic ? "rtl" : "ltr"}>
      <BentoCard span="full" className="rounded-2xl p-5 sm:p-6 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/10 text-blue-200">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-300/80">
                  {isArabic ? "محرك التنبؤ التشغيلي" : "Predictive Intelligence Engine"}
                </p>
                <h2 className="mt-1 break-words font-serif text-2xl font-bold text-white sm:text-3xl">
                  {isArabic ? "توقع المخاطر والأولويات قبل أن تتحول لمشكلة" : "Forecast risks and operational priorities before they escalate"}
                </h2>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">{result.summary}</p>
          </div>

          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 xl:w-72">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">{isArabic ? "درجة المخاطر العامة" : "Portfolio risk score"}</p>
                <p className="mt-1 text-4xl font-black text-white">{result.portfolioScore}</p>
              </div>
              <Gauge className="h-8 w-8 text-blue-200" />
            </div>
            <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelStyles[result.portfolioLevel]}`}>
              {levelLabel(result.portfolioLevel, language)}
            </span>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              {isArabic ? "هذا التقييم إرشادي مبني على جودة البيانات، عمر الطلبات، حالات الشحن، والتعديلات المالية." : "Advisory score based on data quality, request aging, shipment activity, and finance edit backlog."}
            </p>
          </div>
        </div>
      </BentoCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metricEntries.map(([key, value]) => (
          <BentoCard key={key} className="rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-xs leading-5 text-slate-400">{metricLabel(key, language)}</p>
                <p className="mt-1 text-2xl font-bold text-white">{Number(value).toLocaleString(locale)}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-200">
                <ListChecks className="h-4 w-4" />
              </div>
            </div>
          </BentoCard>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
        <BentoCard className="rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-xl font-bold text-white">{isArabic ? "قائمة المخاطر المتوقعة" : "Predicted risk queue"}</h3>
              <p className="mt-1 text-sm text-slate-500">{isArabic ? "مرتبة من الأعلى أولوية إلى الأقل." : "Sorted from highest operational priority."}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-200" />
          </div>

          <div className="space-y-3">
            {result.signals.length > 0 ? result.signals.map((signal) => {
              const Icon = categoryIcon(signal.category);
              return (
                <div key={signal.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900/70 text-blue-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="break-words text-sm font-bold text-white">{signal.title}</h4>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${levelStyles[signal.level]}`}>
                            {levelLabel(signal.level, language)} · {signal.score}
                          </span>
                        </div>
                        <p className="mt-2 break-words text-sm leading-6 text-slate-400">{signal.description}</p>
                        <p className="mt-2 break-words text-xs leading-5 text-blue-200/80">{signal.recommendedAction}</p>
                      </div>
                    </div>
                    {signal.entityType === "request" && signal.entityId ? (
                      <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl border-white/10 bg-white/[0.03] text-slate-200 hover:bg-blue-500/10 hover:text-white">
                        <a href={`/dashboard/requests?request=${encodeURIComponent(signal.entityId)}`}>
                          {isArabic ? "فتح" : "Open"}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            }) : (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                {isArabic ? "لا توجد مخاطر تشغيلية واضحة حالياً." : "No obvious operational risks detected right now."}
              </div>
            )}
          </div>
        </BentoCard>

        <BentoCard className="rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white">{isArabic ? "الإجراءات التالية" : "Next best actions"}</h3>
              <p className="text-xs text-slate-500">{isArabic ? "مقترحات تنفيذية مباشرة." : "Immediate operational suggestions."}</p>
            </div>
          </div>

          <div className="space-y-3">
            {result.nextActions.length > 0 ? result.nextActions.map((action, index) => (
              <div key={`${action}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                <p className="text-xs font-semibold text-blue-200">{String(index + 1).padStart(2, "0")}</p>
                <p className="mt-1 break-words text-sm leading-6 text-slate-300">{action}</p>
              </div>
            )) : (
              <p className="text-sm leading-6 text-slate-400">{isArabic ? "لا توجد إجراءات عاجلة." : "No urgent actions."}</p>
            )}
          </div>
        </BentoCard>
      </div>
    </section>
  );
}
