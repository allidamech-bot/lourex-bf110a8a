import { ListFilter, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import BentoCard from "@/components/BentoCard";
import type { Recommendation } from "../lib/operationsRecommendationEngine";

interface PriorityQueueEngineProps {
  recommendations: Recommendation[];
}

export const PriorityQueueEngine = ({ recommendations }: PriorityQueueEngineProps) => {
  const { lang } = useI18n();

  return (
    <BentoCard className="space-y-5 border-amber-200/10 bg-stone-900/50 shadow-2xl h-full">
      <div className="flex items-center gap-2 mb-4">
        <ListFilter className="h-5 w-5 text-amber-500" />
        <h3 className="font-serif text-xl font-bold text-stone-100">
          {lang === "ar" ? "قائمة الأولويات الذكية" : "Intelligent Priority Queue"}
        </h3>
      </div>

      <div className="space-y-3">
        {recommendations.length > 0 ? (
          recommendations.slice(0, 5).map((rec) => (
            <div key={rec.id} className="rounded-2xl border border-stone-800 bg-stone-950/40 p-4 transition-all hover:border-amber-500/20 group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full uppercase tracking-tighter ${
                      rec.priority === "HIGH" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                      rec.priority === "MEDIUM" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      {rec.priority}
                    </span>
                    <span className="text-[10px] text-stone-600 font-bold uppercase tracking-widest">{rec.type}</span>
                  </div>
                  <h4 className="text-sm font-bold text-stone-200 group-hover:text-amber-200 transition-colors">
                    {lang === "ar" ? rec.titleAr : rec.title}
                  </h4>
                  <p className="mt-1 text-xs text-stone-500 leading-5">
                    {lang === "ar" ? rec.reasonAr : rec.reason}
                  </p>
                </div>
                {rec.link && (
                  <Link to={rec.link} className="shrink-0 rounded-full h-8 w-8 flex items-center justify-center border border-stone-800 bg-stone-900 text-stone-400 hover:text-amber-400 hover:border-amber-500/30 transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-800 p-8 text-center">
            <p className="text-xs text-stone-600 font-bold uppercase tracking-widest">
              {lang === "ar" ? "لا توجد أولويات عاجلة" : "No urgent priorities"}
            </p>
          </div>
        )}
      </div>

      {recommendations.length > 5 && (
        <p className="text-center text-[10px] text-stone-600 font-bold uppercase tracking-widest pt-2">
          {lang === "ar" ? `+${recommendations.length - 5} توصيات أخرى` : `+${recommendations.length - 5} more recommendations`}
        </p>
      )}
    </BentoCard>
  );
};
