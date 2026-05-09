import type { PurchaseRequest, PurchaseRequestStatus } from "@/types/lourex";

export type SmartRequestWorkflowStatus =
  | "request_created"
  | "under_review"
  | "clarification_requested"
  | "customer_replied"
  | "ready_for_sourcing"
  | "quotation_in_progress"
  | "converted_to_deal"
  | "completed"
  | "cancelled";

export type SmartRequestSignal = "low" | "medium" | "high";

export type MissingInformationKey =
  | "missing_specifications"
  | "missing_images"
  | "missing_target_quantity"
  | "missing_shipping_method"
  | "missing_packaging_requirements"
  | "missing_destination_market"
  | "missing_compliance_information"
  | "missing_dimensions"
  | "missing_target_market";

export type SmartRequestAnalysis = {
  readinessScore: number;
  completenessScore: number;
  sourcingDifficulty: SmartRequestSignal;
  complianceRisk: SmartRequestSignal;
  estimatedClarificationCount: number;
  missingInformation: MissingInformationKey[];
  riskReasons: MissingInformationKey[];
  workflowStatus: SmartRequestWorkflowStatus;
};

export type RequestTimelineEvent = {
  key: string;
  labelKey: string;
  timestamp?: string | null;
  active: boolean;
};

const isFilled = (value: unknown) =>
  typeof value === "string" ? value.trim().length > 0 : Boolean(value);

const hasUsefulText = (value: unknown, minLength = 12) =>
  typeof value === "string" && value.trim().length >= minLength;

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

const regulatedProductTerms = [
  "food",
  "snack",
  "drink",
  "beverage",
  "halal",
  "cosmetic",
  "cream",
  "perfume",
  "chemical",
  "battery",
  "electronic",
  "medical",
  "supplement",
  "غذاء",
  "غذائي",
  "حلال",
  "تجميل",
  "كريم",
  "عطر",
  "كيما",
  "بطارية",
  "طبي",
];

export const mapRequestWorkflowStatus = (request: Pick<PurchaseRequest, "status" | "convertedDealNumber">): SmartRequestWorkflowStatus => {
  if (request.status === "cancelled") return "cancelled";
  if (request.status === "completed") return "completed";
  if (request.convertedDealNumber) return "converted_to_deal";
  if (request.status === "intake_submitted") return "request_created";
  if (request.status === "awaiting_clarification") return "clarification_requested";
  if (request.status === "ready_for_conversion") return "ready_for_sourcing";
  if (request.status === "in_progress" || request.status === "transfer_proof_pending" || request.status === "transfer_proof_rejected") {
    return "quotation_in_progress";
  }
  return "under_review";
};

export const analyzeSmartPurchaseRequest = (request: PurchaseRequest): SmartRequestAnalysis => {
  const missingInformation: MissingInformationKey[] = [];
  const attachmentsCount = (request.attachments?.length || 0) + (request.imageUrls?.length || 0);
  const combinedText = [
    request.productName,
    request.productDescription,
    request.technicalSpecs,
    request.deliveryNotes,
    request.material,
    request.qualityLevel,
  ]
    .join(" ")
    .toLowerCase();

  if (!hasUsefulText(request.technicalSpecs, 20) && !hasUsefulText(request.productDescription, 45)) {
    missingInformation.push("missing_specifications");
  }
  if (!attachmentsCount) missingInformation.push("missing_images");
  if (!request.quantity || request.quantity <= 0) missingInformation.push("missing_target_quantity");
  if (!isFilled(request.preferredShippingMethod)) missingInformation.push("missing_shipping_method");
  if (!hasUsefulText(request.deliveryNotes, 12)) missingInformation.push("missing_packaging_requirements");
  if (!isFilled(request.destination) && !isFilled(request.customer.country)) missingInformation.push("missing_destination_market");
  if (!hasUsefulText(request.technicalSpecs, 20) && includesAny(combinedText, regulatedProductTerms)) {
    missingInformation.push("missing_compliance_information");
  }
  if (!isFilled(request.sizeDimensions) && !isFilled(request.weight)) missingInformation.push("missing_dimensions");
  if (!isFilled(request.customer.country) && !isFilled(request.destination)) missingInformation.push("missing_target_market");

  const uniqueMissing = Array.from(new Set(missingInformation));
  const requiredChecks = 9;
  const completenessScore = Math.max(0, Math.round(((requiredChecks - uniqueMissing.length) / requiredChecks) * 100));
  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      completenessScore -
        (uniqueMissing.includes("missing_compliance_information") ? 10 : 0) -
        (uniqueMissing.includes("missing_target_quantity") ? 8 : 0),
    ),
  );

  const complianceRisk: SmartRequestSignal =
    uniqueMissing.includes("missing_compliance_information") || includesAny(combinedText, regulatedProductTerms)
      ? uniqueMissing.includes("missing_compliance_information")
        ? "high"
        : "medium"
      : "low";

  const sourcingDifficulty: SmartRequestSignal =
    readinessScore < 45 || uniqueMissing.length >= 5
      ? "high"
      : readinessScore < 75 || uniqueMissing.length >= 3
        ? "medium"
        : "low";

  return {
    readinessScore,
    completenessScore,
    sourcingDifficulty,
    complianceRisk,
    estimatedClarificationCount: Math.min(8, Math.max(0, uniqueMissing.length)),
    missingInformation: uniqueMissing,
    riskReasons: uniqueMissing.filter((key) =>
      ["missing_compliance_information", "missing_shipping_method", "missing_destination_market", "missing_target_quantity"].includes(key),
    ),
    workflowStatus:
      request.status === "under_review" && request.internalNotes?.includes("Customer clarification reply")
        ? "customer_replied"
        : mapRequestWorkflowStatus(request),
  };
};

export const buildSupplierBriefDraft = (request: PurchaseRequest, language: "en" | "ar") => {
  if (language === "ar") {
    return [
      `موجز مورد للطلب ${request.requestNumber}`,
      `- المنتج: ${request.productName || "غير محدد"}`,
      `- الوصف: ${request.productDescription || "غير محدد"}`,
      `- المواصفات: ${request.technicalSpecs || "تحتاج تأكيد"}`,
      `- الكمية: ${request.quantity || "تحتاج تأكيد"}`,
      `- التغليف/الملاحظات: ${request.deliveryNotes || "تحتاج تأكيد"}`,
      `- السوق أو الوجهة: ${request.destination || request.customer.country || "تحتاج تأكيد"}`,
      `- الشحن المفضل: ${request.preferredShippingMethod || "تحتاج تأكيد"}`,
      `- ملاحظات الامتثال: مراجعة الوثائق والشهادات المطلوبة قبل أي التزام.`,
      "هذا الموجز مسودة إرشادية فقط ولا يتم إرساله تلقائيا.",
    ].join("\n");
  }

  return [
    `Supplier brief for ${request.requestNumber}`,
    `- Product: ${request.productName || "Not specified"}`,
    `- Description: ${request.productDescription || "Not specified"}`,
    `- Specifications: ${request.technicalSpecs || "Needs confirmation"}`,
    `- Quantity: ${request.quantity || "Needs confirmation"}`,
    `- Packaging/notes: ${request.deliveryNotes || "Needs confirmation"}`,
    `- Target market/destination: ${request.destination || request.customer.country || "Needs confirmation"}`,
    `- Preferred shipping: ${request.preferredShippingMethod || "Needs confirmation"}`,
    "- Compliance notes: review required documents and certifications before any commitment.",
    "This is an advisory draft only and is not sent automatically.",
  ].join("\n");
};

export const buildRequestTimeline = (request: PurchaseRequest): RequestTimelineEvent[] => {
  const workflowStatus =
    request.status === "under_review" && request.internalNotes?.includes("Customer clarification reply")
      ? "customer_replied"
      : mapRequestWorkflowStatus(request);
  const isAtLeast = (statuses: SmartRequestWorkflowStatus[]) => statuses.includes(workflowStatus);

  return [
    {
      key: "request_created",
      labelKey: "requests.smart.timeline.requestCreated",
      timestamp: request.createdAt,
      active: true,
    },
    {
      key: "ai_analyzed",
      labelKey: "requests.smart.timeline.aiAnalyzed",
      timestamp: request.reviewedAt,
      active: Boolean(request.reviewedAt),
    },
    {
      key: "clarification_requested",
      labelKey: "requests.smart.timeline.clarificationRequested",
      timestamp: request.reviewedAt,
      active: isAtLeast(["clarification_requested"]),
    },
    {
      key: "customer_replied",
      labelKey: "requests.smart.timeline.customerReplied",
      active: isAtLeast(["under_review", "ready_for_sourcing", "quotation_in_progress", "converted_to_deal", "completed"]),
    },
    {
      key: "ready_for_sourcing",
      labelKey: "requests.smart.timeline.readyForSourcing",
      timestamp: request.reviewedAt,
      active: isAtLeast(["ready_for_sourcing", "quotation_in_progress", "converted_to_deal", "completed"]),
    },
    {
      key: "quotation_in_progress",
      labelKey: "requests.smart.timeline.quotationStarted",
      active: isAtLeast(["quotation_in_progress", "converted_to_deal", "completed"]),
    },
    {
      key: "converted_to_deal",
      labelKey: "requests.smart.timeline.convertedToDeal",
      active: Boolean(request.convertedDealNumber),
    },
  ];
};

export const getNextSmartStatus = (analysis: SmartRequestAnalysis): PurchaseRequestStatus =>
  analysis.readinessScore >= 75 && analysis.estimatedClarificationCount <= 2
    ? "ready_for_conversion"
    : "awaiting_clarification";
