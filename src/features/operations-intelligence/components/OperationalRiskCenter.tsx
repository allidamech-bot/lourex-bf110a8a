import { ShieldAlert, TrendingUp, Zap, HelpCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import BentoCard from "@/components/BentoCard";

export interface OperationalRisk {
  id: string;
  type: "delay" | "stalled" | "settlement" | "bottleneck" | "missing_info";
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  titleAr: string;
  recommendation: string;
  recommendationAr: string;
}

interface OperationalRiskCenterProps {
  risks: OperationalRisk[];
}

export const OperationalRiskCenter = ({ risks }: OperationalRiskCenterProps) => {
  const { lang } = useI18n();

  return (
    <BentoCard className="space-y-6 border-amber-200/10 bg-stone-900/50 shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <h3 className="font-serif text-xl font-bold text-stone-100">
          {lang === "ar" ? "مركز مخاطر العمليات" : "Operational Risk Center"}
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {risks.length > 0 ? (
          risks.map((risk) => (
            <div key={risk.id} className="rounded-2xl border border-stone-800 bg-stone-950/40 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    risk.level === "CRITICAL" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                    risk.level === "HIGH" ? "bg-orange-500" :
                    risk.level === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"
                  }`} />
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{risk.type}</span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${
                  risk.level === "CRITICAL" ? "text-rose-400" :
                  risk.level === "HIGH" ? "text-orange-400" :
                  risk.level === "MEDIUM" ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {risk.level}
                </span>
              </div>

              <h4 className="text-sm font-bold text-stone-100 mb-2">
                {lang === "ar" ? risk.titleAr : risk.title}
              </h4>

              <div className="flex items-start gap-2 rounded-xl bg-amber-500/5 border border-amber-500/10 p-3 mt-3">
                <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                <p className="text-[11px] leading-5 text-stone-400 font-medium italic">
                  {lang === "ar" ? risk.recommendationAr : risk.recommendation}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 rounded-2xl border border-dashed border-stone-800 p-8 text-center">
            <p className="text-xs text-stone-600 font-bold uppercase tracking-widest">
              {lang === "ar" ? "لا توجد مخاطر نشطة مكتشفة" : "No active risks detected"}
            </p>
          </div>
        )}
      </div>

      <div className="pt-2 flex items-center gap-4 border-t border-stone-800">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-stone-500" />
          <span className="text-[10px] text-stone-600 font-bold uppercase tracking-widest">Risk Trend: Stable</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <HelpCircle className="h-3.5 w-3.5 text-stone-500" />
          <span className="text-[10px] text-stone-600 font-bold uppercase tracking-widest">Update frequency: Real-time</span>
        </div>
      </div>
    </BentoCard>
  );
};
