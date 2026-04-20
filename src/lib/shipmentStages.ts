import type { ShipmentStageCode, ShipmentStageDefinition } from "@/types/lourex";

export const shipmentStages: ShipmentStageDefinition[] = [
  {
    code: "deal_accepted",
    order: 1,
    label: "تم قبول الصفقة",
    description: "تمت الموافقة على الطلب وتحويله إلى عملية تشغيلية.",
  },
  {
    code: "product_preparation",
    order: 2,
    label: "المنتج قيد التجهيز",
    description: "يعمل وكيل تركيا وفريق العمليات على تجهيز الطلب مع المورد.",
  },
  {
    code: "transfer_to_port",
    order: 3,
    label: "جاري النقل للمنفذ",
    description: "بدأ نقل الشحنة من موقع التنفيذ إلى المنفذ المناسب.",
  },
  {
    code: "origin_port",
    order: 4,
    label: "في مطار/ميناء المنشأ",
    description: "الشحنة وصلت إلى منفذ بلد المنشأ وتنتظر الخطوة التالية.",
  },
  {
    code: "origin_customs",
    order: 5,
    label: "جاري التخليص (المنشأ)",
    description: "إجراءات التخليص في بلد المنشأ قيد المعالجة.",
  },
  {
    code: "departed_origin",
    order: 6,
    label: "غادر بلد المنشأ",
    description: "الشحنة غادرت بلد المنشأ بنجاح.",
  },
  {
    code: "in_transit",
    order: 7,
    label: "في الطريق للوجهة",
    description: "الشحنة في مرحلة النقل الدولية إلى بلد العميل.",
  },
  {
    code: "arrived_destination",
    order: 8,
    label: "وصل إلى بلد العميل",
    description: "الشحنة وصلت إلى الوجهة وتنتظر التخليص المحلي.",
  },
  {
    code: "destination_customs",
    order: 9,
    label: "جاري التخليص (الوجهة)",
    description: "التخليص الجمركي في بلد العميل قيد التنفيذ.",
  },
  {
    code: "transfer_to_warehouse",
    order: 10,
    label: "جاري النقل للمستودع",
    description: "الشحنة في طريقها إلى المستودع أو نقطة التسليم النهائية.",
  },
  {
    code: "delivered",
    order: 11,
    label: "تم التسليم",
    description: "تم تسليم الشحنة وإغلاق العملية التشغيلية.",
  },
];

export const shipmentStageLabelMap = shipmentStages.reduce<Record<ShipmentStageCode, string>>(
  (acc, stage) => {
    acc[stage.code] = stage.label;
    return acc;
  },
  {} as Record<ShipmentStageCode, string>,
);
