import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, ClipboardList, Mail, MessageCircle, RefreshCw, Send, Settings2 } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadNotificationEngineReport, type NotificationDeliveryQueueRow, type NotificationEngineReport, type NotificationEventRow, type NotificationTemplateRow } from "@/domain/notifications/notificationEngine";

const dateTime = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : "Not recorded");

const statusClass = (value: string) => {
  if (["sent", "ready", "enabled", "logged"].includes(value)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (["queued", "processing", "provider_not_configured", "warning", "migrationless"].includes(value)) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (["failed", "cancelled", "error"].includes(value)) return "border-red-500/30 bg-red-500/10 text-red-300";
  return "border-stone-700 bg-stone-900 text-stone-400";
};

const MetricTile = ({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: "neutral" | "ready" | "warning" }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4 shadow-inner shadow-black/20">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">{label}</p>
    <p className={`mt-2 text-2xl font-black ${tone === "ready" ? "text-emerald-300" : tone === "warning" ? "text-amber-300" : "text-stone-100"}`}>{value}</p>
  </div>
);

const ProviderCard = ({ enabled, icon: Icon, title, description }: { enabled: boolean; icon: typeof Mail; title: string; description: string }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`rounded-2xl border p-2 ${enabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-stone-100">{title}</p>
          <p className="mt-1 text-sm leading-6 text-stone-400">{description}</p>
        </div>
      </div>
      <Badge variant="outline" className={statusClass(enabled ? "enabled" : "warning")}>
        {enabled ? "Enabled" : "Provider pending"}
      </Badge>
    </div>
  </div>
);

const TemplateRow = ({ template }: { template: NotificationTemplateRow }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-words font-mono text-sm font-semibold text-amber-200 [overflow-wrap:anywhere]">{template.template_key}</p>
          <Badge variant="outline" className="border-stone-700 text-stone-400">{template.locale}</Badge>
          <Badge variant="outline" className={statusClass(template.enabled ? "enabled" : "cancelled")}>{template.enabled ? "Enabled" : "Disabled"}</Badge>
        </div>
        <p className="mt-2 text-sm text-stone-300">{template.subject || "In-app message"}</p>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">{template.body}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-amber-200/10 text-stone-400">{template.event_type}</Badge>
        <Badge variant="outline" className="border-amber-200/10 text-stone-400">{template.channel}</Badge>
      </div>
    </div>
  </div>
);

const QueueRow = ({ item }: { item: NotificationDeliveryQueueRow }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-sm font-semibold text-stone-100">{item.event_type}</p>
          <Badge variant="outline" className={statusClass(item.status)}>{item.status}</Badge>
          <Badge variant="outline" className="border-amber-200/10 text-stone-400">{item.channel}</Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Recipient: {item.recipient_contact || item.recipient_id || "Not assigned"} · Attempts: {item.attempt_count}/{item.max_attempts}
        </p>
        {item.last_error ? <p className="mt-2 text-sm leading-6 text-amber-300">{item.last_error}</p> : null}
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-600">{dateTime(item.created_at)}</p>
    </div>
  </div>
);

const EventRow = ({ event }: { event: NotificationEventRow }) => {
  const metadataKeys = Object.keys(event.metadata || {}).slice(0, 4);

  return (
    <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-semibold text-stone-100">{event.event_type}</p>
            <Badge variant="outline" className={statusClass(event.delivery_status || event.status || "logged")}>{event.delivery_status || event.status || "logged"}</Badge>
            <Badge variant="outline" className="border-amber-200/10 text-stone-400">{event.channel_hint || "both"}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            Customer: {event.customer_id || "Not assigned"} · Order: {event.order_id || event.tracking_id || "Not linked"}
          </p>
          {metadataKeys.length ? (
            <p className="mt-2 text-xs leading-5 text-stone-600">
              Metadata: {metadataKeys.join(", ")}
            </p>
          ) : null}
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-600">{dateTime(event.created_at)}</p>
      </div>
    </div>
  );
};

export const NotificationEnginePanel = () => {
  const [report, setReport] = useState<NotificationEngineReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await loadNotificationEngineReport());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notification engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const latestTemplates = useMemo(() => report?.templates.slice(0, 8) || [], [report]);
  const latestQueue = useMemo(() => report?.queue.slice(0, 8) || [], [report]);
  const latestEvents = useMemo(() => report?.events.slice(0, 10) || [], [report]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-[1.75rem] bg-stone-900" />
        <Skeleton className="h-64 rounded-[1.75rem] bg-stone-900" />
      </div>
    );
  }

  if (error) {
    return (
      <BentoCard className="border-red-500/20 bg-red-500/10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 text-red-300" />
          <div>
            <h2 className="font-serif text-2xl font-semibold text-red-100">Notification engine unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-red-200/80">{error}</p>
          </div>
        </div>
      </BentoCard>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-5">
      <BentoCard className="space-y-5 border-amber-200/10 bg-stone-900/55 shadow-2xl shadow-black/25 backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/80">Phase 2 · Notification Engine</p>
              {report.migrationlessMode ? <Badge variant="outline" className={statusClass("migrationless")}>Migrationless mode</Badge> : <Badge variant="outline" className={statusClass("enabled")}>Database queue mode</Badge>}
            </div>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-stone-100">Notification Control Center</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
              Provider-neutral notification readiness, templates, queue visibility, and delivery status tracking. External delivery remains disabled until provider credentials are configured.
            </p>
          </div>
          <Button variant="outline" onClick={() => void refresh()} disabled={loading} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
            <RefreshCw className="me-2 h-4 w-4 text-amber-400" />
            Refresh
          </Button>
        </div>
        {report.migrationlessMode ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
              <div>
                <p className="font-semibold text-amber-100">Running without notification database migrations</p>
                <p className="mt-1 text-sm leading-6 text-amber-100/70">
                  Lourex is using the existing notification_events table, built-in templates, and a virtual delivery queue. This keeps operations visible while Lovable/Supabase SQL access is unavailable.
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
          <MetricTile label="Settings" value={report.summary.settingsCount} />
          <MetricTile label="Templates" value={report.summary.templatesCount} />
          <MetricTile label="Events" value={report.events.length} />
          <MetricTile label="Queued" value={report.summary.queued} />
          <MetricTile label="Provider pending" value={report.summary.providerNotConfigured} tone={report.summary.providerNotConfigured ? "warning" : "ready"} />
          <MetricTile label="Sent" value={report.summary.sent} tone="ready" />
          <MetricTile label="Warnings" value={report.summary.warnings} tone={report.summary.warnings ? "warning" : "ready"} />
        </div>
      </BentoCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProviderCard enabled={report.providerFlags.email} icon={Mail} title="Email provider" description="Email delivery flag is checked from Vercel environment variables. Until enabled, events are logged and queued safely." />
        <ProviderCard enabled={report.providerFlags.messaging} icon={MessageCircle} title="WhatsApp/SMS provider" description="Messaging delivery flag is checked from Vercel environment variables. Provider credentials are intentionally required before live sending." />
      </div>

      <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/55 shadow-2xl shadow-black/25 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/70">Templates</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-100">Customer notification templates</h3>
          </div>
          <Settings2 className="h-5 w-5 text-amber-300" />
        </div>
        {latestTemplates.length ? <div className="space-y-3">{latestTemplates.map((template) => <TemplateRow key={template.id} template={template} />)}</div> : <EmptyPanel icon={BellRing} title="Templates pending" description="Run the notification engine migration to seed production-safe templates." />}
      </BentoCard>

      <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/55 shadow-2xl shadow-black/25 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/70">Events</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-100">Notification event log</h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">Recent source events recorded in notification_events before provider delivery.</p>
          </div>
          <ClipboardList className="h-5 w-5 text-amber-300" />
        </div>
        {latestEvents.length ? <div className="space-y-3">{latestEvents.map((event) => <EventRow key={event.id} event={event} />)}</div> : <EmptyPanel icon={ClipboardList} title="No notification events yet" description="Update a request, shipment, payment proof, or official conversation to create notification events." />}
      </BentoCard>

      <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/55 shadow-2xl shadow-black/25 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/70">Queue</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-100">Delivery queue monitor</h3>
          </div>
          <Send className="h-5 w-5 text-amber-300" />
        </div>
        {latestQueue.length ? <div className="space-y-3">{latestQueue.map((item) => <QueueRow key={item.id} item={item} />)}</div> : <EmptyPanel icon={CheckCircle2} title="Queue is clean" description="No queued or failed notification deliveries are currently recorded." />}
      </BentoCard>
    </div>
  );
};

const EmptyPanel = ({ icon: Icon, title, description }: { icon: typeof BellRing; title: string; description: string }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-stone-950/35 p-6 text-center">
    <Icon className="mx-auto h-6 w-6 text-amber-300" />
    <p className="mt-3 font-semibold text-stone-100">{title}</p>
    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-500">{description}</p>
  </div>
);

export default NotificationEnginePanel;