import { buildExecutiveMetrics } from "@/features/ai-ops/analytics/executiveMetrics";
import { analyzeTimeline } from "@/features/ai-ops/analytics/timelineAnalytics";
import { analyzeShipmentRisks } from "@/features/ai-ops/engines/shipmentRiskEngine";
import { buildSmartRecommendations } from "@/features/ai-ops/advisors/smartRecommendations";
import type { AIOpsDataset, InsightLanguage, OperationsAdvisorResult } from "@/features/ai-ops/types/aiOpsTypes";

export const buildOperationsAdvisor = (
  dataset: AIOpsDataset,
  language: InsightLanguage,
): OperationsAdvisorResult => {
  const shipmentRisks = analyzeShipmentRisks({
    shipments: dataset.shipments,
    deals: dataset.deals,
    financialEntries: dataset.financialEntries,
    financialEditRequests: dataset.financialEditRequests,
    now: dataset.now,
  });
  const timeline = analyzeTimeline(dataset.shipments, dataset.now);
  const executiveMetrics = buildExecutiveMetrics({
    shipmentRisks,
    timeline,
    settlements: dataset.settlements,
  });
  const recommendations = buildSmartRecommendations({
    shipmentRisks,
    timeline,
    executiveMetrics,
    language,
  });

  return {
    shipmentRisks,
    timeline,
    executiveMetrics,
    recommendations,
  };
};
