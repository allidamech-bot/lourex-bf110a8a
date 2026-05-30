import { AlertTriangle, BrainCircuit, CheckCircle2, Lightbulb, RefreshCw, Target } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import type { ExecutiveReportAdvisorResult, ExecutiveReportInsight } from "@/features/reports/lib/executiveReportAdvisor";
import { formatMoney } from "@/lib/currency";

const levelStyles = {
  stable: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  watch: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  risk: "border-amber-500/30 bg-amber-500/5 text-amber-300",
  critical: "border-red-500/25 bg-red-500/10 text-red-100",
} as const;

const kindIcon = {
  highlight: CheckCircle2,
  risk: AlertTriangle,
  opportunity: Lightbulb,
  action: Target,
} as const;

const InsightList = ({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: ExecutiveReportInsight[];
}) => (
  <div className="min-w-0 rounded-[1.25rem] border border-amber-200/10 bg-stone-900/50 p-4">
    <h3 className="break-words text-[10px] font-bold uppercase tracking-widest text-stone-500">{title}</h3>
    <div className="mt-4 space-y-3">
      {items.length ? (
        items.map((item) => {
          const Icon = kindIcon[item.kind];
          return (
            <div key={item.id} className="rounded-2xl border border-amber-200/5 bg-stone-950/40 p-3 shadow-sm">
              <div className="flex min-w-0 items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${levelStyles[item.level]} shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-stone-200 uppercase tracking-tight">{item.title}</p>
                  <p className="mt-1 break-words text-xs leading-5 text-stone-400 font-medium">{item.description}</p>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="rounded-2xl border border-dashed border-amber-200/10 bg-stone-950/20 p-4 text-xs text-stone-600 font-medium text-center">{emptyLabel}</p>
      )}
    </div>
  </div>
);

export function ExecutiveReportPanel({
  result,
  language,
  locale,
  onRefresh,
}: {
  result: ExecutiveReportAdvisorResult;
  language: "ar" | "en";
  locale: string;
  onRefresh?: () => void;
}) {
  const isArabic = language === "ar";
  const generatedAt = new Date(result.generatedAt).toLocaleString(locale);
  const marginPercent = `${Math.round(result.metrics.profitMargin * 100)}%`;
  const coveragePercent = `${Math.round(result.metrics.settlementCoverageRatio * 100)}%`;

  return (
    <BentoCard className="space-y-5 border-amber-200/15 bg-stone-900/55 backdrop-blur-xl shadow-2xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-200 shadow-sm">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] font-bold text-amber-200/80 ${isArabic ? "tracking-normal" : "uppercase tracking-[0.18em]"}`}>
              {isArabic ? "تقرير تنفيذي ذكي" : "Executive AI Report"}
            </p>
            <h2 className="mt-1 break-words font-serif text-2xl font-semibold text-stone-100">
              {isArabic ? "قراءة إدارية مختصرة للتقرير" : "Management-ready report briefing"}
            </h2>
            <p className="mt-2 max-w-4xl break-words text-sm leading-7 text-stone-400 font-medium">{result.summary}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-stone-600">
              {isArabic ? "آخر تحديث" : "Generated"}: {generatedAt}
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col">
          <div className={`rounded-2xl border px-5 py-4 text-center ${levelStyles[result.executiveLevel]} shadow-lg`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{isArabic ? "درجة المتابعة" : "Follow-up score"}</p>
            <p className="mt-1 text-3xl font-bold">{result.executiveScore}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">{result.executiveLevel}</p>
          </div>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200/15 bg-stone-50/5 px-4 py-2 text-sm font-bold text-stone-100 transition-colors hover:bg-stone-50/10 shadow-sm"
            >
              <RefreshCw className="h-4 w-4 text-amber-500" />
              {isArabic ? "تحديث القراءة" : "Refresh briefing"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: isArabic ? "الصافي" : "Net result", value: formatMoney(result.metrics.netProfit) },
          { label: isArabic ? "هامش الربح" : "Profit margin", value: marginPercent },
          { label: isArabic ? "تعرض التحصيل" : "Collection exposure", value: formatMoney(result.metrics.collectionExposure) },
          { label: isArabic ? "تغطية التسويات" : "Settlement coverage", value: coveragePercent },
        ].map((metric) => (
          <div key={metric.label} className="rounded-[1.2rem] border border-amber-200/10 bg-stone-950/40 p-4 shadow-sm">
            <p className="break-words text-[10px] font-bold uppercase tracking-widest text-stone-600">{metric.label}</p>
            <p className="mt-1 break-words text-xl font-bold text-stone-200">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <InsightList
          title={isArabic ? "المخاطر التي تحتاج قرار" : "Risks requiring decision"}
          emptyLabel={isArabic ? "لا توجد مخاطر تنفيذية واضحة في هذه الفترة." : "No clear executive risks detected for this period."}
          items={result.risks}
        />
        <InsightList
          title={isArabic ? "فرص الإدارة" : "Management opportunities"}
          emptyLabel={isArabic ? "لا توجد فرص بارزة حالياً." : "No major opportunities detected right now."}
          items={result.opportunities}
        />
        <InsightList
          title={isArabic ? "خطة العمل المقترحة" : "Suggested action plan"}
          emptyLabel={isArabic ? "لا توجد إجراءات عاجلة مقترحة." : "No urgent suggested actions."}
          items={result.actionPlan}
        />
      </div>
    </BentoCard>
  );
}
