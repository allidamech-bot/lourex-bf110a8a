import { BarChart3 } from "lucide-react";
import type { CognitiveLanguage, ExecutiveInsight } from "@/features/cognitive-ops/types/cognitiveTypes";

export function ExecutiveInsightsBoard({
  insights,
  language,
}: {
  insights: ExecutiveInsight[];
  language: CognitiveLanguage;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-amber-100">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200">
            {language === "ar" ? "رؤى تنفيذية" : "Executive Insights"}
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold text-white">
            {language === "ar" ? "ملخصات تشغيلية ومخاطر استراتيجية" : "Operational briefs and strategic risk"}
          </h3>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <div key={insight.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">{insight.title}</p>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-300">{insight.severity}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{insight.narrative}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
