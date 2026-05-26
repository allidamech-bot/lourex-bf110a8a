import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, CheckCircle2, Clock3, ClipboardList, MessageSquareText, PackageCheck, ReceiptText, Route, Sparkles } from "lucide-react";

import BentoCard from "@/components/BentoCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadCustomerNotificationInbox, type CustomerNotificationItem } from "@/domain/notifications/customerInbox";
import type { OperationsRequest } from "@/domain/operations/types";
import { getCustomerRequestStatusCopy } from "@/lib/customerExperience";

const formatDate = (value: string | undefined, locale: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const statusTone = (status: string) => {
  if (["completed", "read", "queued", "in_app"].includes(status)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (["awaiting_clarification", "transfer_proof_pending", "transfer_proof_rejected", "provider_not_configured", "logged", "unread"].includes(status)) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (["cancelled", "failed"].includes(status)) return "border-red-500/30 bg-red-500/10 text-red-300";
  return "border-stone-700 bg-stone-900 text-stone-400";
};

const getTrackingCode = (request: OperationsRequest) => {
  const row = request as OperationsRequest & { trackingCode?: string; tracking_code?: string };
  return row.trackingCode || row.tracking_code || "";
};

const getNextAction = (request: OperationsRequest | undefined, lang: "ar" | "en") => {
  if (!request) {
    return {
      icon: ClipboardList,
      title: lang === "ar" ? "ابدأ طلب شراء جديد" : "Start a new purchase request",
      description: lang === "ar" ? "أرسل تفاصيل المنتج والصور والمواصفات من نموذج الطلب." : "Submit product details, images, and specifications from the request form.",
      href: "/request",
      cta: lang === "ar" ? "طلب جديد" : "New request",
    };
  }

  if (request.status === "awaiting_clarification") {
    return {
      icon: MessageSquareText,
      title: lang === "ar" ? "مطلوب توضيح منك" : "Clarification needed",
      description: lang === "ar" ? "راجع طلبك وأرسل التوضيح المطلوب حتى تتابع الإدارة المراجعة." : "Review your request and send the requested clarification so management can continue.",
      href: `/customer-portal/requests?request=${request.id}`,
      cta: lang === "ar" ? "إرسال التوضيح" : "Reply now",
    };
  }

  if (request.status === "transfer_proof_pending" || request.status === "transfer_proof_rejected") {
    return {
      icon: ReceiptText,
      title: lang === "ar" ? "راجع إثبات التحويل" : "Review transfer proof",
      description: lang === "ar" ? "ارفع الإيصال أو راجع سبب الرفض من صفحة الطلب." : "Upload the receipt or review the rejection reason from the request page.",
      href: `/customer-portal/requests?request=${request.id}`,
      cta: lang === "ar" ? "فتح الطلب" : "Open request",
    };
  }

  if (request.status === "in_progress") {
    const trackingCode = getTrackingCode(request);
    return {
      icon: Route,
      title: lang === "ar" ? "تابع العملية والشحنة" : "Track the operation",
      description: lang === "ar" ? "طلبك قيد التنفيذ. تابع التحديثات والمراحل من صفحة التتبع." : "Your request is in progress. Follow updates and stages from tracking.",
      href: trackingCode ? `/customer-portal/tracking?tracking=${encodeURIComponent(trackingCode)}` : "/customer-portal/tracking",
      cta: lang === "ar" ? "فتح التتبع" : "Open tracking",
    };
  }

  if (request.status === "completed") {
    return {
      icon: PackageCheck,
      title: lang === "ar" ? "عملية مكتملة" : "Operation completed",
      description: lang === "ar" ? "راجع سجل الطلب والإشعارات النهائية داخل بوابتك." : "Review the request history and final notifications inside your portal.",
      href: `/customer-portal/requests?request=${request.id}`,
      cta: lang === "ar" ? "مراجعة الطلب" : "Review request",
    };
  }

  return {
    icon: Clock3,
    title: lang === "ar" ? "طلبك قيد المتابعة" : "Your request is being handled",
    description: lang === "ar" ? "لا يوجد إجراء مطلوب منك حالياً. ستظهر التحديثات الجديدة في الإشعارات." : "No action is required from you right now. New updates will appear in notifications.",
    href: "/customer-portal/notifications",
    cta: lang === "ar" ? "فتح الإشعارات" : "Open notifications",
  };
};

const RequestMiniRow = ({ request, locale }: { request: OperationsRequest; locale: string }) => {
  const lang = locale === "ar" ? "ar" : "en";
  const statusCopy = getCustomerRequestStatusCopy(request.status, lang);
  const trackingCode = getTrackingCode(request);

  return (
    <Link to={`/customer-portal/requests?request=${request.id}`} className="block rounded-2xl border border-amber-200/10 bg-stone-950/35 p-4 transition-colors hover:border-amber-500/25 hover:bg-stone-900/80">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-stone-100">{request.requestNumber}</p>
          <p className="mt-1 line-clamp-1 text-sm text-stone-500">{request.productName || (lang === "ar" ? "طلب شراء" : "Purchase request")}</p>
          {trackingCode ? <p className="mt-2 text-xs text-stone-600">Tracking: {trackingCode}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Badge variant="outline" className={statusTone(request.status)}>{statusCopy?.label || request.status}</Badge>
          <span className="text-xs text-stone-600">{formatDate(request.createdAt, locale)}</span>
        </div>
      </div>
    </Link>
  );
};

const NotificationMiniRow = ({ item, locale }: { item: CustomerNotificationItem; locale: string }) => (
  <Link to="/customer-portal/notifications" className="block rounded-2xl border border-amber-200/10 bg-stone-950/35 p-4 transition-colors hover:border-amber-500/25 hover:bg-stone-900/80">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-stone-100">{item.title}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-500">{item.message}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Badge variant="outline" className={statusTone(item.status)}>{item.status}</Badge>
        <span className="text-xs text-stone-600">{formatDate(item.createdAt, locale)}</span>
      </div>
    </div>
  </Link>
);

export const CustomerOperationsCommandCenter = ({
  requests,
  totalRequests,
  dealsCount,
  loading,
}: {
  requests: OperationsRequest[];
  totalRequests: number;
  dealsCount: number;
  loading: boolean;
}) => {
  const locale = typeof document !== "undefined" ? document.documentElement.lang || "en" : "en";
  const lang = locale === "ar" ? "ar" : "en";
  const [notifications, setNotifications] = useState<CustomerNotificationItem[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setNotificationLoading(true);
    loadCustomerNotificationInbox(lang)
      .then((report) => {
        if (mounted) setNotifications(report.items.slice(0, 3));
      })
      .catch(() => {
        if (mounted) setNotifications([]);
      })
      .finally(() => {
        if (mounted) setNotificationLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [lang]);

  const actionRequest = useMemo(() => {
    const priority = ["awaiting_clarification", "transfer_proof_rejected", "transfer_proof_pending", "in_progress"];
    return requests.find((request) => priority.includes(request.status)) || requests[0];
  }, [requests]);

  const nextAction = getNextAction(actionRequest, lang);
  const ActionIcon = nextAction.icon;
  const actionRequired = requests.filter((request) => ["awaiting_clarification", "transfer_proof_rejected", "transfer_proof_pending"].includes(request.status)).length;
  const activeTracking = requests.filter((request) => request.status === "in_progress" || Boolean(getTrackingCode(request))).length;

  return (
    <BentoCard className="mb-8 space-y-5 border-amber-200/10 bg-stone-900/55 shadow-2xl shadow-black/25 backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/80">{lang === "ar" ? "مركز العمليات" : "Operations center"}</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-stone-100">
            {lang === "ar" ? "ماذا يحدث الآن؟" : "What is happening now?"}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
            {lang === "ar"
              ? "ملخص مباشر لأهم إجراء مطلوب منك، أحدث الطلبات، وآخر الإشعارات الرسمية."
              : "A live summary of your next required action, recent requests, and latest official notifications."}
          </p>
        </div>
        <Badge variant="outline" className={actionRequired ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}>
          {actionRequired ? (lang === "ar" ? `${actionRequired} إجراء مطلوب` : `${actionRequired} action needed`) : (lang === "ar" ? "لا يوجد إجراء عاجل" : "No urgent action")}
        </Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
        <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">{lang === "ar" ? "الطلبات" : "Requests"}</p>
          <p className="mt-2 text-2xl font-black text-stone-100">{totalRequests}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">{lang === "ar" ? "عمليات نشطة" : "Active operations"}</p>
          <p className="mt-2 text-2xl font-black text-amber-300">{dealsCount || activeTracking}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">{lang === "ar" ? "إشعارات حديثة" : "Recent notices"}</p>
          <p className="mt-2 text-2xl font-black text-stone-100">{notifications.length}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.5rem] border border-amber-500/15 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-2 text-amber-300">
              <ActionIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-serif text-xl font-semibold text-stone-100">{nextAction.title}</p>
              <p className="mt-2 text-sm leading-6 text-stone-400">{nextAction.description}</p>
              <Button asChild className="mt-4 bg-amber-500 text-stone-950 hover:bg-amber-400">
                <Link to={nextAction.href}>{nextAction.cta}</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <p className="font-semibold text-stone-100">{lang === "ar" ? "آخر النشاط" : "Latest activity"}</p>
            </div>
            <Button variant="link" className="h-auto p-0 text-xs text-amber-400" asChild>
              <Link to="/customer-portal/notifications">{lang === "ar" ? "كل الإشعارات" : "All notifications"}</Link>
            </Button>
          </div>

          {loading || notificationLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-2xl bg-stone-950/70" />
              <Skeleton className="h-20 rounded-2xl bg-stone-950/70" />
            </div>
          ) : notifications.length ? (
            <div className="space-y-3">
              {notifications.map((item) => <NotificationMiniRow key={`${item.source}-${item.id}`} item={item} locale={locale} />)}
            </div>
          ) : requests.length ? (
            <div className="space-y-3">
              {requests.slice(0, 3).map((request) => <RequestMiniRow key={request.id} request={request} locale={locale} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200/10 bg-stone-950/35 p-6 text-center">
              <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-300" />
              <p className="mt-3 font-semibold text-stone-100">{lang === "ar" ? "لا يوجد نشاط بعد" : "No activity yet"}</p>
              <p className="mt-2 text-sm leading-6 text-stone-500">{lang === "ar" ? "ابدأ بطلب جديد لتظهر التحديثات هنا." : "Start a new request to see updates here."}</p>
            </div>
          )}
        </div>
      </div>
    </BentoCard>
  );
};

export default CustomerOperationsCommandCenter;
