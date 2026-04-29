import type { ShipmentStageCode } from "@/types/lourex";

const stageMap: Record<string, ShipmentStageCode> = {
  factory: "factory",
  warehouse: "out_for_delivery",
  shipping: "in_transit",
  customs: "customs_clearance",
  delivered: "delivered",
  pending: "factory",
  confirmed: "factory",
  production_started: "factory",
  production_finished: "received_turkey",
  quality_check: "in_turkey_warehouse",
  shipped: "departed_turkey",
};

export const mapShipmentStatusToStage = (status?: string | null): ShipmentStageCode =>
  stageMap[status || ""] || "factory";
