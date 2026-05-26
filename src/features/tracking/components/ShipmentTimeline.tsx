import { CheckCircle2, CircleDot } from "lucide-react";
import { shipmentStages } from "@/lib/shipmentStages";
import { useI18n } from "@/lib/i18n";
import type { ShipmentStageCode } from "@/types/lourex";

interface ShipmentTimelineProps {
  currentStage: ShipmentStageCode;
}

export const ShipmentTimeline = ({ currentStage }: ShipmentTimelineProps) => {
  const { lang, t } = useI18n();
  const currentIndex = shipmentStages.findIndex((stage) => stage.code === currentStage);

  return (
    <div className="space-y-4">
      {shipmentStages.map((stage, index) => {
        const completed = index < currentIndex;
        const active = index === currentIndex;
        const owner = lang === "ar" ? stage.owner : stage.ownerEn;

        return (
          <div key={stage.code} className="flex items-start gap-3 sm:gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                  active
                    ? "border-amber-500 bg-amber-500 text-stone-950 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                    : completed
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                      : "border-stone-800 bg-stone-900 text-stone-500"
                }`}
              >
                {completed ? <CheckCircle2 className="h-5 w-5" /> : <CircleDot className="h-5 w-5" />}
              </div>
              {index < shipmentStages.length - 1 ? (
                <div className={`mt-2 h-8 w-px ${index < currentIndex ? "bg-amber-500/30" : "bg-stone-800"}`} />
              ) : null}
            </div>

            <div className="min-w-0 rounded-2xl border border-amber-200/10 bg-stone-950/40 px-3 py-3 sm:px-4 backdrop-blur shadow-sm">
              <p className={`font-bold uppercase tracking-wide text-sm ${active ? "text-amber-200" : "text-stone-300"}`}>
                {stage.order}. {lang === "ar" ? stage.label : stage.labelEn}
              </p>
              {owner ? (
                <p className="mt-1 text-[10px] font-bold text-amber-500/80 uppercase tracking-widest">
                  {t("tracking.owner", { value: owner })}
                </p>
              ) : null}
              <p className="mt-1 text-sm leading-6 text-stone-500 font-medium">
                {lang === "ar" ? stage.description : stage.descriptionEn}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
