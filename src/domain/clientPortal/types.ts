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
  dealId?: string | null;
  dealNumber?: string;
  requestNumber?: string;
  destination: string;
  pallets: number;
  weight: number;
  cbm?: number;
  container_20ft?: number;
  container_40ft?: number;
  updatedAt: string;
  customerVisibleNote?: string;
  shipmentEvents: any[];
  timeline: any[];
  stage: ShipmentStageCode;
  customerEmail?: string | null;
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
