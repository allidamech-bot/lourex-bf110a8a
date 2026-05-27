import type { OperationsDeal, OperationsRequest, PartnerSettlement } from "@/domain/operations/types";

export interface Recommendation {
  id: string;
  type: "shipment" | "request" | "settlement" | "customer" | "partner";
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  titleAr: string;
  reason: string;
  reasonAr: string;
  action: string;
  actionAr: string;
  link?: string;
}

export const generateRecommendations = (
  deals: OperationsDeal[],
  requests: OperationsRequest[],
  settlements: PartnerSettlement[] = []
): Recommendation[] => {
  const recommendations: Recommendation[] = [];

  // 1. Analyze Deals/Shipments
  deals.forEach((deal) => {
    if (deal.operationalStatus !== "delivered" && deal.operationalStatus !== "closed") {
      // Check for transit delays (Mocked logic for demo purposes)
      if (deal.shipmentStage === "customs_clearance" || deal.shipmentStage === "in_transit") {
        recommendations.push({
          id: `deal-${deal.id}`,
          type: "shipment",
          priority: "HIGH",
          title: `Prioritize Shipment ${deal.trackingId || deal.dealNumber}`,
          titleAr: `أولوية الشحنة ${deal.trackingId || deal.dealNumber}`,
          reason: "Shipment in high-risk stage (Customs/Transit).",
          reasonAr: "الشحنة في مرحلة عالية المخاطر (الجمارك/الشحن الدولي).",
          action: "Review documentation and verify status with logistics partner.",
          actionAr: "راجع الوثائق وتحقق من الحالة مع شريك الخدمات اللوجستية.",
          link: `/dashboard/tracking?deal=${deal.dealNumber}`,
        });
      }
    }
  });

  // 2. Analyze Purchase Requests
  requests.forEach((req) => {
    if (req.status === "awaiting_clarification") {
      recommendations.push({
        id: `req-${req.id}`,
        type: "request",
        priority: "MEDIUM",
        title: "Customer Update Required",
        titleAr: "مطلوب تحديث للعميل",
        reason: "Request stalled awaiting clarification for more than 48 hours.",
        reasonAr: "الطلب متوقف بانتظار توضيح لأكثر من 48 ساعة.",
        action: "Follow up with customer via official communication channel.",
        actionAr: "تابع مع العميل عبر قناة التواصل الرسمية.",
        link: `/dashboard/requests?request=${req.id}`,
      });
    } else if (req.status === "ready_for_conversion") {
      recommendations.push({
        id: `req-conv-${req.id}`,
        type: "request",
        priority: "HIGH",
        title: "Approve Deal Conversion",
        titleAr: "اعتماد تحويل الصفقة",
        reason: "Request is approved and ready to be converted into an operation.",
        reasonAr: "الطلب معتمد وجاهز للتحويل إلى عملية تشغيلية.",
        action: "Finalize deal parameters and assign partners.",
        actionAr: "قم بإنهاء معاملات الصفقة وتعيين الشركاء.",
        link: `/dashboard/requests?request=${req.id}`,
      });
    }
  });

  // 3. Analyze Settlements
  settlements.forEach((settlement) => {
    if (settlement.status === "pending_review") {
      recommendations.push({
        id: `settle-${settlement.id}`,
        type: "settlement",
        priority: "HIGH",
        title: "Review Partner Settlement",
        titleAr: "مراجعة تسوية الشريك",
        reason: "Awaiting administrative approval for payout.",
        reasonAr: "بانتظار الموافقة الإدارية للصرف.",
        action: "Verify expense entries and approve settlement.",
        actionAr: "تحقق من قيود المصروفات واعتمد التسوية.",
        link: "/dashboard/settlements",
      });
    }
  });

  // 4. Sort by priority
  const priorityMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  return recommendations.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);
};
