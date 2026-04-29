import type { ShipmentStageCode } from "@/types/lourex";
import { normalizeShipmentStageCode } from "@/lib/shipmentStages";

type ShipmentStageShape = {
  status?: string | null;
  current_stage_code?: ShipmentStageCode | string | null;
};

const randomTrackingSuffix = () => {
  const max = 999999;
  const value =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint32Array(1))[0] % max
      : Math.floor(Math.random() * max);

  return String(value + 1).padStart(6, "0");
};

export const generateTrackingId = (date = new Date()) =>
  `LXR-TR-${date.getFullYear()}-${randomTrackingSuffix()}`;

export const syncShipmentStatusWithStage = <T extends ShipmentStageShape>(shipment: T): T => {
  const stage = normalizeShipmentStageCode(shipment.current_stage_code || shipment.status || "factory");

  return {
    ...shipment,
    current_stage_code: stage,
    status: stage,
  };
};
