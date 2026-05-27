import { Clock, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { estimateETA } from "../lib/etaEstimator";
import type { ShipmentStageCode } from "@/types/lourex";

interface ShipmentETAIntelligenceProps {
  currentStage: ShipmentStageCode;
}

export const ShipmentETAIntelligence = ({ currentStage }: ShipmentETAIntelligenceProps) => {
  const { lang } = useI18n();
  const eta = estimateETA(currentStage);

  if (!eta) return null;

  return (
    <div className="rounded-2xl border border-amber-200/10 bg-stone-900/50 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-amber-500 mb-3">
        <Clock className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-widest">
          {lang === "ar" ? "ذكاء الوصول المتوقع" : "Arrival Intelligence"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">
            {lang === "ar" ? "الوصول المتوقع" : "Estimated Arrival"}
          </p>
          <p className="text-xl font-serif font-bold text-stone-100">
            {lang === "ar"
              ? `${eta.estimateDaysMin}-${eta.estimateDaysMax} أيام`
              : `${eta.estimateDaysMin}–${eta.estimateDaysMax} days`}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">
            {lang === "ar" ? "مستوى المخاطر" : "Delay Risk"}
          </p>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${
              eta.riskLevel === "low" ? "bg-emerald-500" :
              eta.riskLevel === "medium" ? "bg-amber-500" : "bg-rose-500"
            }`} />
            <p className={`text-sm font-bold uppercase ${
              eta.riskLevel === "low" ? "text-emerald-400" :
              eta.riskLevel === "medium" ? "text-amber-400" : "text-rose-400"
            }`}>
              {lang === "ar"
                ? (eta.riskLevel === "low" ? "منخفض" : eta.riskLevel === "medium" ? "متوسط" : "عالي")
                : eta.riskLevel}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-stone-950/40 p-3 text-xs leading-5 text-stone-400">
        <Info className="h-3.5 w-3.5 shrink-0 text-amber-500/70" />
        <p>{lang === "ar" ? eta.reasoningAr : eta.reasoning}</p>
      </div>
    </div>
  );
};
