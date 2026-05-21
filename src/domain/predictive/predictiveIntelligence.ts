import {
  fetchDeals,
  fetchFinancialEditRequests,
  fetchRequests,
  fetchShipments,
} from "@/domain/operations/service";
import type {
  OperationsDeal,
  OperationsFinancialEditRequest,
  OperationsRequest,
  OperationsShipment,
} from "@/domain/operations/types";

export type PredictiveSignalSeverity = "low" | "medium" | "high" | "critical";
export type PredictiveHorizon = "24h" | "3d" | "7d" | "14d";
export type PredictiveCategory = "sales" | "operations" | "logistics" | "finance" | "customer";

export type PredictiveSignal = {
  id: string;
  category: PredictiveCategory;
  title: string;
  severity: PredictiveSignalSeverity;
  probability: number;
  impactScore: number;
  horizon: PredictiveHorizon;
  entityLabel?: string;
  evidence: string[];
  recommendedAction: string;
};

export type PredictiveMetric = {
  id: string;
  label: string;
  value: number | string;
  description: string;
  severity: PredictiveSignalSeverity;
};

export type PredictiveIntelligenceReport = {
  generatedAt: string;
  readinessScore: number;
  confidenceScore: number;
  signals: PredictiveSignal[];
  metrics: PredictiveMetric[];
  nextBestActions: string[];
  sourceCounts: {
    requests: number;
    deals: number;
    shipments: number;
    financialEditRequests: number;
  };
};

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const ageInHours = (value: string | null | undefined, now = Date.now()) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.floor((now - timestamp) / hourMs));
};

const ageInDays = (value: string | null | undefined, now = Date.now()) => Math.floor(ageInHours(value, now) / 24);

const isActiveRequest = (request: OperationsRequest) =>
  ["intake_submitted", "awaiting_clarification", "ready_for_conversion", "transfer_uploaded", "transfer_proof_pending"].includes(
    request.status,
  );

const isRevenueReadyRequest = (request: OperationsRequest, now: number) =>
  isActiveRequest(request) &&
  Boolean(request.productName?.trim()) &&
  Boolean(request.quantity) &&
  Boolean(request.destination || request.customer?.country) &&
  ageInHours(request.createdAt || request.reviewedAt, now) <= 72;

const isConversionAtRiskRequest = (request: OperationsRequest, now: number) =>
  isActiveRequest(request) && ageInHours(request.createdAt || request.reviewedAt, now) >= 36;

const isDealDeliveryRisk = (deal: OperationsDeal) =>
  ["blocked", "on_hold", "needs_attention"].includes(deal.operationalStatus) ||
  (!deal.shipmentId && !["delivered", "cancelled"].includes(deal.stage));

const isShipmentDelayRisk = (shipment: OperationsShipment, now: number) =>
  shipment.stage !== "delivered" && ageInDays(shipment.updatedAt, now) >= 3;

const severityFromRisk = (score: number): PredictiveSignalSeverity => {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
};

const metricSeverity = (value: number, warningAt: number, criticalAt: number): PredictiveSignalSeverity => {
  if (value >= criticalAt) return "critical";
  if (value >= warningAt) return "high";
  if (value > 0) return "medium";
  return "low";
};

const addSignal = (signals: PredictiveSignal[], signal: PredictiveSignal) => {
  signals.push({
    ...signal,
    probability: clamp(signal.probability),
    impactScore: clamp(signal.impactScore),
  });
};

const buildSignals = ({
  requests,
  deals,
  shipments,
  financialEditRequests,
  now,
}: {
  requests: OperationsRequest[];
  deals: OperationsDeal[];
  shipments: OperationsShipment[];
  financialEditRequests: OperationsFinancialEditRequest[];
  now: number;
}): PredictiveSignal[] => {
  const signals: PredictiveSignal[] = [];
  const revenueReady = requests.filter((request) => isRevenueReadyRequest(request, now));
  const conversionAtRisk = requests
    .filter((request) => isConversionAtRiskRequest(request, now))
    .sort((a, b) => ageInHours(b.createdAt || b.reviewedAt, now) - ageInHours(a.createdAt || a.reviewedAt, now));
  const deliveryRisks = deals.filter(isDealDeliveryRisk);
  const delayedShipments = shipments
    .filter((shipment) => isShipmentDelayRisk(shipment, now))
    .sort((a, b) => ageInDays(b.updatedAt, now) - ageInDays(a.updatedAt, now));
  const financeBacklog = financialEditRequests.filter((request) => request.status === "pending");
  const openDealValue = deals
    .filter((deal) => !["delivered", "cancelled"].includes(deal.stage))
    .reduce((total, deal) => total + Math.max(0, Number(deal.totalValue) || 0), 0);

  if (revenueReady.length > 0) {
    const score = Math.min(95, 45 + revenueReady.length * 9);
    addSignal(signals, {
      id: "revenue-ready-conversion-window",
      category: "sales",
      title: "Revenue-ready requests can be converted soon",
      severity: severityFromRisk(score),
      probability: score,
      impactScore: Math.min(100, 35 + revenueReady.length * 8),
      horizon: "3d",
      entityLabel: revenueReady[0].requestNumber || revenueReady[0].productName,
      evidence: [
        `${revenueReady.length} active request(s) include enough sourcing and destination data.`,
        "Recent requests lose momentum if quotation or partner assignment is delayed.",
      ],
      recommendedAction: "Prioritize quotation, supplier outreach, and conversion review for the strongest ready requests.",
    });
  }

  if (conversionAtRisk.length > 0) {
    const oldest = conversionAtRisk[0];
    const score = Math.min(96, 42 + conversionAtRisk.length * 8 + Math.min(20, ageInHours(oldest.createdAt || oldest.reviewedAt, now) / 4));
    addSignal(signals, {
      id: "conversion-dropoff-risk",
      category: "customer",
      title: "Customer conversion momentum is at risk",
      severity: severityFromRisk(score),
      probability: score,
      impactScore: Math.min(100, 45 + conversionAtRisk.length * 7),
      horizon: conversionAtRisk.length >= 5 ? "24h" : "3d",
      entityLabel: oldest.requestNumber || oldest.productName,
      evidence: [
        `${conversionAtRisk.length} active request(s) have waited 36+ hours.`,
        `Oldest open request age: ${ageInHours(oldest.createdAt || oldest.reviewedAt, now)} hours.`,
      ],
      recommendedAction: "Send a concise status update, ask only for missing details, and assign a clear next owner.",
    });
  }

  if (deliveryRisks.length > 0) {
    const score = Math.min(98, 50 + deliveryRisks.length * 10);
    addSignal(signals, {
      id: "delivery-execution-risk",
      category: "operations",
      title: "Delivery execution risk is increasing",
      severity: severityFromRisk(score),
      probability: score,
      impactScore: Math.min(100, 55 + deliveryRisks.length * 8),
      horizon: "7d",
      entityLabel: deliveryRisks[0].dealNumber,
      evidence: [
        `${deliveryRisks.length} deal(s) are blocked, on hold, need attention, or lack shipment linkage.`,
        openDealValue > 0 ? `Open deal value under monitoring: ${Math.round(openDealValue).toLocaleString()}.` : "Open deal value is limited or unavailable.",
      ],
      recommendedAction: "Resolve partner assignment, shipment linkage, and next operational status before customer expectations drift.",
    });
  }

  if (delayedShipments.length > 0) {
    const oldest = delayedShipments[0];
    const score = Math.min(99, 55 + delayedShipments.length * 11 + Math.min(15, ageInDays(oldest.updatedAt, now) * 2));
    addSignal(signals, {
      id: "shipment-delay-forecast",
      category: "logistics",
      title: "Shipment delay probability is elevated",
      severity: severityFromRisk(score),
      probability: score,
      impactScore: Math.min(100, 60 + delayedShipments.length * 9),
      horizon: delayedShipments.length >= 3 ? "24h" : "3d",
      entityLabel: oldest.trackingId || oldest.dealNumber,
      evidence: [
        `${delayedShipments.length} active shipment(s) have stale tracking updates.`,
        `Oldest stale shipment has not changed for ${ageInDays(oldest.updatedAt, now)} day(s).`,
      ],
      recommendedAction: "Verify carrier status, update internal timeline, then publish only confirmed customer-safe notes.",
    });
  }

  if (financeBacklog.length > 0) {
    const score = Math.min(94, 40 + financeBacklog.length * 12);
    addSignal(signals, {
      id: "finance-control-backlog",
      category: "finance",
      title: "Financial correction backlog may slow approvals",
      severity: severityFromRisk(score),
      probability: score,
      impactScore: Math.min(100, 45 + financeBacklog.length * 10),
      horizon: financeBacklog.length >= 3 ? "24h" : "7d",
      entityLabel: financeBacklog[0].targetEntryNumber || financeBacklog[0].id,
      evidence: [
        `${financeBacklog.length} pending financial edit request(s) need owner review.`,
        "Locked accounting workflows depend on timely approval or rejection decisions.",
      ],
      recommendedAction: "Review pending financial corrections with audit context before settlements or exports are finalized.",
    });
  }

  return signals.sort((a, b) => b.probability + b.impactScore - (a.probability + a.impactScore));
};

export const buildPredictiveIntelligenceReport = async (): Promise<PredictiveIntelligenceReport> => {
  const now = Date.now();
  const [requests, deals, shipments, financialEditRequests] = await Promise.all([
    fetchRequests(),
    fetchDeals(),
    fetchShipments(),
    fetchFinancialEditRequests(),
  ]);

  const signals = buildSignals({ requests, deals, shipments, financialEditRequests, now });
  const activeRequests = requests.filter(isActiveRequest);
  const activeShipments = shipments.filter((shipment) => shipment.stage !== "delivered");
  const blockedDeals = deals.filter(isDealDeliveryRisk);
  const delayedShipments = activeShipments.filter((shipment) => isShipmentDelayRisk(shipment, now));
  const pendingFinance = financialEditRequests.filter((request) => request.status === "pending");
  const revenueReady = requests.filter((request) => isRevenueReadyRequest(request, now));
  const conversionAtRisk = requests.filter((request) => isConversionAtRiskRequest(request, now));

  const riskLoad = signals.reduce((total, signal) => total + signal.probability * (signal.impactScore / 100), 0);
  const readinessScore = clamp(100 - riskLoad / Math.max(1, signals.length || 1));
  const dataSources = [requests.length, deals.length, shipments.length, financialEditRequests.length].filter((count) => count > 0).length;
  const confidenceScore = clamp(35 + dataSources * 15 + Math.min(20, requests.length + deals.length + shipments.length));

  const metrics: PredictiveMetric[] = [
    {
      id: "revenue-ready-requests",
      label: "Revenue-ready requests",
      value: revenueReady.length,
      severity: metricSeverity(revenueReady.length, 3, 7),
      description: "Active requests that have enough information to progress toward quotation or conversion.",
    },
    {
      id: "conversion-risk-requests",
      label: "Conversion risk",
      value: conversionAtRisk.length,
      severity: metricSeverity(conversionAtRisk.length, 2, 5),
      description: "Active requests old enough to risk customer drop-off without a clear update.",
    },
    {
      id: "blocked-delivery-deals",
      label: "Delivery risk deals",
      value: blockedDeals.length,
      severity: metricSeverity(blockedDeals.length, 2, 5),
      description: "Deals showing blocked/on-hold status, attention flags, or missing shipment linkage.",
    },
    {
      id: "delay-risk-shipments",
      label: "Delay-risk shipments",
      value: delayedShipments.length,
      severity: metricSeverity(delayedShipments.length, 1, 3),
      description: "Active shipments with stale tracking activity for 3+ days.",
    },
    {
      id: "finance-control-backlog",
      label: "Finance control backlog",
      value: pendingFinance.length,
      severity: metricSeverity(pendingFinance.length, 1, 3),
      description: "Pending locked-entry correction requests that may slow financial approvals.",
    },
  ];

  const nextBestActions = signals.slice(0, 4).map((signal) => signal.recommendedAction);

  return {
    generatedAt: new Date(now).toISOString(),
    readinessScore,
    confidenceScore,
    signals,
    metrics,
    nextBestActions,
    sourceCounts: {
      requests: activeRequests.length,
      deals: deals.length,
      shipments: activeShipments.length,
      financialEditRequests: financialEditRequests.length,
    },
  };
};
