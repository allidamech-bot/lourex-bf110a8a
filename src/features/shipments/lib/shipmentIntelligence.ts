import type { OperationalShipment } from "@/lib/operationsDomain";
import type { ShipmentStageCode, TrackingUpdateRecord } from "@/types/lourex";

export type ShipmentHealthState =
  | "on_track"
  | "needs_update"
  | "delayed"
  | "blocked"
  | "missing_documents"
  | "customer_waiting"
  | "customs_risk"
  | "delivery_risk"
  | "unknown";

export type ShipmentRiskFlag =
  | "missing_tracking_number"
  | "missing_deal_link"
  | "missing_customer_visible_update"
  | "stale_stage"
  | "active_without_recent_update"
  | "delivered_missing_confirmation"
  | "customs_stage_attention"
  | "delivery_stage_attention"
  | "missing_required_documents"
  | "no_timeline_events";

export type ShipmentDocumentKey =
  | "commercial_invoice"
  | "packing_list"
  | "certificate_of_origin"
  | "bill_of_lading_or_awb"
  | "export_declaration"
  | "insurance_document"
  | "saber_sfda_halal_msds"
  | "proof_of_delivery";

export type ShipmentDocumentImportance = "required" | "recommended";
export type ShipmentDocumentStatus = "missing" | "recommended";

export type ShipmentDocumentChecklistItem = {
  key: ShipmentDocumentKey;
  importance: ShipmentDocumentImportance;
  status: ShipmentDocumentStatus;
  stageRelevant: boolean;
};

export type ShipmentIntelligenceAnalysis = {
  healthState: ShipmentHealthState;
  healthScore: number;
  staleDays: number;
  lastOperationalUpdateAt: string | null;
  riskFlags: ShipmentRiskFlag[];
  checklist: ShipmentDocumentChecklistItem[];
  customerSafeNextStepKey: string;
};

export type CustomerSafeShipmentView = {
  trackingId: string;
  stage: ShipmentStageCode;
  customerVisibleNote: string;
  nextStepKey: string;
  healthState: Extract<ShipmentHealthState, "on_track" | "needs_update" | "delayed" | "unknown">;
};

export const SHIPMENT_INTELLIGENCE_THRESHOLDS = {
  staleStageDays: 5,
  delayedStageDays: 10,
  customsAttentionDays: 3,
  deliveryAttentionDays: 2,
} as const;

const terminalStages = new Set<ShipmentStageCode>(["delivered", "closed"]);
const exportDocumentStages = new Set<ShipmentStageCode>([
  "preparing_export",
  "departed_turkey",
  "in_transit",
  "arrived_destination",
  "customs_clearance",
  "out_for_delivery",
  "delivered",
  "closed",
]);
const customsDocumentStages = new Set<ShipmentStageCode>([
  "arrived_destination",
  "customs_clearance",
  "out_for_delivery",
  "delivered",
  "closed",
]);

const toValidDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysBetween = (from: Date | null, to: Date) => {
  if (!from) return 0;
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
};

const latestDate = (values: Array<string | null | undefined>) => {
  const dates = values.map(toValidDate).filter((date): date is Date => Boolean(date));
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime())));
};

const hasCustomerVisibleUpdate = (shipment: Pick<OperationalShipment, "customerVisibleNote" | "timeline" | "shipmentEvents">) =>
  Boolean(shipment.customerVisibleNote?.trim()) ||
  shipment.timeline.some(
    (event) => event.visibility === "customer_visible" && Boolean(event.customerNote?.trim()),
  ) ||
  shipment.shipmentEvents.some((event) => event.isCustomerVisible && Boolean(event.note?.trim()));

const getTimelineDates = (timeline: TrackingUpdateRecord[]) =>
  timeline.flatMap((event) => [event.occurredAt, event.createdAt]);

export const getShipmentLastOperationalUpdateAt = (shipment: OperationalShipment) =>
  latestDate([
    shipment.updatedAt,
    ...getTimelineDates(shipment.timeline),
    ...shipment.shipmentEvents.map((event) => event.createdAt),
  ]);

export const deriveShipmentDocumentChecklist = (shipment: Pick<OperationalShipment, "stage">): ShipmentDocumentChecklistItem[] => {
  const isExportStage = exportDocumentStages.has(shipment.stage);
  const isCustomsStage = customsDocumentStages.has(shipment.stage);
  const isDelivered = terminalStages.has(shipment.stage);

  return [
    {
      key: "commercial_invoice",
      importance: "required",
      status: isExportStage ? "missing" : "recommended",
      stageRelevant: isExportStage,
    },
    {
      key: "packing_list",
      importance: "required",
      status: isExportStage ? "missing" : "recommended",
      stageRelevant: isExportStage,
    },
    {
      key: "bill_of_lading_or_awb",
      importance: "required",
      status: isExportStage ? "missing" : "recommended",
      stageRelevant: isExportStage,
    },
    {
      key: "certificate_of_origin",
      importance: "recommended",
      status: "recommended",
      stageRelevant: isExportStage,
    },
    {
      key: "export_declaration",
      importance: "recommended",
      status: "recommended",
      stageRelevant: isExportStage,
    },
    {
      key: "insurance_document",
      importance: "recommended",
      status: "recommended",
      stageRelevant: isExportStage,
    },
    {
      key: "saber_sfda_halal_msds",
      importance: "recommended",
      status: "recommended",
      stageRelevant: isCustomsStage,
    },
    {
      key: "proof_of_delivery",
      importance: "required",
      status: isDelivered ? "missing" : "recommended",
      stageRelevant: isDelivered,
    },
  ];
};

export const deriveShipmentRiskFlags = (
  shipment: OperationalShipment,
  now = new Date(),
): ShipmentRiskFlag[] => {
  const flags = new Set<ShipmentRiskFlag>();
  const lastUpdate = getShipmentLastOperationalUpdateAt(shipment);
  const staleDays = daysBetween(lastUpdate, now);
  const isTerminal = terminalStages.has(shipment.stage);
  const checklist = deriveShipmentDocumentChecklist(shipment);

  if (!shipment.trackingId.trim()) flags.add("missing_tracking_number");
  if (!shipment.dealId && !shipment.dealNumber) flags.add("missing_deal_link");
  if (!shipment.timeline.length && !shipment.shipmentEvents.length) flags.add("no_timeline_events");
  if (!hasCustomerVisibleUpdate(shipment)) flags.add("missing_customer_visible_update");

  if (!isTerminal && staleDays >= SHIPMENT_INTELLIGENCE_THRESHOLDS.staleStageDays) {
    flags.add("stale_stage");
  }

  if (!isTerminal && staleDays >= SHIPMENT_INTELLIGENCE_THRESHOLDS.delayedStageDays) {
    flags.add("active_without_recent_update");
  }

  if (shipment.stage === "customs_clearance" && staleDays >= SHIPMENT_INTELLIGENCE_THRESHOLDS.customsAttentionDays) {
    flags.add("customs_stage_attention");
  }

  if (shipment.stage === "out_for_delivery" && staleDays >= SHIPMENT_INTELLIGENCE_THRESHOLDS.deliveryAttentionDays) {
    flags.add("delivery_stage_attention");
  }

  if (isTerminal && !hasCustomerVisibleUpdate(shipment)) {
    flags.add("delivered_missing_confirmation");
  }

  if (
    exportDocumentStages.has(shipment.stage) &&
    checklist.some((item) => item.importance === "required" && item.status === "missing" && item.stageRelevant)
  ) {
    flags.add("missing_required_documents");
  }

  return [...flags];
};

export const classifyShipmentHealth = (riskFlags: ShipmentRiskFlag[]): ShipmentHealthState => {
  if (!riskFlags.length) return "on_track";
  if (riskFlags.includes("missing_tracking_number")) return "blocked";
  if (riskFlags.includes("active_without_recent_update")) return "delayed";
  if (riskFlags.includes("customs_stage_attention")) return "customs_risk";
  if (riskFlags.includes("delivery_stage_attention")) return "delivery_risk";
  if (riskFlags.includes("missing_required_documents")) return "missing_documents";
  if (riskFlags.includes("delivered_missing_confirmation")) return "customer_waiting";
  if (riskFlags.includes("missing_customer_visible_update")) return "customer_waiting";
  if (riskFlags.includes("stale_stage") || riskFlags.includes("no_timeline_events")) return "needs_update";
  if (riskFlags.includes("missing_deal_link")) return "unknown";
  return "needs_update";
};

const calculateHealthScore = (riskFlags: ShipmentRiskFlag[]) => {
  const penalties: Record<ShipmentRiskFlag, number> = {
    missing_tracking_number: 35,
    missing_deal_link: 10,
    missing_customer_visible_update: 12,
    stale_stage: 14,
    active_without_recent_update: 26,
    delivered_missing_confirmation: 16,
    customs_stage_attention: 22,
    delivery_stage_attention: 20,
    missing_required_documents: 24,
    no_timeline_events: 10,
  };

  const score = 100 - riskFlags.reduce((sum, flag) => sum + penalties[flag], 0);
  return Math.max(0, Math.min(100, score));
};

const getCustomerSafeNextStepKey = (shipment: Pick<OperationalShipment, "stage">) => {
  if (shipment.stage === "closed" || shipment.stage === "delivered") return "delivered";
  if (shipment.stage === "customs_clearance") return "customs";
  if (shipment.stage === "out_for_delivery") return "delivery";
  if (shipment.stage === "in_transit" || shipment.stage === "departed_turkey") return "transit";
  if (shipment.stage === "preparing_export" || shipment.stage === "in_turkey_warehouse") return "documents";
  return "preparation";
};

export const analyzeShipmentIntelligence = (
  shipment: OperationalShipment,
  now = new Date(),
): ShipmentIntelligenceAnalysis => {
  const lastUpdate = getShipmentLastOperationalUpdateAt(shipment);
  const riskFlags = deriveShipmentRiskFlags(shipment, now);

  return {
    healthState: classifyShipmentHealth(riskFlags),
    healthScore: calculateHealthScore(riskFlags),
    staleDays: daysBetween(lastUpdate, now),
    lastOperationalUpdateAt: lastUpdate?.toISOString() || null,
    riskFlags,
    checklist: deriveShipmentDocumentChecklist(shipment),
    customerSafeNextStepKey: getCustomerSafeNextStepKey(shipment),
  };
};

export const buildCustomerSafeShipmentView = (
  shipment: OperationalShipment,
  analysis = analyzeShipmentIntelligence(shipment),
): CustomerSafeShipmentView => {
  const customerHealth: CustomerSafeShipmentView["healthState"] =
    analysis.healthState === "delayed"
      ? "delayed"
      : analysis.healthState === "on_track"
        ? "on_track"
        : analysis.riskFlags.some((flag) =>
              [
                "missing_customer_visible_update",
                "stale_stage",
                "active_without_recent_update",
                "delivered_missing_confirmation",
              ].includes(flag),
            )
          ? "needs_update"
          : "on_track";

  return {
    trackingId: shipment.trackingId,
    stage: shipment.stage,
    customerVisibleNote: shipment.customerVisibleNote,
    nextStepKey: analysis.customerSafeNextStepKey,
    healthState: customerHealth,
  };
};

export const buildShipmentIntelligenceAiContext = (
  shipment: OperationalShipment,
  analysis = analyzeShipmentIntelligence(shipment),
) => ({
  trackingId: shipment.trackingId,
  dealNumber: shipment.dealNumber || null,
  requestNumber: shipment.requestNumber || null,
  stage: shipment.stage,
  destination: shipment.destination,
  lastUpdated: shipment.updatedAt,
  lastOperationalUpdateAt: analysis.lastOperationalUpdateAt,
  staleDays: analysis.staleDays,
  customerVisibleNotePresent: hasCustomerVisibleUpdate(shipment),
  healthState: analysis.healthState,
  healthScore: analysis.healthScore,
  riskFlags: analysis.riskFlags,
  documentChecklist: analysis.checklist,
  customerSafeNextStepKey: analysis.customerSafeNextStepKey,
  recentTimeline: shipment.timeline.slice(-5).map((event) => ({
    stageCode: event.stageCode,
    visibility: event.visibility,
    customerNote: event.customerNote,
    occurredAt: event.occurredAt,
  })),
  recentEvents: shipment.shipmentEvents.slice(-5).map((event) => ({
    eventType: event.eventType,
    fromStage: event.fromStage,
    toStage: event.toStage,
    isCustomerVisible: event.isCustomerVisible,
    createdAt: event.createdAt,
  })),
});
