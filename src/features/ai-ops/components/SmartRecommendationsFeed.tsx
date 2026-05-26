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
    <div className="rounded-2xl border border-amber-200/10 bg-stone-900/50 backdrop-blur-xl p-5 shadow-2xl">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-5 w-5 text-amber-500" />
        <h3 className="font-serif text-xl font-semibold text-stone-100">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {recommendations.length ? recommendations.map((item) => (
          <div key={item.id} className="rounded-xl border border-amber-200/10 bg-stone-950/40 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="font-bold text-stone-100 uppercase tracking-tight">{item.title}</p>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-200 uppercase tracking-widest">{item.severity}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-400 font-medium">{item.detail}</p>
            {item.relatedEntity ? <p className="mt-2 text-[10px] font-bold text-stone-500 uppercase tracking-widest">{item.relatedEntity}</p> : null}
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-amber-200/10 bg-stone-950/20 p-4 text-sm text-stone-500 text-center font-medium">{t.empty}</p>
        )}
      </div>
    </div>
  );
}
