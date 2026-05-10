import type {
  OperationsDeal,
  OperationsFinancialEditRequest,
  OperationsFinancialEntry,
  OperationsShipment,
} from "@/domain/operations/types";
import type { PartnerSettlement } from "@/types/lourex";

export type InsightLanguage = "ar" | "en";

export type AIOpsSeverity = "low" | "medium" | "high" | "critical";

export type ShipmentRiskReason =
  | "delayed_shipment"
  | "stale_shipment"
  | "missing_recent_update"
  | "dispute_indicator"
  | "financial_exposure"
  | "risky_customer_pattern";

export type ShipmentRiskProfile = {
  shipmentId: string;
  trackingId: string;
  customerName: string;
  dealNumber?: string;
  riskScore: number;
  severity: AIOpsSeverity;
  reasons: ShipmentRiskReason[];
  suggestedActions: string[];
  financialExposure: number;
  delayProbability: number;
  daysSinceUpdate: number;
};

export type TimelineStageAnalytics = {
  stage: string;
  shipmentsCount: number;
  averageDurationDays: number;
  stalledCount: number;
  slaOverrunCount: number;
};

export type TimelineAnalyticsResult = {
  bottleneckStage: string | null;
  stageDurations: TimelineStageAnalytics[];
  stalledStages: string[];
  slowdownIndicators: string[];
};

export type ExecutiveMetrics = {
  totalFinancialExposure: number;
  delayedOrdersCount: number;
  highRiskCustomersCount: number;
  pendingSettlementsCount: number;
  shipmentBottlenecks: string[];
  aiOperationalHealthScore: number;
};

export type RecommendationType =
  | "shipment_escalation"
  | "customer_follow_up"
  | "partner_settlement_review"
  | "finance_review"
  | "missing_update_request"
  | "dispute_prevention";

export type SmartRecommendation = {
  id: string;
  type: RecommendationType;
  severity: AIOpsSeverity;
  title: string;
  detail: string;
  actionLabel: string;
  relatedEntity?: string;
};

export type AIOpsDataset = {
  shipments: OperationsShipment[];
  deals: OperationsDeal[];
  financialEntries: OperationsFinancialEntry[];
  financialEditRequests: OperationsFinancialEditRequest[];
  settlements?: PartnerSettlement[];
  now?: Date;
};

export type OperationsAdvisorResult = {
  shipmentRisks: ShipmentRiskProfile[];
  timeline: TimelineAnalyticsResult;
  executiveMetrics: ExecutiveMetrics;
  recommendations: SmartRecommendation[];
};
