import type { OperationsShipment } from "@/domain/operations/types";
import type { TimelineAnalyticsResult, TimelineStageAnalytics } from "@/features/ai-ops/types/aiOpsTypes";

const DAY_MS = 86_400_000;
const DEFAULT_STAGE_SLA_DAYS = 6;

const daysSince = (value: string, now: Date) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
};

export const analyzeTimeline = (
  shipments: OperationsShipment[],
  now = new Date(),
  stageSlaDays: Record<string, number> = {},
): TimelineAnalyticsResult => {
  const stageMap = new Map<string, { count: number; totalDays: number; stalled: number; overrun: number }>();

  shipments.forEach((shipment) => {
    const stage = shipment.stage || "unknown";
    const durationDays = daysSince(shipment.updatedAt, now);
    const sla = stageSlaDays[stage] || DEFAULT_STAGE_SLA_DAYS;
    const current = stageMap.get(stage) || { count: 0, totalDays: 0, stalled: 0, overrun: 0 };
    current.count += 1;
    current.totalDays += durationDays;
    if (durationDays >= sla) current.overrun += 1;
    if (durationDays >= Math.max(sla, 5)) current.stalled += 1;
    stageMap.set(stage, current);
  });

  const stageDurations: TimelineStageAnalytics[] = [...stageMap.entries()]
    .map(([stage, value]) => ({
      stage,
      shipmentsCount: value.count,
      averageDurationDays: value.count ? Number((value.totalDays / value.count).toFixed(1)) : 0,
      stalledCount: value.stalled,
      slaOverrunCount: value.overrun,
    }))
    .sort((a, b) => b.slaOverrunCount - a.slaOverrunCount || b.averageDurationDays - a.averageDurationDays);

  const bottleneckStage = stageDurations[0]?.slaOverrunCount || stageDurations[0]?.stalledCount
    ? stageDurations[0].stage
    : null;

  return {
    bottleneckStage,
    stageDurations,
    stalledStages: stageDurations.filter((stage) => stage.stalledCount > 0).map((stage) => stage.stage),
    slowdownIndicators: stageDurations
      .filter((stage) => stage.slaOverrunCount > 0 || stage.averageDurationDays >= DEFAULT_STAGE_SLA_DAYS)
      .map((stage) => `${stage.stage}:${stage.averageDurationDays}`),
  };
};
