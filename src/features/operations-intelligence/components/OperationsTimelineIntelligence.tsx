import { CheckCircle2, Circle, Clock, Info, ShieldAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import BentoCard from "@/components/BentoCard";

export interface TimelineWorkflowStage {
  id: string;
  name: string;
  nameAr: string;
  status: "completed" | "in_progress" | "pending" | "blocked";
  confidence: number; // Percentage
  blocker?: string;
  blockerAr?: string;
}

interface OperationsTimelineIntelligenceProps {
  stages: TimelineWorkflowStage[];
}

export const OperationsTimelineIntelligence = ({ stages }: OperationsTimelineIntelligenceProps) => {
  const { lang } = useI18n();

  return (
    <BentoCard className="space-y-6 border-amber-200/10 bg-stone-900/50 shadow-2xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          <h3 className="font-serif text-xl font-bold text-stone-100">
            {lang === "ar" ? "ذكاء الجدول الزمني" : "Timeline Intelligence"}
          </h3>
        </div>
      </div>

      <div className="space-y-8 relative pt-4">
        <div className="absolute left-[11px] top-6 bottom-6 w-px bg-stone-800" />

        {stages.map((stage) => (
          <div key={stage.id} className="relative flex gap-4 pl-1">
            <div className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              stage.status === "completed" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" :
              stage.status === "in_progress" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" :
              stage.status === "blocked" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" :
              "bg-stone-900 border border-stone-700"
            }`}>
              {stage.status === "completed" ? <CheckCircle2 className="h-3 w-3 text-stone-950" /> :
               stage.status === "blocked" ? <ShieldAlert className="h-3 w-3 text-white" /> :
               <Circle className={`h-1.5 w-1.5 ${stage.status === "in_progress" ? "text-stone-950 fill-current" : "text-stone-600"}`} />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h4 className={`text-sm font-bold uppercase tracking-wider ${
                  stage.status === "blocked" ? "text-rose-400" :
                  stage.status === "in_progress" ? "text-amber-200" :
                  stage.status === "completed" ? "text-emerald-400" : "text-stone-500"
                }`}>
                  {lang === "ar" ? stage.nameAr : stage.name}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter text-stone-600 px-2 py-0.5 rounded bg-stone-950/40 border border-stone-800">
                  Confidence: {stage.confidence}%
                </div>
              </div>

              {stage.status === "blocked" && (stage.blocker || stage.blockerAr) && (
                <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 flex items-start gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-5 text-rose-200 font-medium italic">
                    {lang === "ar" ? stage.blockerAr : stage.blocker}
                  </p>
                </div>
              )}

              {stage.status === "in_progress" && (
                <div className="h-1 w-full bg-stone-950 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all duration-1000"
                    style={{ width: `${stage.confidence}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-stone-950/40 p-4 text-[10px] leading-5 text-stone-500 font-bold uppercase tracking-widest">
        <Info className="h-3.5 w-3.5 shrink-0 text-amber-500/70" />
        <p>Intelligence layer evaluates confidence based on execution velocity and partner response latency.</p>
      </div>
    </BentoCard>
  );
};
