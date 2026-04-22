import type { ShipmentStageCode } from "@/types/lourex";

const stageMap: Record<string, ShipmentStageCode> = {
  factory: "product_preparation",
  warehouse: "moving_to_warehouse",
  shipping: "transit_to_destination",
  customs: "destination_customs",
  delivered: "delivered",
  pending: "deal_accepted",
  confirmed: "product_preparation",
  production_started: "product_preparation",
  production_finished: "moving_to_origin_port",
  quality_check: "at_origin_port",
  shipped: "left_origin_country",
};

export const mapShipmentStatusToStage = (status?: string | null): ShipmentStageCode =>
  stageMap[status || ""] || "deal_accepted";
