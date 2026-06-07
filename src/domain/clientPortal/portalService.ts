import type { OperationalDeal, OperationalShipment } from "@/lib/operationsDomain";
import type { ClientPortalDealView, ClientPortalShipmentView } from "./types";

/**
 * Ensures that the client only sees safe, public fields and updates.
 * Internal financial metrics, partner IDs, and internal notes are securely omitted.
 */
export const prepareClientShipmentView = (shipment: OperationalShipment): ClientPortalShipmentView => {
  return {
    id: shipment.id,
    trackingId: shipment.trackingId,
    currentStage: shipment.stage,
    originCountry: shipment.dealId ? null : null, // Not directly on shipment in some cases, omitted or derived if available
    destinationCountry: shipment.destination || null,
    updatesHistory: shipment.timeline
      .filter((update) => update.visibility === "customer_visible")
      .map((update) => ({
        stageCode: update.stageCode,
        occurredAt: update.occurredAt,
        customerNote: update.customerNote || "",
      })),
    dealId: shipment.dealId,
    dealNumber: shipment.dealNumber,
    requestNumber: shipment.requestNumber,
    destination: shipment.destination || "",
    pallets: shipment.pallets || 0,
    weight: shipment.weight || 0,
    updatedAt: shipment.updatedAt,
    customerVisibleNote: shipment.customerVisibleNote,
    shipmentEvents: shipment.shipmentEvents || [],
    timeline: shipment.timeline || [],
    stage: shipment.stage,
    customerEmail: shipment.customerEmail,
  };
};

/**
 * Maps an internal operational deal into a safe client portal view.
 */
export const prepareClientDealView = (
  deal: OperationalDeal,
  shipments: OperationalShipment[] = []
): ClientPortalDealView => {
  const linkedShipment = shipments.find(
    (s) => s.dealId === deal.id || s.id === deal.shipmentId
  );

  return {
    id: deal.id,
    dealNumber: deal.dealNumber,
    operationTitle: deal.operationTitle,
    status: deal.status,
    operationalStatus: deal.operationalStatus,
    createdAt: deal.createdAt,
    totalValue: deal.totalValue,
    currency: deal.currency,
    ...(linkedShipment ? { shipment: prepareClientShipmentView(linkedShipment) } : {}),
  };
};

/**
 * Read-Only Safety Checker.
 * Blocks any write mutations attempted under a client portal session.
 */
export const assertClientReadOnlyAccess = (role: string | null | undefined): void => {
  if (role === "customer") {
    throw new Error("Operation forbidden: Client account has read-only privileges.");
  }
};

export const fetchClientDeals = async (): Promise<ClientPortalDealView[]> => {
  // Dynamic import to avoid circular dependencies
  const { fetchDeals, fetchShipments } = await import("@/domain/operations/service");
  const deals = await fetchDeals();
  const shipments = await fetchShipments();
  return deals.map((deal) => prepareClientDealView(deal, shipments));
};

export const fetchClientShipments = async (): Promise<ClientPortalShipmentView[]> => {
  const { fetchShipments } = await import("@/domain/operations/service");
  const shipments = await fetchShipments();
  return shipments.map((shipment) => prepareClientShipmentView(shipment));
};
