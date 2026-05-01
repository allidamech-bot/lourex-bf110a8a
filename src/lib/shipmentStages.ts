import type { ShipmentStageCode, ShipmentStageDefinition } from "@/types/lourex";
import type { Lang } from "@/lib/i18n";

type LocalizedStageDefinition = ShipmentStageDefinition & {
  labelEn: string;
  descriptionEn: string;
  ownerEn?: string;
};

export const shipmentStages: LocalizedStageDefinition[] = [
  {
    code: "factory",
    order: 1,
    label: "في المصنع",
    labelEn: "Factory",
    description: "بدأ تجهيز الطلب عند المصنع أو المورد.",
    descriptionEn: "The order is being prepared at the factory or supplier.",
    owner: "فريق العمليات",
    ownerEn: "Operations team",
  },
  {
    code: "received_turkey",
    order: 2,
    label: "تم الاستلام في تركيا",
    labelEn: "Received in Turkey",
    description: "تم استلام الشحنة من المورد داخل تركيا.",
    descriptionEn: "The shipment was received from the supplier in Turkey.",
    owner: "وكيل تركيا",
    ownerEn: "Turkish partner",
  },
  {
    code: "in_turkey_warehouse",
    order: 3,
    label: "في مستودع تركيا",
    labelEn: "In Turkey warehouse",
    description: "الشحنة موجودة في مستودع تركيا وتنتظر تجهيز التصدير.",
    descriptionEn: "The shipment is in the Turkey warehouse awaiting export preparation.",
    owner: "وكيل تركيا",
    ownerEn: "Turkish partner",
  },
  {
    code: "preparing_export",
    order: 4,
    label: "تجهيز التصدير",
    labelEn: "Preparing export",
    description: "تجري إجراءات وتجهيزات التصدير قبل مغادرة تركيا.",
    descriptionEn: "Export preparation is underway before departure from Turkey.",
    owner: "وكيل تركيا",
    ownerEn: "Turkish partner",
  },
  {
    code: "departed_turkey",
    order: 5,
    label: "غادرت تركيا",
    labelEn: "Departed Turkey",
    description: "غادرت الشحنة تركيا وهي في طريقها الدولي.",
    descriptionEn: "The shipment has departed Turkey and entered international transit.",
    owner: "وكيل تركيا / العمليات",
    ownerEn: "Turkish partner / operations",
  },
  {
    code: "in_transit",
    order: 6,
    label: "قيد الشحن",
    labelEn: "In transit",
    description: "الشحنة في مرحلة النقل الدولي إلى بلد الوجهة.",
    descriptionEn: "The shipment is in international transit to the destination country.",
    owner: "الشحن الدولي",
    ownerEn: "International logistics",
  },
  {
    code: "arrived_destination",
    order: 7,
    label: "وصلت إلى الوجهة",
    labelEn: "Arrived destination",
    description: "وصلت الشحنة إلى بلد الوجهة وتنتظر الإجراءات المحلية.",
    descriptionEn: "The shipment has arrived in the destination country and awaits local processing.",
    owner: "وكيل السعودية",
    ownerEn: "Saudi partner",
  },
  {
    code: "customs_clearance",
    order: 8,
    label: "التخليص الجمركي",
    labelEn: "Customs clearance",
    description: "تجري إجراءات التخليص الجمركي في بلد الوجهة.",
    descriptionEn: "Customs clearance is underway in the destination country.",
    owner: "وكيل السعودية",
    ownerEn: "Saudi partner",
  },
  {
    code: "out_for_delivery",
    order: 9,
    label: "قيد التسليم",
    labelEn: "Out for delivery",
    description: "الشحنة خرجت للتسليم النهائي.",
    descriptionEn: "The shipment is out for final delivery.",
    owner: "وكيل السعودية",
    ownerEn: "Saudi partner",
  },
  {
    code: "delivered",
    order: 10,
    label: "تم التسليم",
    labelEn: "Delivered",
    description: "تم تسليم الشحنة للعميل.",
    descriptionEn: "The shipment has been delivered to the customer.",
    owner: "وكيل السعودية / العميل",
    ownerEn: "Saudi partner / customer",
  },
  {
    code: "closed",
    order: 11,
    label: "مغلقة",
    labelEn: "Closed",
    description: "تم إغلاق عملية الشحنة بعد اكتمال التسليم.",
    descriptionEn: "The shipment operation has been closed after delivery.",
    owner: "فريق العمليات",
    ownerEn: "Operations team",
  },
];

const legacyStageMap: Record<string, ShipmentStageCode> = {
  deal_accepted: "factory",
  product_preparation: "factory",
  moving_to_origin_port: "preparing_export",
  transfer_to_port: "preparing_export",
  at_origin_port: "preparing_export",
  origin_port: "preparing_export",
  origin_customs: "preparing_export",
  left_origin_country: "departed_turkey",
  departed_origin: "departed_turkey",
  transit_to_destination: "in_transit",
  destination_customs: "customs_clearance",
  moving_to_warehouse: "out_for_delivery",
  transfer_to_warehouse: "out_for_delivery",
};

export const normalizeShipmentStageCode = (
  code: ShipmentStageCode | string | undefined | null,
): ShipmentStageCode => {
  if (shipmentStages.some((stage) => stage.code === code)) return code as ShipmentStageCode;
  return legacyStageMap[String(code || "")] || "factory";
};

export const getShipmentStage = (stageCode: ShipmentStageCode | string | undefined | null) =>
  shipmentStages.find((stage) => stage.code === normalizeShipmentStageCode(stageCode)) || shipmentStages[0];

export const getShipmentStageDefinition = getShipmentStage;

export const canMoveShipmentStage = (
  fromStage: ShipmentStageCode | string | undefined | null,
  toStage: ShipmentStageCode | string | undefined | null,
  options: { allowSkip?: boolean } = {},
) => {
  const from = getShipmentStage(fromStage);
  const to = getShipmentStage(toStage);
  if (from.code === "closed") return false;
  if (to.order <= from.order) return false;
  if (from.code === "delivered" && to.code !== "closed") return false;
  return options.allowSkip ? true : to.order === from.order + 1;
};

export const getNextShipmentStage = (currentStage: ShipmentStageCode | string | undefined | null) => {
  const current = getShipmentStage(currentStage);
  return shipmentStages.find((stage) => stage.order === current.order + 1) || null;
};

export const getShipmentProgressPercent = (currentStage: ShipmentStageCode | string | undefined | null) => {
  const current = getShipmentStage(currentStage);
  return Math.round((current.order / shipmentStages.length) * 100);
};

export const getShipmentStageCopy = (
  code: ShipmentStageCode | string | undefined | null,
  lang: Lang,
) => {
  const stage = getShipmentStage(code);

  return {
    ...stage,
    label: lang === "ar" ? stage.label : stage.labelEn,
    description: lang === "ar" ? stage.description : stage.descriptionEn,
    owner: lang === "ar" ? stage.owner : stage.ownerEn,
  };
};

export const shipmentStageLabelMap = shipmentStages.reduce<Record<ShipmentStageCode, string>>(
  (acc, stage) => {
    acc[stage.code] = stage.label;
    return acc;
  },
  {} as Record<ShipmentStageCode, string>,
);
