import { BrainCircuit } from "lucide-react";
import { ExecutiveRiskOverview } from "@/features/ai-ops/components/ExecutiveRiskOverview";
import { ShipmentIntelligencePanel } from "@/features/ai-ops/components/ShipmentIntelligencePanel";
import { SmartRecommendationsFeed } from "@/features/ai-ops/components/SmartRecommendationsFeed";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import type { InsightLanguage, OperationsAdvisorResult } from "@/features/ai-ops/types/aiOpsTypes";

const labels = {
  en: {
    eyebrow: "AI Operations Intelligence",
    title: "Operations command intelligence",
    description: "Derived advisory intelligence for shipment risk, finance exposure, timeline bottlenecks, and executive next actions.",
  },
  ar: {
    eyebrow: "ذكاء العمليات",
    title: "مركز ذكاء العمليات",
    description: "تحليلات إرشادية لمخاطر الشحنات والانكشاف المالي واختناقات المراحل والخطوات التنفيذية التالية.",
  },
} as const;

export function AIOperationsCenter({
  result,
  language,
  locale,
}: {
  result: OperationsAdvisorResult;
  language: InsightLanguage;
  locale: string;
}) {
  const t = labels[language];

  return (
    <section className="space-y-4">
      <PageHelpBox pageKey="ai_operations" />
      <div className="rounded-2xl border border-blue-400/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(15,23,42,0.92))] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/10 text-blue-100">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] text-blue-200 ${language === "ar" ? "tracking-normal" : "uppercase tracking-[0.2em]"}`}>{t.eyebrow}</p>
            <h2 className="mt-1 break-words font-serif text-2xl font-semibold text-white">{t.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">{t.description}</p>
          </div>
        </div>
      </div>

      <ExecutiveRiskOverview metrics={result.executiveMetrics} language={language} locale={locale} />
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <ShipmentIntelligencePanel
          risks={result.shipmentRisks}
          timeline={result.timeline}
          language={language}
          locale={locale}
        />
        <SmartRecommendationsFeed recommendations={result.recommendations} language={language} />
      </div>
    </section>
  );
}

