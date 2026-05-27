import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPinned,
  PackageCheck,
  PackageSearch,
  Route,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";

import BentoCard from "@/components/BentoCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getShipmentProgressPercent, getShipmentStageCopy, shipmentStages } from "@/lib/shipmentStages";
import type { Lang } from "@/lib/i18n";
import type { ShipmentEventRecord, ShipmentStageCode, TrackingUpdateRecord } from "@/types/lourex";
import { ShipmentETAIntelligence } from "@/features/customer-intelligence/components/ShipmentETAIntelligence";
import { CustomerTrustTimeline } from "@/features/customer-intelligence/components/CustomerTrustTimeline";

type CustomerTrackingShipment = {
  id: string;
  trackingId: string;
  dealId?: string | null;
  dealNumber?: string;
  requestNumber?: string;
  destination: string;
  pallets: number;
  weight: number;
  stage: ShipmentStageCode;
  updatedAt: string;
  customerVisibleNote?: string;
  shipmentEvents: ShipmentEventRecord[];
  timeline?: TrackingUpdateRecord[];
};

const formatDateTime = (value: string | undefined | null, locale: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(value || 0);

const getEventStageLabel = (stage: string | null | undefined, lang: Lang) => {
  if (!stage) return "";
  return getShipmentStageCopy(stage, lang)?.label || stage;
};

const eventLabel = (eventType: string, lang: "ar" | "en") => {
  const labels: Record<string, { ar: string; en: string }> = {
    stage_changed: { ar: "تغيرت المرحلة", en: "Stage changed" },
    note_added: { ar: "تمت إضافة ملاحظة", en: "Note added" },
    system_created: { ar: "بدأ التتبع", en: "Timeline started" },
    shipment_status_changed: { ar: "تم تحديث حالة الشحنة", en: "Shipment status changed" },
  };

  return labels[eventType]?.[lang] || eventType.replace(/_/g, " ");
};

const InfoTile = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4 shadow-inner shadow-black/20">
    <div className="flex items-center gap-2 text-xs text-stone-500">
      <Icon className="h-4 w-4 text-amber-300" />
      <span>{label}</span>
    </div>
    <p className="mt-2 break-words text-sm font-semibold text-stone-100">{value || "-"}</p>
  </div>
);

const getTrackingAction = (shipment: CustomerTrackingShipment, lang: "ar" | "en") => {
  if (shipment.stage === "delivered" || shipment.stage === "closed") {
    return {
      icon: PackageCheck,
      title: lang === "ar" ? "الشحنة وصلت" : "Shipment completed",
      body: lang === "ar"
        ? "تم الوصول إلى مرحلة التسليم أو الإغلاق. راجع الإشعارات أو تفاصيل الطلب إذا احتجت أي مستندات نهائية."
        : "The shipment has reached delivery or closure. Review notifications or request details if final documents are needed.",
      href: "/customer-portal/notifications",
      cta: lang === "ar" ? "مراجعة الإشعارات" : "Review notifications",
      tone: "ready" as const,
    };
  }

  if (["customs_clearance", "out_for_delivery", "arrived_destination"].includes(shipment.stage)) {
    return {
      icon: MapPinned,
      title: lang === "ar" ? "الشحنة في المرحلة النهائية" : "Shipment is near final delivery",
      body: lang === "ar"
        ? "تابع آخر الملاحظات الرسمية. أي إجراء مطلوب منك سيظهر في مركز العمليات أو الإشعارات."
        : "Watch the latest official notes. Any required action will appear in the operations center or notifications.",
      href: "/customer-portal/operations",
      cta: lang === "ar" ? "مركز العمليات" : "Operations center",
      tone: "warning" as const,
    };
  }

  return {
    icon: Truck,
    title: lang === "ar" ? "الشحنة قيد التنفيذ" : "Shipment in progress",
    body: lang === "ar"
      ? "لا يوجد إجراء مطلوب حالياً. يتم تحديث المراحل من لوحة الإدارة عند حدوث أي تغيير رسمي."
      : "No action is required right now. Stages are updated by management when an official change occurs.",
    href: "/customer-portal/notifications",
    cta: lang === "ar" ? "فتح الإشعارات" : "Open notifications",
    tone: "neutral" as const,
  };
};

export const CustomerTrackingProView = ({ shipment, locale }: { shipment: CustomerTrackingShipment; locale: string }) => {
  const lang = locale === "ar" ? "ar" : "en";
  const currentStage = getShipmentStageCopy(shipment.stage, lang as Lang);
  const currentIndex = shipmentStages.findIndex((stage) => stage.code === shipment.stage);
  const progress = getShipmentProgressPercent(shipment.stage);
  const remainingStages = Math.max(0, shipmentStages.length - 1 - Math.max(currentIndex, 0));
  const latestEvent = shipment.shipmentEvents?.[shipment.shipmentEvents.length - 1] || null;
  const timelineCount = (shipment.shipmentEvents?.length || 0) + (shipment.timeline?.length || 0);
  const action = getTrackingAction(shipment, lang);
  const ActionIcon = action.icon;

  return (
    <BentoCard className="space-y-5 border-amber-200/10 bg-stone-900/55 shadow-2xl shadow-black/25 backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-200">
              {lang === "ar" ? "تتبع احترافي" : "Tracking pro"}
            </Badge>
            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-200">
              {currentStage?.label || shipment.stage}
            </Badge>
          </div>
          <h2 className="mt-3 break-words font-serif text-4xl font-bold text-stone-100 md:text-5xl">
            {shipment.trackingId}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
            {currentStage?.description || (lang === "ar" ? "مرحلة الشحنة الحالية ضمن مسار لوركس التشغيلي." : "Current shipment stage inside the Lourex operations journey.")}
          </p>

          <div className="mt-6">
            <ShipmentETAIntelligence currentStage={shipment.stage} />
          </div>
        </div>
        <Button asChild className="bg-amber-500 text-stone-950 hover:bg-amber-400">
          <Link to={action.href}>{action.cta}</Link>
        </Button>
      </div>

      <div className={`rounded-[1.5rem] border p-5 ${action.tone === "ready" ? "border-emerald-500/20 bg-emerald-500/10" : action.tone === "warning" ? "border-amber-500/25 bg-amber-500/10" : "border-blue-500/20 bg-blue-500/10"}`}>
        <div className="flex items-start gap-3">
          <span className="rounded-2xl border border-white/10 bg-stone-950/35 p-2 text-amber-300">
            <ActionIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-serif text-xl font-semibold text-stone-100">{action.title}</p>
            <p className="mt-2 text-sm leading-7 text-stone-400">{action.body}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
        <InfoTile icon={Route} label={lang === "ar" ? "نسبة التقدم" : "Progress"} value={`${formatNumber(progress, locale)}%`} />
        <InfoTile icon={Clock3} label={lang === "ar" ? "المراحل المتبقية" : "Remaining stages"} value={formatNumber(remainingStages, locale)} />
        <InfoTile icon={MapPinned} label={lang === "ar" ? "الوجهة" : "Destination"} value={shipment.destination || "-"} />
        <InfoTile icon={PackageSearch} label={lang === "ar" ? "التحديثات" : "Updates"} value={formatNumber(timelineCount, locale)} />
        <InfoTile icon={Truck} label={lang === "ar" ? "الوزن" : "Weight"} value={`${formatNumber(shipment.weight, locale)} kg`} />
        <InfoTile icon={ClipboardList} label={lang === "ar" ? "العملية" : "Operation"} value={shipment.dealNumber || shipment.requestNumber || "-"} />
      </div>

      <div className="rounded-[1.5rem] border border-amber-200/10 bg-stone-950/35 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-300" />
            <p className="font-serif text-xl font-semibold text-stone-100">{lang === "ar" ? "مسار الشحنة الرسمي" : "Official shipment journey"}</p>
          </div>
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-200">
            {formatNumber(Math.max(currentIndex + 1, 1), locale)} / {formatNumber(shipmentStages.length, locale)}
          </Badge>
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr))]">
          {shipmentStages.map((stage, index) => {
            const stageCopy = getShipmentStageCopy(stage.code, lang as Lang);
            const isDone = currentIndex > index;
            const isCurrent = currentIndex === index;

            return (
              <div key={stage.code} className={`rounded-2xl border p-3 ${isCurrent ? "border-blue-400/50 bg-blue-500/15" : isDone ? "border-emerald-500/20 bg-emerald-500/10" : "border-stone-800 bg-stone-950/50"}`}>
                <div className="flex items-center gap-2">
                  {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : isCurrent ? <Truck className="h-4 w-4 text-blue-300" /> : <Clock3 className="h-4 w-4 text-stone-600" />}
                  <p className="text-sm font-semibold text-stone-100">{stageCopy?.label || stage.label}</p>
                </div>
                <p className="mt-2 text-xs text-stone-600">{lang === "ar" ? `مرحلة ${index + 1}` : `Stage ${index + 1}`}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-amber-200/10 bg-stone-950/35 p-5">
          <div className="flex items-center gap-3 mb-6">
            <BellRing className="h-5 w-5 text-amber-300" />
            <p className="font-serif text-xl font-semibold text-stone-100">{lang === "ar" ? "سجل الأحداث الرسمي" : "Official Event Timeline"}</p>
          </div>

          <CustomerTrustTimeline updates={shipment.timeline || []} />
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-amber-200/10 bg-stone-950/35 p-5 h-full">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
              <p className="font-serif text-xl font-semibold text-stone-100">{lang === "ar" ? "ملاحظة المرحلة" : "Stage note"}</p>
            </div>
            <p className="mt-4 text-sm leading-7 text-stone-400">
              {shipment.customerVisibleNote || (lang === "ar" ? "لا توجد ملاحظة خاصة بالعميل لهذه المرحلة حالياً." : "No customer-visible note is available for this stage yet.")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                <Link to="/customer-portal/notifications">{lang === "ar" ? "الإشعارات" : "Notifications"}</Link>
              </Button>
              <Button asChild variant="outline" className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                <Link to="/customer-portal/operations">{lang === "ar" ? "مركز العمليات" : "Operations"}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </BentoCard>
  );
};

export default CustomerTrackingProView;
