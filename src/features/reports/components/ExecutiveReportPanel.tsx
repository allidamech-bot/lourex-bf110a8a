import { AlertTriangle, BrainCircuit, CheckCircle2, Lightbulb, RefreshCw, Target } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import type { ExecutiveReportAdvisorResult, ExecutiveReportInsight } from "@/features/reports/lib/executiveReportAdvisor";

const levelStyles = {
  stable: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  watch: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  risk: "border-orange-400/25 bg-orange-500/10 text-orange-100",
  critical: "border-rose-400/25 bg-rose-500/10 text-rose-100",
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
  <div className="min-w-0 rounded-[1.25rem] border border-border/60 bg-secondary/15 p-4">
    <h3 className="break-words text-sm font-semibold text-foreground">{title}</h3>
    <div className="mt-3 space-y-2.5">
      {items.length ? (
        items.map((item) => {
          const Icon = kindIcon[item.kind];
          return (
            <div key={item.id} className="rounded-2xl border border-border/50 bg-background/65 p-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${levelStyles[item.level]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="rounded-2xl border border-border/50 bg-background/50 p-3 text-xs leading-5 text-muted-foreground">{emptyLabel}</p>
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
    <BentoCard className="space-y-5 border-blue-400/15 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(15,23,42,0.88))]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-300/25 bg-blue-500/10 text-blue-100">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-semibold text-blue-200 ${isArabic ? "tracking-normal" : "uppercase tracking-[0.18em]"}`}>
              {isArabic ? "تقرير تنفيذي ذكي" : "Executive AI Report"}
            </p>
            <h2 className="mt-1 break-words font-serif text-2xl font-semibold text-white">
              {isArabic ? "قراءة إدارية مختصرة للتقرير" : "Management-ready report briefing"}
            </h2>
            <p className="mt-2 max-w-4xl break-words text-sm leading-7 text-slate-300">{result.summary}</p>
            <p className="mt-2 text-xs text-slate-500">
              {isArabic ? "آخر تحديث" : "Generated"}: {generatedAt}
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row lg:flex-col">
          <div className={`rounded-2xl border px-4 py-3 text-center ${levelStyles[result.executiveLevel]}`}>
            <p className="text-xs opacity-80">{isArabic ? "درجة المتابعة" : "Follow-up score"}</p>
            <p className="mt-1 text-2xl font-bold">{result.executiveScore}</p>
            <p className="text-xs uppercase tracking-[0.16em]">{result.executiveLevel}</p>
          </div>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-300/25 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-100 transition-colors hover:border-blue-200/45 hover:bg-blue-500/20 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
              {isArabic ? "تحديث القراءة" : "Refresh briefing"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: isArabic ? "الصافي" : "Net result", value: `${Math.round(result.metrics.netProfit).toLocaleString(locale)} SAR` },
          { label: isArabic ? "هامش الربح" : "Profit margin", value: marginPercent },
          { label: isArabic ? "تعرض التحصيل" : "Collection exposure", value: `${Math.round(result.metrics.collectionExposure).toLocaleString(locale)} SAR` },
          { label: isArabic ? "تغطية التسويات" : "Settlement coverage", value: coveragePercent },
        ].map((metric) => (
          <div key={metric.label} className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="break-words text-xs text-slate-400">{metric.label}</p>
            <p className="mt-1 break-words text-xl font-bold text-white">{metric.value}</p>
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
