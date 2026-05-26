import { useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, Clock3, MailWarning, RefreshCw } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { loadCustomerNotificationInbox, type CustomerNotificationInboxReport, type CustomerNotificationItem } from "@/domain/notifications/customerInbox";

const formatDateTime = (value: string, locale: string) => {
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

const statusTone = (status: CustomerNotificationItem["status"]) => {
  if (["read", "in_app", "queued"].includes(status)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (["unread", "provider_not_configured", "logged"].includes(status)) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-stone-700 bg-stone-900 text-stone-400";
};

const MetricTile = ({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "ready" | "warning" | "neutral" }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4 shadow-inner shadow-black/20">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">{label}</p>
    <p className={`mt-2 text-2xl font-black ${tone === "ready" ? "text-emerald-300" : tone === "warning" ? "text-amber-300" : "text-stone-100"}`}>{value}</p>
  </div>
);

const NotificationRow = ({ item, locale }: { item: CustomerNotificationItem; locale: string }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-stone-100">{item.title}</p>
          <Badge variant="outline" className={statusTone(item.status)}>{item.status}</Badge>
          <Badge variant="outline" className="border-amber-200/10 text-stone-400">{item.channel}</Badge>
          <Badge variant="outline" className="border-amber-200/10 text-stone-400">{item.source}</Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-400">{item.message}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-600">
          <span>{item.eventType}</span>
          {item.requestId ? <span>Request: {item.requestId}</span> : null}
          {item.orderId ? <span>Order: {item.orderId}</span> : null}
          {item.trackingId ? <span>Tracking: {item.trackingId}</span> : null}
        </div>
      </div>
      <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-stone-600">{formatDateTime(item.createdAt, locale)}</p>
    </div>
  </div>
);

export const CustomerNotificationInboxPanel = () => {
  const { locale } = useI18n();
  const lang = locale === "ar" ? "ar" : "en";
  const [report, setReport] = useState<CustomerNotificationInboxReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await loadCustomerNotificationInbox(lang));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const latestItems = useMemo(() => report?.items.slice(0, 30) || [], [report]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-[1.75rem] bg-stone-900" />
        <Skeleton className="h-64 rounded-[1.75rem] bg-stone-900" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BentoCard className="space-y-5 border-amber-200/10 bg-stone-900/55 shadow-2xl shadow-black/25 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/80">Customer inbox</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-stone-100">
              {lang === "ar" ? "مركز إشعارات العميل" : "Customer Notification Inbox"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
              {lang === "ar"
                ? "تجميع آمن للتحديثات الرسمية، تغييرات الطلبات، الشحن، إثباتات التحويل، والمحادثات بدون الحاجة إلى SQL جديد أو مزود إرسال خارجي."
                : "A safe inbox for official updates, order changes, shipment tracking, transfer proof reviews, and conversations without requiring new SQL or external delivery providers."}
            </p>
          </div>
          <Button variant="outline" onClick={() => void refresh()} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
            <RefreshCw className="me-2 h-4 w-4 text-amber-400" />
            {lang === "ar" ? "تحديث" : "Refresh"}
          </Button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        ) : null}

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
          <MetricTile label={lang === "ar" ? "الإجمالي" : "Total"} value={report?.summary.total || 0} />
          <MetricTile label={lang === "ar" ? "داخل التطبيق" : "In-app"} value={report?.summary.inApp || 0} tone="ready" />
          <MetricTile label={lang === "ar" ? "مزود معلق" : "Provider pending"} value={report?.summary.providerPending || 0} tone={(report?.summary.providerPending || 0) ? "warning" : "ready"} />
          <MetricTile label={lang === "ar" ? "مسجلة" : "Logged"} value={report?.summary.logged || 0} />
          <MetricTile label={lang === "ar" ? "آخر 7 أيام" : "Last 7 days"} value={report?.summary.recent || 0} />
        </div>
      </BentoCard>

      <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/55 shadow-2xl shadow-black/25 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/70">Timeline</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-100">
              {lang === "ar" ? "آخر التحديثات الرسمية" : "Latest official updates"}
            </h3>
          </div>
          {(report?.summary.providerPending || 0) > 0 ? <MailWarning className="h-5 w-5 text-amber-300" /> : <BellRing className="h-5 w-5 text-amber-300" />}
        </div>

        {latestItems.length ? (
          <div className="space-y-3">
            {latestItems.map((item) => <NotificationRow key={`${item.source}-${item.id}`} item={item} locale={locale} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200/10 bg-stone-950/35 p-8 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-300" />
            <p className="mt-3 font-semibold text-stone-100">{lang === "ar" ? "لا توجد إشعارات حالياً" : "No notifications yet"}</p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-500">
              {lang === "ar" ? "ستظهر هنا تحديثات الطلبات والشحن والمحادثات عند حدوثها." : "Order, shipment, payment, and conversation updates will appear here when they happen."}
            </p>
          </div>
        )}
      </BentoCard>

      <BentoCard className="border-amber-200/10 bg-stone-900/55 shadow-2xl shadow-black/25 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-1 h-5 w-5 text-amber-300" />
          <div>
            <p className="font-semibold text-stone-100">{lang === "ar" ? "ملاحظة التسليم الخارجي" : "External delivery note"}</p>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              {lang === "ar"
                ? "حالة provider_not_configured تعني أن الإشعار محفوظ داخل بوابتك، لكن البريد/واتساب غير مفعل بعد. هذا ليس خطأ."
                : "provider_not_configured means the update is saved inside your portal, but email/WhatsApp delivery is not enabled yet. This is not an error."}
            </p>
          </div>
        </div>
      </BentoCard>
    </div>
  );
};

export default CustomerNotificationInboxPanel;
