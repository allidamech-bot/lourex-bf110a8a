import { CheckCircle2, CircleDot } from "lucide-react";
import { shipmentStages } from "@/lib/shipmentStages";
import type { ShipmentStageCode } from "@/types/lourex";

interface ShipmentTimelineProps {
  currentStage: ShipmentStageCode;
}

export const ShipmentTimeline = ({ currentStage }: ShipmentTimelineProps) => {
  const currentIndex = shipmentStages.findIndex((stage) => stage.code === currentStage);

  return (
    <div className="space-y-4">
      {shipmentStages.map((stage, index) => {
        const completed = index < currentIndex;
        const active = index === currentIndex;

        return (
          <div key={stage.code} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : completed
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                }`}
              >
                {completed ? <CheckCircle2 className="h-5 w-5" /> : <CircleDot className="h-5 w-5" />}
              </div>
              {index < shipmentStages.length - 1 ? (
                <div className={`mt-2 h-8 w-px ${index < currentIndex ? "bg-primary/40" : "bg-border"}`} />
              ) : null}
            </div>

            <div className="rounded-2xl border border-border/50 bg-card px-4 py-3">
              <p className={`font-medium ${active ? "text-primary" : "text-foreground"}`}>
                {stage.order}. {stage.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{stage.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
