import type { ShipmentStageCode } from "@/types/lourex";

export interface ClientPortalTrackingUpdate {
  stageCode: ShipmentStageCode;
  occurredAt: string;
  customerNote: string;
}

export interface ClientPortalShipmentView {
  id: string;
  trackingId: string;
  currentStage: ShipmentStageCode;
  originCountry: string | null;
  destinationCountry: string | null;
  updatesHistory: ClientPortalTrackingUpdate[];
}

export interface ClientPortalDealView {
  id: string;
  dealNumber: string;
  operationTitle: string;
  status: string;
  operationalStatus: string;
  createdAt: string;
  totalValue: number;
  currency: string;
  shipment?: ClientPortalShipmentView;
}
