import type { ShipmentStageCode, ShipmentStageDefinition } from "@/types/lourex";
import type { Lang } from "@/lib/i18n";

type LocalizedStageDefinition = ShipmentStageDefinition & {
  labelEn: string;
  descriptionEn: string;
  ownerEn?: string;
};

export const shipmentStages: LocalizedStageDefinition[] = [
  {
    code: "deal_accepted",
    order: 1,
    label: "تم قبول الصفقة",
    labelEn: "Deal accepted",
    description: "تمت الموافقة على الطلب وتحويله إلى عملية تشغيلية.",
    descriptionEn: "The request was approved and converted into an active operation.",
    owner: "الإدارة / فريق العمليات",
    ownerEn: "Management / operations team",
  },
  {
    code: "product_preparation",
    order: 2,
    label: "المنتج قيد التجهيز",
    labelEn: "Product under preparation",
    description: "يعمل وكيل تركيا وفريق العمليات على تجهيز الطلب مع المورد.",
    descriptionEn: "The Turkish partner and operations team are preparing the order with the supplier.",
    owner: "وكيل تركيا",
    ownerEn: "Turkish partner",
  },
  {
    code: "moving_to_origin_port",
    order: 3,
    label: "جاري النقل للمنفذ",
    labelEn: "Moving to port / airport",
    description: "بدأ نقل الشحنة من موقع التنفيذ إلى المنفذ المناسب.",
    descriptionEn: "The shipment has started moving from the execution site to the appropriate port.",
    owner: "وكيل تركيا",
    ownerEn: "Turkish partner",
  },
  {
    code: "at_origin_port",
    order: 4,
    label: "في مطار/ميناء المنشأ",
    labelEn: "At origin port / airport",
    description: "الشحنة وصلت إلى منفذ بلد المنشأ وتنتظر الخطوة التالية.",
    descriptionEn: "The shipment reached the origin port and is waiting for the next step.",
    owner: "وكيل تركيا",
    ownerEn: "Turkish partner",
  },
  {
    code: "origin_customs",
    order: 5,
    label: "جاري التخليص (المنشأ)",
    labelEn: "Origin customs clearance",
    description: "إجراءات التخليص في بلد المنشأ قيد المعالجة.",
    descriptionEn: "Origin-country customs clearance is currently being processed.",
    owner: "وكيل تركيا / العمليات",
    ownerEn: "Turkish partner / operations",
  },
  {
    code: "left_origin_country",
    order: 6,
    label: "غادر بلد المنشأ",
    labelEn: "Left origin country",
    description: "الشحنة غادرت بلد المنشأ بنجاح.",
    descriptionEn: "The shipment has successfully departed the origin country.",
    owner: "وكيل تركيا",
    ownerEn: "Turkish partner",
  },
  {
    code: "transit_to_destination",
    order: 7,
    label: "في الطريق للوجهة",
    labelEn: "In transit to destination",
    description: "الشحنة في مرحلة النقل الدولية إلى بلد العميل.",
    descriptionEn: "The shipment is in international transit to the customer's country.",
    owner: "الشحن الدولي",
    ownerEn: "International logistics",
  },
  {
    code: "arrived_destination",
    order: 8,
    label: "وصل إلى بلد العميل",
    labelEn: "Arrived in customer country",
    description: "الشحنة وصلت إلى الوجهة وتنتظر التخليص المحلي.",
    descriptionEn: "The shipment reached the destination country and is awaiting local clearance.",
    owner: "وكيل السعودية",
    ownerEn: "Saudi partner",
  },
  {
    code: "destination_customs",
    order: 9,
    label: "جاري التخليص (الوجهة)",
    labelEn: "Destination customs clearance",
    description: "التخليص الجمركي في بلد العميل قيد التنفيذ.",
    descriptionEn: "Destination-country customs clearance is currently in progress.",
    owner: "وكيل السعودية",
    ownerEn: "Saudi partner",
  },
  {
    code: "moving_to_warehouse",
    order: 10,
    label: "جاري النقل للمستودع",
    labelEn: "Moving to warehouse",
    description: "الشحنة في طريقها إلى المستودع أو نقطة التسليم النهائية.",
    descriptionEn: "The shipment is moving to the warehouse or final delivery point.",
    owner: "وكيل السعودية",
    ownerEn: "Saudi partner",
  },
  {
    code: "delivered",
    order: 11,
    label: "تم التسليم",
    labelEn: "Delivered",
    description: "تم تسليم الشحنة وإغلاق العملية التشغيلية.",
    descriptionEn: "The shipment was delivered and the operation was completed.",
    owner: "وكيل السعودية / العميل",
    ownerEn: "Saudi partner / customer",
  },
];

export const getShipmentStageDefinition = (code: ShipmentStageCode | undefined | null) =>
  shipmentStages.find((stage) => stage.code === code) || null;

export const getShipmentStageCopy = (code: ShipmentStageCode | undefined | null, lang: Lang) => {
  const stage = getShipmentStageDefinition(code);
  if (!stage) return null;

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
