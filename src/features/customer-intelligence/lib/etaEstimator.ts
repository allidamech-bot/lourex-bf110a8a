import type { ShipmentStageCode } from "@/types/lourex";

export interface ETAResult {
  estimateDaysMin: number;
  estimateDaysMax: number;
  riskLevel: "low" | "medium" | "high";
  reasoning: string;
  reasoningAr: string;
}

const stageAvgDays: Record<ShipmentStageCode, number> = {
  factory: 5,
  received_turkey: 1,
  in_turkey_warehouse: 2,
  preparing_export: 2,
  departed_turkey: 1,
  in_transit: 5,
  arrived_destination: 1,
  customs_clearance: 3,
  out_for_delivery: 1,
  delivered: 0,
  closed: 0,
};

export const estimateETA = (currentStage: ShipmentStageCode): ETAResult | null => {
  const stages: ShipmentStageCode[] = [
    "factory",
    "received_turkey",
    "in_turkey_warehouse",
    "preparing_export",
    "departed_turkey",
    "in_transit",
    "arrived_destination",
    "customs_clearance",
    "out_for_delivery",
    "delivered",
    "closed",
  ];

  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= stages.indexOf("delivered")) {
    return null;
  }

  let totalDays = 0;
  for (let i = currentIndex; i < stages.indexOf("delivered"); i++) {
    totalDays += stageAvgDays[stages[i]];
  }

  const min = Math.max(1, Math.round(totalDays * 0.8));
  const max = Math.round(totalDays * 1.2);

  let risk: "low" | "medium" | "high" = "low";
  if (currentStage === "customs_clearance" || currentStage === "in_transit") {
    risk = "medium";
  }

  const reasoning = `Based on current stage (${currentStage}) and average processing times for remaining steps.`;
  const reasoningAr = `بناءً على المرحلة الحالية (${currentStage}) ومتوسط أوقات المعالجة للخطوات المتبقية.`;

  return {
    estimateDaysMin: min,
    estimateDaysMax: max,
    riskLevel: risk,
    reasoning,
    reasoningAr,
  };
};
