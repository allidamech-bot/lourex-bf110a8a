import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  BellRing,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileImage,
  Hash,
  MessageSquareText,
  Package,
  ReceiptText,
  Route,
  ShieldCheck,
  Truck,
} from "lucide-react";

import BentoCard from "@/components/BentoCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CustomerPaymentSummary } from "@/domain/accounting/payments";
import type { OperationsRequest } from "@/domain/operations/types";
import { getCustomerRequestStatusCopy } from "@/lib/customerExperience";
import type { PurchaseRequestStatus } from "@/types/lourex";
import type { PurchaseRequestStatus } from "@/types/lourex";
import { FinancialVisibilityLayer } from "@/features/customer-intelligence/components/FinancialVisibilityLayer";
import { ShipmentETAIntelligence } from "@/features/customer-intelligence/components/ShipmentETAIntelligence";
import { CustomerTrustTimeline } from "@/features/customer-intelligence/components/CustomerTrustTimeline";

const statusOrder: PurchaseRequestStatus[] = [
  "intake_submitted",
  "under_review",
  "awaiting_clarification",
  "ready_for_conversion",
  "transfer_proof_pending",
  "in_progress",
  "completed",
];

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

const formatMoney = (amount: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    style: "currency",
    currency: currency || "SAR",
    maximumFractionDigits: 2,
  }).format(amount || 0);

const getTrackingCode = (request: OperationsRequest) => {
  const row = request as OperationsRequest & { tracking_code?: string };
  return request.trackingCode || row.tracking_code || "";
};

const toneForStatus = (status: string) => {
  if (["completed", "in_progress", "fully_paid", "accepted"].includes(status)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (["awaiting_clarification", "transfer_proof_pending", "ready_for_conversion", "transfer_proof_rejected", "partially_paid"].includes(status)) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (["cancelled", "rejected"].includes(status)) return "border-red-500/30 bg-red-500/10 text-red-300";
  return "border-stone-700 bg-stone-900 text-stone-400";
};

const getNextAction = (request: OperationsRequest, lang: "ar" | "en") => {
  if (request.status === "awaiting_clarification") {
    return {
      icon: MessageSquareText,
      title: lang === "ar" ? "مطلوب رد توضيحي" : "Clarification reply required",
      body: lang === "ar"
        ? "الطلب متوقف حتى ترسل التوضيح المطلوب. افتح صندوق الرد في صفحة الطلب وأرسل المعلومات الناقصة."
        : "The request is waiting for your clarification. Use the reply box on the request page and send the missing information.",
      cta: lang === "ar" ? "الرد داخل الطلب" : "Reply in request",
      href: `/customer-portal/requests?request=${request.id}`,
      urgent: true,
    };
  }

  if (request.status === "ready_for_conversion" || request.status === "transfer_proof_rejected") {
    return {
      icon: ReceiptText,
      title: lang === "ar" ? "إثبات التحويل مطلوب" : "Transfer proof required",
      body: lang === "ar"
        ? "الطلب جاهز للمرحلة التالية. ارفع إيصال التحويل من صفحة الطلب حتى تراجعه الإدارة."
        : "The request is ready for the next stage. Upload the transfer receipt from the request page so management can review it.",
      cta: lang === "ar" ? "رفع الإيصال" : "Upload receipt",
      href: `/customer-portal/requests?request=${request.id}`,
      urgent: true,
    };
  }

  if (request.status === "transfer_proof_pending") {
    return {
      icon: CreditCard,
      title: lang === "ar" ? "الإيصال قيد المراجعة" : "Receipt under review",
      body: lang === "ar"
        ? "تم تسجيل إثبات التحويل. لا يوجد إجراء مطلوب منك حالياً حتى تنتهي الإدارة من المراجعة."
        : "Your transfer proof is recorded. No action is required until management finishes the review.",
      cta: lang === "ar" ? "فتح الإشعارات" : "Open notifications",
      href: "/customer-portal/notifications",
      urgent: false,
    };
  }

  if (request.status === "in_progress") {
    const tracking = getTrackingCode(request);
    return {
      icon: Route,
      title: lang === "ar" ? "تابع التتبع التشغيلي" : "Track the operation",
      body: lang === "ar"
        ? "تم تحويل الطلب إلى عملية. تابع التحديثات والمراحل من صفحة التتبع."
        : "The request is now an operation. Follow stages and updates from tracking.",
      cta: lang === "ar" ? "فتح التتبع" : "Open tracking",
      href: tracking ? `/customer-portal/tracking?tracking=${encodeURIComponent(tracking)}` : "/customer-portal/tracking",
      urgent: false,
    };
  }

  return {
    icon: BellRing,
    title: lang === "ar" ? "لا يوجد إجراء عاجل" : "No urgent action",
    body: lang === "ar"
      ? "تابع الإشعارات الرسمية، وسنظهر لك أي تحديث أو إجراء مطلوب مباشرة."
      : "Watch official notifications; any update or required action will appear immediately.",
    cta: lang === "ar" ? "فتح الإشعارات" : "Open notifications",
    href: "/customer-portal/notifications",
    urgent: false,
  };
};

const InfoTile = ({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
    <div className="flex items-center gap-2 text-xs text-stone-500">
      <Icon className="h-4 w-4 text-amber-300" />
      <span>{label}</span>
    </div>
    <p className="mt-2 break-words text-sm font-semibold text-stone-100">{value || "-"}</p>
  </div>
);

export const CustomerRequestDetailProView = ({
  request,
  shipment,
  paymentSummary,
  locale,
}: {
  request: OperationsRequest;
  shipment?: any; // Using any for quick integration with OperationsShipment
  paymentSummary?: CustomerPaymentSummary;
  locale: string;
}) => {
  const lang = locale === "ar" ? "ar" : "en";
  const statusCopy = getCustomerRequestStatusCopy(request.status, lang);
  const nextAction = getNextAction(request, lang);
  const NextIcon = nextAction.icon;
  const trackingCode = getTrackingCode(request);
  const attachmentsCount = request.attachments?.length || request.imageUrls?.length || 0;
  const currentIndex = Math.max(statusOrder.indexOf(request.status), 0);

  const statusSteps = [
    { key: "intake_submitted", label: lang === "ar" ? "استلام الطلب" : "Intake" },
    { key: "under_review", label: lang === "ar" ? "المراجعة" : "Review" },
    { key: "ready_for_conversion", label: lang === "ar" ? "قرار الإدارة" : "Decision" },
    { key: "transfer_proof_pending", label: lang === "ar" ? "إثبات التحويل" : "Payment proof" },
    { key: "in_progress", label: lang === "ar" ? "التنفيذ" : "Execution" },
    { key: "completed", label: lang === "ar" ? "الإغلاق" : "Closure" },
  ] as const;

  return (
    <BentoCard className="space-y-5 border-amber-200/10 bg-stone-900/55 shadow-2xl shadow-black/25 backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-200">
              {lang === "ar" ? "عرض احترافي" : "Pro view"}
            </Badge>
            <Badge variant="outline" className={toneForStatus(request.status)}>{statusCopy?.label || request.status}</Badge>
          </div>
          <h2 className="mt-3 break-words font-serif text-3xl font-semibold text-stone-100">
            {request.productName || (lang === "ar" ? "طلب شراء" : "Purchase request")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            {request.requestNumber} · {formatDateTime(request.createdAt, locale)}
          </p>

          {shipment && (
            <div className="mt-6">
              <ShipmentETAIntelligence currentStage={shipment.stage} />
            </div>
          )}
        </div>
        <Button asChild className="bg-amber-500 text-stone-950 hover:bg-amber-400">
          <Link to={nextAction.href}>{nextAction.cta}</Link>
        </Button>
      </div>

      <div className={`rounded-[1.5rem] border p-5 ${nextAction.urgent ? "border-amber-500/25 bg-amber-500/10" : "border-emerald-500/20 bg-emerald-500/10"}`}>
        <div className="flex items-start gap-3">
          <span className={`rounded-2xl border p-2 ${nextAction.urgent ? "border-amber-500/30 text-amber-300" : "border-emerald-500/30 text-emerald-300"}`}>
            <NextIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-serif text-xl font-semibold text-stone-100">{nextAction.title}</p>
            <p className="mt-2 text-sm leading-7 text-stone-400">{nextAction.body}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
        <InfoTile icon={ClipboardList} label={lang === "ar" ? "حالة الطلب" : "Request status"} value={statusCopy?.label || request.status} />
        <InfoTile icon={Truck} label={lang === "ar" ? "طريقة الشحن" : "Shipping method"} value={request.preferredShippingMethod || "-"} />
        <InfoTile icon={Archive} label={lang === "ar" ? "الوجهة" : "Destination"} value={request.destination || "-"} />
        <InfoTile icon={Hash} label={lang === "ar" ? "الكمية" : "Quantity"} value={String(request.quantity || "-")} />
        <InfoTile icon={Route} label={lang === "ar" ? "كود التتبع" : "Tracking code"} value={trackingCode || "-"} />
        <InfoTile icon={FileImage} label={lang === "ar" ? "المرفقات" : "Attachments"} value={String(attachmentsCount)} />
      </div>

      <div className="rounded-[1.5rem] border border-amber-200/10 bg-stone-950/35 p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-300" />
          <p className="font-serif text-xl font-semibold text-stone-100">{lang === "ar" ? "مسار الطلب" : "Request journey"}</p>
        </div>
        <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,8.5rem),1fr))]">
          {statusSteps.map((step, index) => {
            const stepIndex = statusOrder.indexOf(step.key);
            const done = request.status === "completed" || stepIndex <= currentIndex;
            const active = request.status === step.key;
            return (
              <div key={step.key} className={`rounded-2xl border p-3 ${active ? "border-amber-500/30 bg-amber-500/10" : done ? "border-emerald-500/20 bg-emerald-500/10" : "border-stone-800 bg-stone-950/50"}`}>
                <div className="flex items-center gap-2">
                  {done ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4 text-stone-600" />}
                  <p className="text-sm font-semibold text-stone-100">{step.label}</p>
                </div>
                <p className="mt-2 text-xs text-stone-600">{lang === "ar" ? `خطوة ${index + 1}` : `Step ${index + 1}`}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-amber-200/10 bg-stone-950/35 p-5">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="h-5 w-5 text-amber-300" />
            <p className="font-serif text-xl font-semibold text-stone-100">{lang === "ar" ? "تفاصيل الدفع" : "Payment Details"}</p>
          </div>
          {paymentSummary ? (
            <FinancialVisibilityLayer
              paidAmount={paymentSummary.paidAmount}
              remainingAmount={paymentSummary.remainingAmount}
              totalAmount={paymentSummary.expectedAmount}
              currency={paymentSummary.currency}
              paymentProofStatus={request.transferProofStatus}
              completionState={paymentSummary.remainingAmount <= 0 ? (lang === "ar" ? "مكتمل" : "Settled") : (lang === "ar" ? "معلق" : "Outstanding")}
            />
          ) : (
            <p className="mt-4 text-sm leading-7 text-stone-500">
              {lang === "ar" ? "لم يتم إنشاء ملخص دفع لهذه العملية بعد." : "No payment summary has been created for this operation yet."}
            </p>
          )}
          {request.transferRejectionReason ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              <p className="font-semibold">{lang === "ar" ? "سبب رفض الإيصال" : "Receipt rejection reason"}</p>
              <p className="mt-2 leading-6">{request.transferRejectionReason}</p>
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.5rem] border border-amber-200/10 bg-stone-950/35 p-5">
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-5 w-5 text-amber-300" />
            <p className="font-serif text-xl font-semibold text-stone-100">{lang === "ar" ? "التواصل الرسمي" : "Official communication"}</p>
          </div>
          <p className="mt-4 text-sm leading-7 text-stone-500">
            {lang === "ar"
              ? "المحادثة الرسمية والمتابعات تظهر داخل صفحة الطلب، وكل تحديث مهم يظهر أيضاً في مركز الإشعارات."
              : "Official conversation and follow-ups remain inside the request page; important updates also appear in the notification inbox."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
              <Link to={`/customer-portal/requests?request=${request.id}`}>{lang === "ar" ? "فتح صفحة الطلب" : "Open request page"}</Link>
            </Button>
            <Button asChild variant="outline" className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
              <Link to="/customer-portal/notifications">{lang === "ar" ? "الإشعارات" : "Notifications"}</Link>
            </Button>
          </div>
        </div>

        {shipment && shipment.timeline && (
          <div className="rounded-[1.5rem] border border-amber-200/10 bg-stone-950/35 p-5 xl:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <BellRing className="h-5 w-5 text-amber-300" />
              <p className="font-serif text-xl font-semibold text-stone-100">{lang === "ar" ? "سجل تتبع الشحنة" : "Shipment Event Timeline"}</p>
            </div>
            <CustomerTrustTimeline updates={shipment.timeline} />
          </div>
        )}
      </div>

      {(request.technicalSpecs || request.deliveryNotes || request.referenceLink) ? (
        <div className="rounded-[1.5rem] border border-amber-200/10 bg-stone-950/35 p-5">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-amber-300" />
            <p className="font-serif text-xl font-semibold text-stone-100">{lang === "ar" ? "تفاصيل المنتج" : "Product details"}</p>
          </div>
          {request.technicalSpecs ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-400">{request.technicalSpecs}</p> : null}
          {request.deliveryNotes ? <p className="mt-4 text-sm leading-7 text-stone-500">{request.deliveryNotes}</p> : null}
          {request.referenceLink ? (
            <a href={request.referenceLink} target="_blank" rel="noreferrer" className="mt-4 block break-words text-sm text-amber-300 underline-offset-4 hover:underline">
              {request.referenceLink}
            </a>
          ) : null}
        </div>
      ) : null}
    </BentoCard>
  );
};

export default CustomerRequestDetailProView;
