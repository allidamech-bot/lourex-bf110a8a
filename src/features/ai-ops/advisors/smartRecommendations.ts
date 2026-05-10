import type {
  ExecutiveMetrics,
  InsightLanguage,
  ShipmentRiskProfile,
  SmartRecommendation,
  TimelineAnalyticsResult,
} from "@/features/ai-ops/types/aiOpsTypes";

const copy = {
  en: {
    shipmentEscalation: "Escalate high-risk shipment",
    shipmentEscalationDetail: (trackingId: string) => `Shipment ${trackingId} needs owner escalation before the next customer update.`,
    customerFollowUp: "Prepare customer follow-up",
    customerFollowUpDetail: (name: string) => `Customer ${name} has signals that justify a proactive, customer-safe follow-up.`,
    settlementReview: "Review partner settlements",
    settlementReviewDetail: "There are pending settlements that should be reviewed before month-end closure.",
    financeReview: "Review financial exposure",
    financeReviewDetail: "Financial exposure is elevated; check payment coverage and linked entries before committing operations.",
    missingUpdate: "Request missing shipment update",
    missingUpdateDetail: (trackingId: string) => `Request a fresh customer-safe tracking update for ${trackingId}.`,
    disputePrevention: "Prepare dispute-prevention note",
    disputePreventionDetail: "Dispute indicators are present; align internally before customer-facing communication.",
    action: "Review now",
  },
  ar: {
    shipmentEscalation: "تصعيد شحنة عالية المخاطر",
    shipmentEscalationDetail: (trackingId: string) => `الشحنة ${trackingId} تحتاج تصعيداً للمسؤول قبل أي تحديث جديد للعميل.`,
    customerFollowUp: "تحضير متابعة للعميل",
    customerFollowUpDetail: (name: string) => `العميل ${name} لديه مؤشرات تستدعي متابعة استباقية بصياغة آمنة.`,
    settlementReview: "مراجعة تسويات الشركاء",
    settlementReviewDetail: "توجد تسويات معلقة ينبغي مراجعتها قبل إغلاق الفترة.",
    financeReview: "مراجعة الانكشاف المالي",
    financeReviewDetail: "الانكشاف المالي مرتفع؛ راجع تغطية المدفوعات والقيود المرتبطة قبل الالتزام تشغيلياً.",
    missingUpdate: "طلب تحديث شحنة مفقود",
    missingUpdateDetail: (trackingId: string) => `اطلب تحديثاً آمناً للعميل حول الشحنة ${trackingId}.`,
    disputePrevention: "تحضير ملاحظة منع نزاع",
    disputePreventionDetail: "توجد مؤشرات نزاع؛ يجب تنسيق الموقف داخلياً قبل التواصل مع العميل.",
    action: "مراجعة الآن",
  },
} as const;

export const buildSmartRecommendations = (
  input: {
    shipmentRisks: ShipmentRiskProfile[];
    timeline: TimelineAnalyticsResult;
    executiveMetrics: ExecutiveMetrics;
    language: InsightLanguage;
  },
): SmartRecommendation[] => {
  const t = copy[input.language];
  const recommendations: SmartRecommendation[] = [];
  const highestRisk = input.shipmentRisks[0];

  if (highestRisk && (highestRisk.severity === "high" || highestRisk.severity === "critical")) {
    recommendations.push({
      id: `shipment-escalation-${highestRisk.shipmentId}`,
      type: "shipment_escalation",
      severity: highestRisk.severity,
      title: t.shipmentEscalation,
      detail: t.shipmentEscalationDetail(highestRisk.trackingId),
      actionLabel: t.action,
      relatedEntity: highestRisk.trackingId,
    });
  }

  const missingUpdate = input.shipmentRisks.find((risk) => risk.reasons.includes("missing_recent_update"));
  if (missingUpdate) {
    recommendations.push({
      id: `missing-update-${missingUpdate.shipmentId}`,
      type: "missing_update_request",
      severity: "medium",
      title: t.missingUpdate,
      detail: t.missingUpdateDetail(missingUpdate.trackingId),
      actionLabel: t.action,
      relatedEntity: missingUpdate.trackingId,
    });
  }

  const customerRisk = input.shipmentRisks.find((risk) => risk.reasons.includes("risky_customer_pattern"));
  if (customerRisk) {
    recommendations.push({
      id: `customer-follow-up-${customerRisk.customerName}`,
      type: "customer_follow_up",
      severity: "high",
      title: t.customerFollowUp,
      detail: t.customerFollowUpDetail(customerRisk.customerName),
      actionLabel: t.action,
      relatedEntity: customerRisk.customerName,
    });
  }

  if (input.executiveMetrics.pendingSettlementsCount > 0) {
    recommendations.push({
      id: "partner-settlement-review",
      type: "partner_settlement_review",
      severity: "medium",
      title: t.settlementReview,
      detail: t.settlementReviewDetail,
      actionLabel: t.action,
    });
  }

  if (input.executiveMetrics.totalFinancialExposure > 50_000) {
    recommendations.push({
      id: "finance-review",
      type: "finance_review",
      severity: "high",
      title: t.financeReview,
      detail: t.financeReviewDetail,
      actionLabel: t.action,
    });
  }

  if (input.shipmentRisks.some((risk) => risk.reasons.includes("dispute_indicator"))) {
    recommendations.push({
      id: "dispute-prevention",
      type: "dispute_prevention",
      severity: "high",
      title: t.disputePrevention,
      detail: t.disputePreventionDetail,
      actionLabel: t.action,
    });
  }

  return recommendations.slice(0, 6);
};
