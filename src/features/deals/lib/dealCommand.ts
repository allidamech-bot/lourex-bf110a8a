import type { OperationsDeal } from "@/domain/operations/types";
import type { DealOperationalStatus } from "@/types/lourex";

export type DealHealthState =
  | "healthy"
  | "needs_attention"
  | "blocked"
  | "financial_risk"
  | "customer_waiting"
  | "supplier_delay"
  | "shipment_risk"
  | "missing_data";

export type DealRiskFlag =
  | "no_linked_shipment"
  | "stale_shipment"
  | "missing_customer_reference"
  | "missing_request_reference"
  | "missing_tracking"
  | "missing_accounting_reference"
  | "missing_financial_entries"
  | "negative_financial_signal"
  | "missing_turkish_partner"
  | "missing_saudi_partner"
  | "pending_assignment"
  | "missing_sourcing_status"
  | "customer_waiting_for_update"
  | "supplier_follow_up_needed"
  | "converted_without_progress";

export type DealTimelineEventKey =
  | "purchase_request_created"
  | "request_ready_for_sourcing"
  | "deal_created"
  | "sourcing_started"
  | "quotation_in_progress"
  | "supplier_selected"
  | "payment_pending"
  | "shipment_created"
  | "shipment_active"
  | "delivered"
  | "closed";

export type DealTimelineEvent = {
  key: DealTimelineEventKey;
  labelKey: string;
  active: boolean;
  timestamp?: string | null;
};

export type DealHealthAnalysis = {
  state: DealHealthState;
  score: number;
  riskFlags: DealRiskFlag[];
  timeline: DealTimelineEvent[];
  lastShipmentUpdateAt?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const sourcingStatuses: DealOperationalStatus[] = [
  "sourcing",
  "origin_execution",
  "in_transit",
  "destination_execution",
  "delivered",
  "closed",
];

const getMostRecentTimestamp = (values: Array<string | null | undefined>) => {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  if (!timestamps.length) return null;

  return new Date(Math.max(...timestamps)).toISOString();
};

export const getDealLastShipmentUpdateAt = (deal: Pick<OperationsDeal, "trackingUpdates" | "createdAt">) =>
  getMostRecentTimestamp([deal.createdAt, ...deal.trackingUpdates.map((update) => update.occurredAt || update.createdAt)]);

export const deriveDealRiskFlags = (deal: OperationsDeal, now = new Date()): DealRiskFlag[] => {
  const flags: DealRiskFlag[] = [];
  const hasShipment = Boolean(deal.shipmentId || deal.trackingId);
  const lastShipmentUpdateAt = getDealLastShipmentUpdateAt(deal);
  const daysSinceShipmentUpdate = lastShipmentUpdateAt
    ? (now.getTime() - new Date(lastShipmentUpdateAt).getTime()) / DAY_MS
    : null;

  if (!hasShipment) flags.push("no_linked_shipment");
  if (hasShipment && !deal.trackingId) flags.push("missing_tracking");
  if (!deal.customerName || deal.customerName.includes("غير محدد")) flags.push("missing_customer_reference");
  if (!deal.requestNumber && !deal.sourceRequestId) flags.push("missing_request_reference");
  if (!deal.accountingReference) flags.push("missing_accounting_reference");
  if (deal.accountingSummary.entriesCount === 0) flags.push("missing_financial_entries");
  if (deal.accountingSummary.net < 0) flags.push("negative_financial_signal");
  if (!deal.turkishPartnerId) flags.push("missing_turkish_partner");
  if (!deal.saudiPartnerId) flags.push("missing_saudi_partner");
  if (deal.operationalStatus === "awaiting_assignment") flags.push("pending_assignment");
  if (!sourcingStatuses.includes(deal.operationalStatus) && deal.stage === "factory") flags.push("missing_sourcing_status");
  if (deal.operationalStatus === "partner_assigned" && !deal.trackingUpdates.length) flags.push("supplier_follow_up_needed");
  if (deal.stage === "factory" && daysSinceShipmentUpdate !== null && daysSinceShipmentUpdate >= 7) {
    flags.push("converted_without_progress");
  }
  if (daysSinceShipmentUpdate !== null && daysSinceShipmentUpdate >= 5 && deal.stage !== "delivered" && deal.stage !== "closed") {
    flags.push("stale_shipment");
  }
  if (!deal.trackingUpdates.some((update) => update.visibility === "customer_visible" && update.customerNote.trim())) {
    flags.push("customer_waiting_for_update");
  }

  return Array.from(new Set(flags));
};

export const deriveDealHealthState = (deal: OperationsDeal, riskFlags: DealRiskFlag[]): DealHealthState => {
  if (
    riskFlags.includes("no_linked_shipment") ||
    riskFlags.includes("converted_without_progress") ||
    (deal.operationalStatus === "awaiting_assignment" && riskFlags.includes("pending_assignment"))
  ) {
    return "blocked";
  }

  if (riskFlags.includes("negative_financial_signal") || riskFlags.includes("missing_financial_entries")) {
    return "financial_risk";
  }

  if (riskFlags.includes("stale_shipment") || riskFlags.includes("missing_tracking")) {
    return "shipment_risk";
  }

  if (riskFlags.includes("customer_waiting_for_update")) {
    return "customer_waiting";
  }

  if (riskFlags.includes("supplier_follow_up_needed")) {
    return "supplier_delay";
  }

  if (
    riskFlags.includes("missing_customer_reference") ||
    riskFlags.includes("missing_request_reference") ||
    riskFlags.includes("missing_turkish_partner") ||
    riskFlags.includes("missing_saudi_partner") ||
    riskFlags.includes("missing_accounting_reference")
  ) {
    return "missing_data";
  }

  return riskFlags.length ? "needs_attention" : "healthy";
};

export const buildDealTimeline = (deal: OperationsDeal): DealTimelineEvent[] => {
  const lastShipmentUpdateAt = getDealLastShipmentUpdateAt(deal);
  const hasShipment = Boolean(deal.shipmentId || deal.trackingId);

  return [
    {
      key: "purchase_request_created",
      labelKey: "deals.command.timeline.purchaseRequestCreated",
      active: Boolean(deal.requestNumber || deal.sourceRequestId),
      timestamp: deal.createdAt,
    },
    {
      key: "request_ready_for_sourcing",
      labelKey: "deals.command.timeline.requestReadyForSourcing",
      active: Boolean(deal.sourceRequestId),
      timestamp: deal.createdAt,
    },
    {
      key: "deal_created",
      labelKey: "deals.command.timeline.dealCreated",
      active: true,
      timestamp: deal.createdAt,
    },
    {
      key: "sourcing_started",
      labelKey: "deals.command.timeline.sourcingStarted",
      active: sourcingStatuses.includes(deal.operationalStatus),
      timestamp: deal.createdAt,
    },
    {
      key: "quotation_in_progress",
      labelKey: "deals.command.timeline.quotationInProgress",
      active: ["sourcing", "origin_execution", "in_transit", "destination_execution"].includes(deal.operationalStatus),
    },
    {
      key: "supplier_selected",
      labelKey: "deals.command.timeline.supplierSelected",
      active: Boolean(deal.turkishPartnerId || deal.saudiPartnerId),
    },
    {
      key: "payment_pending",
      labelKey: "deals.command.timeline.paymentPending",
      active: deal.accountingSummary.entriesCount === 0 || deal.accountingSummary.net < 0,
    },
    {
      key: "shipment_created",
      labelKey: "deals.command.timeline.shipmentCreated",
      active: hasShipment,
      timestamp: lastShipmentUpdateAt,
    },
    {
      key: "shipment_active",
      labelKey: "deals.command.timeline.shipmentActive",
      active: hasShipment && !["factory", "delivered", "closed"].includes(deal.stage),
      timestamp: lastShipmentUpdateAt,
    },
    {
      key: "delivered",
      labelKey: "deals.command.timeline.delivered",
      active: deal.stage === "delivered" || deal.operationalStatus === "delivered" || deal.operationalStatus === "closed",
      timestamp: lastShipmentUpdateAt,
    },
    {
      key: "closed",
      labelKey: "deals.command.timeline.closed",
      active: deal.operationalStatus === "closed",
      timestamp: deal.operationalStatus === "closed" ? lastShipmentUpdateAt : null,
    },
  ];
};

export const analyzeDealHealth = (deal: OperationsDeal, now = new Date()): DealHealthAnalysis => {
  const riskFlags = deriveDealRiskFlags(deal, now);
  const state = deriveDealHealthState(deal, riskFlags);
  const score = Math.max(
    0,
    Math.min(
      100,
      100 -
        riskFlags.length * 8 -
        (state === "blocked" ? 22 : 0) -
        (state === "financial_risk" || state === "shipment_risk" ? 14 : 0),
    ),
  );

  return {
    state,
    score,
    riskFlags,
    timeline: buildDealTimeline(deal),
    lastShipmentUpdateAt: getDealLastShipmentUpdateAt(deal),
  };
};

export const buildDealAiContext = (deal: OperationsDeal, analysis: DealHealthAnalysis) => ({
  dealNumber: deal.dealNumber,
  operationTitle: deal.operationTitle,
  customerName: deal.customerName,
  requestNumber: deal.requestNumber,
  status: deal.status,
  operationalStatus: deal.operationalStatus,
  stage: deal.stage,
  trackingId: deal.trackingId,
  accountingReference: deal.accountingReference,
  healthState: analysis.state,
  healthScore: analysis.score,
  riskFlags: analysis.riskFlags,
  turkishPartnerAssigned: Boolean(deal.turkishPartnerId),
  saudiPartnerAssigned: Boolean(deal.saudiPartnerId),
  finance: deal.accountingSummary,
  lastShipmentUpdateAt: analysis.lastShipmentUpdateAt,
});
