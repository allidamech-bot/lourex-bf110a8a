import type { ShipmentStageCode } from "@/types/lourex";

const stageMap: Record<string, ShipmentStageCode> = {
  factory: "product_preparation",
  warehouse: "transfer_to_warehouse",
  shipping: "in_transit",
  customs: "destination_customs",
  delivered: "delivered",
  pending: "deal_accepted",
  confirmed: "product_preparation",
  production_started: "product_preparation",
  production_finished: "transfer_to_port",
  quality_check: "origin_port",
  shipped: "departed_origin",
};

export const mapShipmentStatusToStage = (status?: string | null): ShipmentStageCode =>
  stageMap[status || ""] || "deal_accepted";
