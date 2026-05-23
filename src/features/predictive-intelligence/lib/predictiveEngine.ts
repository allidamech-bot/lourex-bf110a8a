type RequestLike = {
  id: string;
  requestNumber?: string;
  status?: string;
  createdAt?: string;
  productName?: string;
  productDescription?: string;
  quantity?: number;
  destination?: string;
  preferredShippingMethod?: string;
  technicalSpecs?: string;
  referenceLink?: string;
  material?: string;
  sizeDimensions?: string;
  color?: string;
  brand?: string;
  expectedSupplyDate?: string;
  attachments?: Array<unknown>;
  customer?: {
    fullName?: string;
    email?: string;
    country?: string;
    city?: string;
  };
};

type DealLike = {
  id: string;
  operationalStatus?: string;
  createdAt?: string;
  totalValue?: number;
};

type ShipmentLike = {
  id: string;
  stage?: string;
  updatedAt?: string;
  timeline?: Array<unknown>;
};

type FinancialEditRequestLike = {
  id: string;
  status?: string;
  createdAt?: string;
};

export type PredictiveRiskLevel = "low" | "medium" | "high" | "critical";
export type PredictiveCategory = "intake" | "clarification" | "conversion" | "shipment" | "finance" | "data_quality";

export type PredictiveSignal = {
  id: string;
  title: string;
  description: string;
  score: number;
  level: PredictiveRiskLevel;
  category: PredictiveCategory;
  entityType: "request" | "shipment" | "finance" | "portfolio";
  entityId?: string;
  entityLabel?: string;
  recommendedAction: string;
};

export type PredictiveDataset = {
  requests: RequestLike[];
  deals: DealLike[];
  shipments: ShipmentLike[];
  financialEditRequests: FinancialEditRequestLike[];
};

export type PredictiveIntelligenceResult = {
  generatedAt: string;
  portfolioScore: number;
  portfolioLevel: PredictiveRiskLevel;
  summary: string;
  metrics: {
    openRequests: number;
    highRiskRequests: number;
    clarificationBacklog: number;
    readyForConversion: number;
    staleShipments: number;
    pendingFinanceEdits: number;
  };
  signals: PredictiveSignal[];
  nextActions: string[];
};

const isPresent = (value: unknown) => typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined;

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const daysSince = (value?: string) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
};

const levelFromScore = (score: number): PredictiveRiskLevel => {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
};

const completenessScore = (request: RequestLike) => {
  const checks = [
    request.productName,
    request.productDescription && request.productDescription.length >= 24 ? request.productDescription : "",
    request.quantity && request.quantity > 0 ? String(request.quantity) : "",
    request.destination,
    request.technicalSpecs,
    request.referenceLink,
    request.material || request.sizeDimensions || request.color || request.brand,
    request.attachments && request.attachments.length > 0 ? "attachments" : "",
    request.customer?.fullName,
    request.customer?.email,
  ];

  const present = checks.filter(isPresent).length;
  return Math.round((present / checks.length) * 100);
};

const requestRiskScore = (request: RequestLike) => {
  const completeness = completenessScore(request);
  const age = daysSince(request.createdAt);
  let score = 100 - completeness;

  if (request.status === "awaiting_clarification") score += 25;
  if (request.status === "intake_submitted" && age >= 2) score += 15;
  if (request.status === "under_review" && age >= 4) score += 20;
  if (request.status === "ready_for_conversion" && age >= 2) score += 15;
  if (!request.attachments?.length) score += 8;
  if (!request.technicalSpecs) score += 10;
  if (!request.destination) score += 8;
  if (!request.quantity || request.quantity <= 0) score += 12;

  return clamp(score);
};

const makeSignal = (input: Omit<PredictiveSignal, "level">): PredictiveSignal => ({
  ...input,
  score: clamp(input.score),
  level: levelFromScore(input.score),
});

export const buildPredictiveIntelligence = (
  dataset: PredictiveDataset,
  language: "ar" | "en" = "en",
): PredictiveIntelligenceResult => {
  const isArabic = language === "ar";
  const openRequests = dataset.requests.filter((request) => !["completed", "cancelled"].includes(String(request.status || "")));
  const signals: PredictiveSignal[] = [];

  for (const request of openRequests) {
    const score = requestRiskScore(request);
    const completeness = completenessScore(request);
    const label = request.requestNumber || request.productName || request.id;

    if (score >= 35) {
      signals.push(makeSignal({
        id: `request-risk-${request.id}`,
        title: isArabic ? `خطر بيانات في ${label}` : `Request data risk: ${label}`,
        description: isArabic
          ? `جاهزية بيانات الطلب ${completeness}%. توجد احتمالية تأخير أو حاجة لتوضيحات قبل التسعير أو التوريد.`
          : `Request data readiness is ${completeness}%. This may delay pricing, sourcing, or conversion.`,
        score,
        category: completeness < 60 ? "data_quality" : "intake",
        entityType: "request",
        entityId: request.id,
        entityLabel: label,
        recommendedAction: isArabic
          ? "راجع الحقول الناقصة واطلب توضيحاً محدداً من العميل قبل تحويل الطلب للمورد."
          : "Review missing fields and request targeted clarification before supplier routing.",
      }));
    }

    if (request.status === "ready_for_conversion") {
      signals.push(makeSignal({
        id: `conversion-${request.id}`,
        title: isArabic ? `جاهز للتحويل: ${label}` : `Ready for conversion: ${label}`,
        description: isArabic
          ? "الطلب جاهز تشغيلياً للانتقال إلى صفقة، وقد يسبب تراكمه تأخيراً في المتابعة."
          : "This request is operationally ready to become a deal; backlog here can delay fulfillment.",
        score: daysSince(request.createdAt) >= 2 ? 68 : 45,
        category: "conversion",
        entityType: "request",
        entityId: request.id,
        entityLabel: label,
        recommendedAction: isArabic ? "حوّل الطلب إلى صفقة أو وثّق سبب التأجيل." : "Convert it to a deal or document the reason for deferral.",
      }));
    }
  }

  for (const shipment of dataset.shipments) {
    const staleDays = daysSince(shipment.updatedAt);
    const active = !["delivered", "closed"].includes(String(shipment.stage || ""));
    if (active && (staleDays >= 5 || !shipment.timeline?.length)) {
      signals.push(makeSignal({
        id: `shipment-stale-${shipment.id}`,
        title: isArabic ? "احتمال تأخير شحنة" : "Potential shipment delay",
        description: isArabic
          ? `لم يتم تحديث الشحنة منذ ${staleDays} يوم/أيام أو أن سجلها الزمني ضعيف.`
          : `Shipment has not been updated for ${staleDays} day(s), or its timeline activity is weak.`,
        score: staleDays >= 10 ? 82 : 58,
        category: "shipment",
        entityType: "shipment",
        entityId: shipment.id,
        recommendedAction: isArabic ? "اطلب تحديثاً تشغيلياً وحدد المرحلة الحالية بدقة." : "Request an operational update and confirm the current stage.",
      }));
    }
  }

  const pendingFinanceEdits = dataset.financialEditRequests.filter((item) => item.status === "pending");
  if (pendingFinanceEdits.length > 0) {
    signals.push(makeSignal({
      id: "finance-edit-backlog",
      title: isArabic ? "طلبات تعديل مالي معلقة" : "Pending financial edit requests",
      description: isArabic
        ? `يوجد ${pendingFinanceEdits.length} طلب/طلبات تعديل مالي بانتظار المراجعة.`
        : `${pendingFinanceEdits.length} financial edit request(s) are waiting for review.`,
      score: pendingFinanceEdits.length >= 5 ? 75 : 48,
      category: "finance",
      entityType: "finance",
      recommendedAction: isArabic ? "راجع طلبات التعديل المالي قبل إقفال التقارير أو التسويات." : "Review financial edits before closing reports or settlements.",
    }));
  }

  const sortedSignals = signals.sort((a, b) => b.score - a.score).slice(0, 12);
  const highRiskRequests = sortedSignals.filter((signal) => signal.entityType === "request" && ["high", "critical"].includes(signal.level)).length;
  const staleShipments = sortedSignals.filter((signal) => signal.category === "shipment").length;
  const portfolioScore = sortedSignals.length
    ? Math.round(sortedSignals.reduce((sum, signal) => sum + signal.score, 0) / sortedSignals.length)
    : 12;
  const portfolioLevel = levelFromScore(portfolioScore);
  const nextActions = sortedSignals.slice(0, 5).map((signal) => signal.recommendedAction);

  return {
    generatedAt: new Date().toISOString(),
    portfolioScore,
    portfolioLevel,
    summary: isArabic
      ? `تم تحليل ${openRequests.length} طلب مفتوح و${dataset.shipments.length} شحنة. مستوى المخاطر العام: ${portfolioLevel}.`
      : `Analyzed ${openRequests.length} open requests and ${dataset.shipments.length} shipments. Overall risk level: ${portfolioLevel}.`,
    metrics: {
      openRequests: openRequests.length,
      highRiskRequests,
      clarificationBacklog: openRequests.filter((request) => request.status === "awaiting_clarification").length,
      readyForConversion: openRequests.filter((request) => request.status === "ready_for_conversion").length,
      staleShipments,
      pendingFinanceEdits: pendingFinanceEdits.length,
    },
    signals: sortedSignals,
    nextActions: Array.from(new Set(nextActions)).slice(0, 5),
  };
};
