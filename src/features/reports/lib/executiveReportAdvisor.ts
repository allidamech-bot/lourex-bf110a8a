import type { DashboardReportSnapshot } from "@/lib/reportsDomain";

export type ExecutiveReportLanguage = "ar" | "en";
export type ExecutiveReportLevel = "stable" | "watch" | "risk" | "critical";
export type ExecutiveReportInsightKind = "highlight" | "risk" | "opportunity" | "action";

export type ExecutiveReportInsight = {
  id: string;
  kind: ExecutiveReportInsightKind;
  title: string;
  description: string;
  level: ExecutiveReportLevel;
  priority: number;
};

export type ExecutiveReportAdvisorResult = {
  generatedAt: string;
  executiveScore: number;
  executiveLevel: ExecutiveReportLevel;
  summary: string;
  metrics: {
    netProfit: number;
    profitMargin: number;
    collectionExposure: number;
    settlementCoverageRatio: number;
    pendingEditRequests: number;
    activeDeals: number;
    averageProcessingTimeDays: number;
  };
  highlights: ExecutiveReportInsight[];
  risks: ExecutiveReportInsight[];
  opportunities: ExecutiveReportInsight[];
  actionPlan: ExecutiveReportInsight[];
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const levelFromScore = (score: number): ExecutiveReportLevel => {
  if (score >= 85) return "critical";
  if (score >= 65) return "risk";
  if (score >= 35) return "watch";
  return "stable";
};

const uniqueById = (items: ExecutiveReportInsight[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export const buildExecutiveReportAdvisor = (
  snapshot: DashboardReportSnapshot,
  language: ExecutiveReportLanguage = "en",
): ExecutiveReportAdvisorResult => {
  const isArabic = language === "ar";
  const summary = snapshot.summary;
  const netProfit = summary.income - summary.expense;
  const profitMargin = summary.income > 0 ? netProfit / summary.income : 0;
  const collectionExposure = summary.outstandingBalance ?? 0;
  const settlementCoverageRatio = summary.settlementCoverageRatio ?? 0;
  const activeDeals = snapshot.operations.activeDeals;
  const averageProcessingTimeDays = snapshot.operations.averageProcessingTimeDays;
  const pendingEditRequests = summary.pendingEditRequests;
  const unpaidDeals = summary.unpaidDeals ?? 0;
  const currencyGroups = summary.currencyGroups;
  const disputedSettlements = summary.partnerSettlementDisputed ?? 0;

  const insights: ExecutiveReportInsight[] = [];

  const push = (insight: ExecutiveReportInsight) => insights.push(insight);

  if (netProfit >= 0) {
    push({
      id: "positive-net-result",
      kind: "highlight",
      title: isArabic ? "نتيجة مالية إيجابية" : "Positive financial result",
      description: isArabic
        ? `الصافي الحالي موجب بقيمة ${Math.round(netProfit).toLocaleString()}، ما يعطي الإدارة مساحة أفضل للمتابعة التشغيلية.`
        : `Current net result is positive at ${Math.round(netProfit).toLocaleString()}, giving management a stronger operating position.`,
      level: "stable",
      priority: 20,
    });
  } else {
    push({
      id: "negative-net-result",
      kind: "risk",
      title: isArabic ? "الصافي المالي سلبي" : "Negative net result",
      description: isArabic
        ? `المصروفات تتجاوز الدخل بقيمة ${Math.abs(Math.round(netProfit)).toLocaleString()}. راجع المصروفات الأعلى والتحصيل المتوقع.`
        : `Expenses exceed income by ${Math.abs(Math.round(netProfit)).toLocaleString()}. Review top expenses and expected collection.`,
      level: "risk",
      priority: 76,
    });
  }

  if (summary.income > 0 && profitMargin < 0.12) {
    push({
      id: "thin-margin",
      kind: "risk",
      title: isArabic ? "هامش ربح منخفض" : "Thin profit margin",
      description: isArabic
        ? "الهامش الحالي منخفض مقارنة بحجم الدخل. راجع التسعير والمصاريف قبل توسيع العمليات المشابهة."
        : "Current margin is thin relative to income. Review pricing and expenses before scaling similar operations.",
      level: "watch",
      priority: 55,
    });
  }

  if (collectionExposure > 0) {
    const exposureScore = summary.income > 0 ? collectionExposure / summary.income : 1;
    push({
      id: "collection-exposure",
      kind: exposureScore >= 0.35 ? "risk" : "opportunity",
      title: isArabic ? "تعرض تحصيل يحتاج متابعة" : "Collection exposure needs follow-up",
      description: isArabic
        ? `الرصيد غير المحصل ${Math.round(collectionExposure).toLocaleString()}. رتب العملاء حسب الأثر وابدأ بالأكبر."
        : `Outstanding balance is ${Math.round(collectionExposure).toLocaleString()}. Prioritize customers by impact and start with the largest exposure.`,
      level: exposureScore >= 0.35 ? "risk" : "watch",
      priority: exposureScore >= 0.35 ? 78 : 48,
    });
  }

  if (pendingEditRequests > 0) {
    push({
      id: "pending-finance-edits",
      kind: "risk",
      title: isArabic ? "طلبات تعديل مالي معلقة" : "Pending financial edit requests",
      description: isArabic
        ? `يوجد ${pendingEditRequests} طلب تعديل مالي معلق. لا تعتمد التقرير النهائي قبل مراجعتها.`
        : `${pendingEditRequests} financial edit request(s) are pending. Avoid finalizing reports before review.`,
      level: pendingEditRequests >= 5 ? "risk" : "watch",
      priority: pendingEditRequests >= 5 ? 72 : 52,
    });
  }

  if (unpaidDeals > 0) {
    push({
      id: "unpaid-deals",
      kind: "risk",
      title: isArabic ? "صفقات غير مغطاة بالكامل" : "Deals not fully covered",
      description: isArabic
        ? `يوجد ${unpaidDeals} صفقة لديها مستحقات غير مغطاة بالكامل. اربط المتابعة بين الحسابات والعمليات.`
        : `${unpaidDeals} deal(s) have uncovered receivables. Coordinate follow-up between accounting and operations.`,
      level: unpaidDeals >= 3 ? "risk" : "watch",
      priority: unpaidDeals >= 3 ? 70 : 50,
    });
  }

  if (settlementCoverageRatio > 0 && settlementCoverageRatio < 0.65) {
    push({
      id: "settlement-coverage",
      kind: "risk",
      title: isArabic ? "تغطية تسويات الشركاء منخفضة" : "Low partner settlement coverage",
      description: isArabic
        ? "نسبة تغطية التسويات منخفضة. راجع التسويات غير المدفوعة قبل إغلاق الفترة."
        : "Settlement coverage is low. Review unpaid settlements before closing the period.",
      level: "watch",
      priority: 58,
    });
  }

  if (disputedSettlements > 0) {
    push({
      id: "disputed-settlements",
      kind: "risk",
      title: isArabic ? "تسويات عليها اعتراض" : "Disputed settlements",
      description: isArabic
        ? `يوجد ${disputedSettlements} تسوية عليها اعتراض. لا تغلق الفترة قبل توثيق سبب الاعتراض والقرار.`
        : `${disputedSettlements} settlement(s) are disputed. Document the dispute reason and decision before closing the period.`,
      level: "risk",
      priority: 74,
    });
  }

  if (currencyGroups > 1) {
    push({
      id: "mixed-currencies",
      kind: "risk",
      title: isArabic ? "عملات متعددة في التقرير" : "Multiple currencies in report",
      description: isArabic
        ? "التقرير يحتوي أكثر من عملة. تجنب قراءة الصافي كرقم نهائي قبل فصل العملات أو توحيدها يدوياً."
        : "The report contains multiple currencies. Avoid treating net result as final before separating or manually normalizing currencies.",
      level: "watch",
      priority: 54,
    });
  }

  if (activeDeals > 0) {
    push({
      id: "active-deal-opportunity",
      kind: "opportunity",
      title: isArabic ? "عمليات نشطة قابلة للدفع للأمام" : "Active operations can be advanced",
      description: isArabic
        ? `يوجد ${activeDeals} صفقة نشطة. راجع الأعلى قيمة والأقرب للإغلاق لتحسين التحصيل والتسليم.`
        : `${activeDeals} active deal(s) can be advanced. Review the highest-value and closest-to-close operations first.`,
      level: "stable",
      priority: 32,
    });
  }

  if (averageProcessingTimeDays >= 7) {
    push({
      id: "processing-time-watch",
      kind: "risk",
      title: isArabic ? "زمن معالجة يحتاج مراقبة" : "Processing time needs monitoring",
      description: isArabic
        ? `متوسط زمن المعالجة ${Math.round(averageProcessingTimeDays)} يوم. راجع مراحل التأخير قبل زيادة عبء العمل.`
        : `Average processing time is ${Math.round(averageProcessingTimeDays)} days. Review delay stages before increasing workload.`,
      level: averageProcessingTimeDays >= 14 ? "risk" : "watch",
      priority: averageProcessingTimeDays >= 14 ? 70 : 50,
    });
  }

  if (snapshot.topCustomers.length > 0) {
    const topCustomer = snapshot.topCustomers[0];
    push({
      id: "top-customer-focus",
      kind: "opportunity",
      title: isArabic ? "عميل مؤثر يحتاج متابعة مركزة" : "High-impact customer focus",
      description: isArabic
        ? `العميل ${topCustomer.fullName} ظاهر ضمن أعلى العملاء تأثيراً. راجع رصيده وطلباته قبل إرسال التقرير التنفيذي.`
        : `${topCustomer.fullName} is a high-impact customer. Review balance and requests before sending the executive report.`,
      level: "stable",
      priority: 30,
    });
  }

  const riskScore = clamp(
    (netProfit < 0 ? 30 : 0) +
      (profitMargin < 0.12 && summary.income > 0 ? 15 : 0) +
      (collectionExposure > 0 && summary.income > 0 ? Math.min(25, (collectionExposure / summary.income) * 35) : 0) +
      Math.min(15, pendingEditRequests * 3) +
      Math.min(12, unpaidDeals * 4) +
      (currencyGroups > 1 ? 8 : 0) +
      (disputedSettlements > 0 ? 15 : 0) +
      (averageProcessingTimeDays >= 7 ? 8 : 0),
  );

  const executiveLevel = levelFromScore(riskScore);
  const sortedInsights = uniqueById(insights).sort((a, b) => b.priority - a.priority);
  const risks = sortedInsights.filter((item) => item.kind === "risk").slice(0, 5);
  const opportunities = sortedInsights.filter((item) => item.kind === "opportunity").slice(0, 4);
  const highlights = sortedInsights.filter((item) => item.kind === "highlight").slice(0, 3);
  const actionPlan = uniqueById([
    ...risks.map((risk) => ({ ...risk, kind: "action" as const })),
    ...opportunities.slice(0, 2).map((opportunity) => ({ ...opportunity, kind: "action" as const })),
  ]).slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    executiveScore: Math.round(riskScore),
    executiveLevel,
    summary: isArabic
      ? `تم تحليل ${summary.requests} طلب، ${summary.deals} صفقة، ${summary.shipments} شحنة، وصافي مالي ${Math.round(netProfit).toLocaleString()}. مستوى المتابعة التنفيذي: ${executiveLevel}.`
      : `Analyzed ${summary.requests} requests, ${summary.deals} deals, ${summary.shipments} shipments, and net result ${Math.round(netProfit).toLocaleString()}. Executive follow-up level: ${executiveLevel}.`,
    metrics: {
      netProfit,
      profitMargin,
      collectionExposure,
      settlementCoverageRatio,
      pendingEditRequests,
      activeDeals,
      averageProcessingTimeDays,
    },
    highlights,
    risks,
    opportunities,
    actionPlan,
  };
};
