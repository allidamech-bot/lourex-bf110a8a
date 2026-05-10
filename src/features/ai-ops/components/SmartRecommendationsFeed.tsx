import { Lightbulb } from "lucide-react";
import type { InsightLanguage, SmartRecommendation } from "@/features/ai-ops/types/aiOpsTypes";

const labels = {
  en: {
    title: "Smart recommendations",
    empty: "No urgent recommendations right now.",
  },
  ar: {
    title: "توصيات ذكية",
    empty: "لا توجد توصيات عاجلة حالياً.",
  },
} as const;

export function SmartRecommendationsFeed({
  recommendations,
  language,
}: {
  recommendations: SmartRecommendation[];
  language: InsightLanguage;
}) {
  const t = labels[language];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-5 w-5 text-blue-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {recommendations.length ? recommendations.map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="font-semibold text-white">{item.title}</p>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-100">{item.severity}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.detail}</p>
            {item.relatedEntity ? <p className="mt-2 text-xs text-slate-500">{item.relatedEntity}</p> : null}
          </div>
        )) : (
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
        )}
      </div>
    </div>
  );
}
