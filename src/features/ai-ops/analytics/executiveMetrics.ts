import type { PartnerSettlement } from "@/types/lourex";
import type { ExecutiveMetrics, ShipmentRiskProfile, TimelineAnalyticsResult } from "@/features/ai-ops/types/aiOpsTypes";

export const buildExecutiveMetrics = (
  input: {
    shipmentRisks: ShipmentRiskProfile[];
    timeline: TimelineAnalyticsResult;
    settlements?: PartnerSettlement[];
  },
): ExecutiveMetrics => {
  const totalFinancialExposure = input.shipmentRisks.reduce((sum, risk) => sum + risk.financialExposure, 0);
  const delayedOrdersCount = input.shipmentRisks.filter((risk) =>
    risk.reasons.includes("delayed_shipment") || risk.reasons.includes("stale_shipment"),
  ).length;
  const highRiskCustomersCount = new Set(
    input.shipmentRisks.filter((risk) => risk.severity === "high" || risk.severity === "critical").map((risk) => risk.customerName),
  ).size;
  const pendingSettlementsCount = (input.settlements || []).filter((settlement) =>
    settlement.status === "draft" || settlement.status === "pending_review" || settlement.status === "approved",
  ).length;
  const averageRisk = input.shipmentRisks.length
    ? input.shipmentRisks.reduce((sum, risk) => sum + risk.riskScore, 0) / input.shipmentRisks.length
    : 0;
  const healthPenalty = averageRisk + delayedOrdersCount * 3 + pendingSettlementsCount * 2;

  return {
    totalFinancialExposure,
    delayedOrdersCount,
    highRiskCustomersCount,
    pendingSettlementsCount,
    shipmentBottlenecks: input.timeline.bottleneckStage ? [input.timeline.bottleneckStage] : [],
    aiOperationalHealthScore: Math.max(0, Math.min(100, Math.round(100 - healthPenalty))),
  };
};
