import { isOptionalBackendUnavailable, logOptionalBackendUnavailableOnce, supabase } from "@/integrations/supabase/client";
import type { LooseDomainClient } from "@/lib/operationsDomain";

export type CustomerNotificationSource = "notifications" | "notification_events" | "audit_projection";

export type CustomerNotificationItem = {
  id: string;
  title: string;
  message: string;
  eventType: string;
  status: "in_app" | "provider_not_configured" | "logged" | "queued" | "read" | "unread";
  channel: "in_app" | "email" | "whatsapp_sms" | "both" | "system";
  source: CustomerNotificationSource;
  createdAt: string;
  link?: string;
  requestId?: string | null;
  orderId?: string | null;
  trackingId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CustomerNotificationInboxReport = {
  available: boolean;
  items: CustomerNotificationItem[];
  summary: {
    total: number;
    inApp: number;
    providerPending: number;
    logged: number;
    recent: number;
  };
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read?: boolean | null;
  created_at: string;
};

type NotificationEventRow = {
  id: string;
  event_type: string;
  customer_id?: string | null;
  order_id?: string | null;
  tracking_id?: string | null;
  channel_hint?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: string | null;
  delivery_status?: string | null;
  created_at: string;
};

type PurchaseRequestLite = {
  id: string;
  request_number?: string | null;
  customer_id?: string | null;
  email?: string | null;
  converted_deal_id?: string | null;
  tracking_code?: string | null;
  status?: string | null;
};

type AuditLogRow = {
  id: string;
  action: string;
  record_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  created_at: string;
};

const db = supabase as unknown as LooseDomainClient;

const safeList = async <T extends Record<string, unknown>>(
  table: string,
  runner: () => PromiseLike<{ data: T[] | null; error: unknown | null }>,
) => {
  try {
    const { data, error } = await runner();
    if (error) throw error;
    return data || [];
  } catch (error) {
    logOptionalBackendUnavailableOnce(table, error);
    return [] as T[];
  }
};

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

const eventTitle = (eventType: string, lang: "ar" | "en") => {
  const titles: Record<string, { ar: string; en: string }> = {
    order_stage_changed: { ar: "تم تحديث حالة الطلب", en: "Order status updated" },
    shipment_status_changed: { ar: "تم تحديث حالة الشحنة", en: "Shipment status updated" },
    transfer_receipt_uploaded: { ar: "تم استلام إثبات التحويل", en: "Transfer proof received" },
    transfer_receipt_reviewed: { ar: "تمت مراجعة إثبات التحويل", en: "Transfer proof reviewed" },
    official_conversation_opened: { ar: "تم فتح محادثة رسمية", en: "Official conversation opened" },
    official_conversation_message: { ar: "رسالة رسمية جديدة", en: "New official message" },
    order_followup_added: { ar: "متابعة جديدة على الطلب", en: "New order follow-up" },
    admin_message_sent: { ar: "رسالة إدارية جديدة", en: "New admin message" },
  };

  return titles[eventType]?.[lang] || (lang === "ar" ? "تحديث جديد من لوركس" : "New Lourex update");
};

const eventMessage = (event: NotificationEventRow, lang: "ar" | "en") => {
  const metadata = event.metadata || {};
  const status = asString(metadata.status) || asString(metadata.new_status);
  const stage = asString(metadata.new_stage) || asString(metadata.stage_code);
  const requestNumber = asString(metadata.request_number);
  const trackingId = event.tracking_id || asString(metadata.tracking_id);

  if (event.event_type === "order_stage_changed") {
    return lang === "ar"
      ? `تم تحديث طلبك${requestNumber ? ` ${requestNumber}` : ""}${status ? ` إلى ${status}` : ""}.`
      : `Your order${requestNumber ? ` ${requestNumber}` : ""} was updated${status ? ` to ${status}` : ""}.`;
  }

  if (event.event_type === "shipment_status_changed") {
    return lang === "ar"
      ? `تم تحديث الشحنة${trackingId ? ` ${trackingId}` : ""}${stage ? ` إلى ${stage}` : ""}.`
      : `Your shipment${trackingId ? ` ${trackingId}` : ""} was updated${stage ? ` to ${stage}` : ""}.`;
  }

  if (event.event_type === "transfer_receipt_reviewed") {
    return lang === "ar"
      ? `تم تحديث حالة مراجعة إثبات التحويل${status ? `: ${status}` : ""}.`
      : `Your transfer proof review status was updated${status ? `: ${status}` : ""}.`;
  }

  return lang === "ar"
    ? "يوجد تحديث جديد داخل بوابة لوركس. يرجى مراجعة تفاصيل طلبك."
    : "There is a new update in your Lourex portal. Please review your order details.";
};

const normalizeEventStatus = (event: NotificationEventRow): CustomerNotificationItem["status"] => {
  const status = event.delivery_status || event.status || "logged";
  if (status === "queued") return "queued";
  if (status === "provider_not_configured") return "provider_not_configured";
  return "logged";
};

const mapNotificationRow = (row: NotificationRow): CustomerNotificationItem => ({
  id: `notification-${row.id}`,
  title: row.title || "Lourex notification",
  message: row.message || "",
  eventType: row.type || "in_app_notification",
  status: row.read ? "read" : "unread",
  channel: "in_app",
  source: "notifications",
  createdAt: row.created_at,
  link: row.link || undefined,
});

const mapNotificationEvent = (event: NotificationEventRow, lang: "ar" | "en"): CustomerNotificationItem => ({
  id: `event-${event.id}`,
  title: eventTitle(event.event_type, lang),
  message: eventMessage(event, lang),
  eventType: event.event_type,
  status: normalizeEventStatus(event),
  channel: (event.channel_hint as CustomerNotificationItem["channel"]) || "both",
  source: "notification_events",
  createdAt: event.created_at,
  requestId: asString(event.metadata?.request_id),
  orderId: event.order_id || null,
  trackingId: event.tracking_id || null,
  metadata: event.metadata || {},
});

const projectAuditRowsForCustomer = (
  auditRows: AuditLogRow[],
  requests: PurchaseRequestLite[],
  lang: "ar" | "en",
): CustomerNotificationItem[] => {
  const requestIds = new Set(requests.map((row) => row.id).filter(Boolean));
  const dealIds = new Set(requests.map((row) => row.converted_deal_id).filter(Boolean));
  const trackingIds = new Set(requests.map((row) => row.tracking_code).filter(Boolean));

  return auditRows
    .map((row): CustomerNotificationItem | null => {
      const newValues = asObject(row.new_values);
      const oldValues = asObject(row.old_values);
      const requestId = asString(newValues.request_id) || asString(row.record_id);
      const dealId = asString(newValues.deal_id);
      const trackingId = asString(newValues.tracking_id);

      const isOwnRequest = Boolean(
        (requestId && requestIds.has(requestId)) ||
          (dealId && dealIds.has(dealId)) ||
          (trackingId && trackingIds.has(trackingId)),
      );

      if (!isOwnRequest) return null;

      if (row.action === "purchase_request.status_updated") {
        const event: NotificationEventRow = {
          id: `audit-${row.id}`,
          event_type: "order_stage_changed",
          order_id: dealId || requestId,
          tracking_id: null,
          channel_hint: "both",
          metadata: {
            source: "audit_logs",
            request_id: requestId,
            request_number: asString(newValues.request_number),
            old_status: asString(oldValues.status),
            new_status: asString(newValues.status),
          },
          status: "logged",
          delivery_status: "provider_not_configured",
          created_at: row.created_at,
        };
        return { ...mapNotificationEvent(event, lang), id: `audit-${row.id}`, source: "audit_projection" };
      }

      if (row.action === "tracking.updated") {
        const event: NotificationEventRow = {
          id: `audit-${row.id}`,
          event_type: "shipment_status_changed",
          order_id: dealId,
          tracking_id: trackingId,
          channel_hint: "both",
          metadata: {
            source: "audit_logs",
            tracking_id: trackingId,
            old_stage: asString(oldValues.stage_code),
            new_stage: asString(newValues.stage_code),
          },
          status: "logged",
          delivery_status: "provider_not_configured",
          created_at: row.created_at,
        };
        return { ...mapNotificationEvent(event, lang), id: `audit-${row.id}`, source: "audit_projection" };
      }

      return null;
    })
    .filter((item): item is CustomerNotificationItem => Boolean(item));
};

const dedupeItems = (items: CustomerNotificationItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}:${item.id}:${item.eventType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const loadCustomerNotificationInbox = async (
  lang: "ar" | "en" = "en",
): Promise<CustomerNotificationInboxReport> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      available: false,
      items: [],
      summary: { total: 0, inApp: 0, providerPending: 0, logged: 0, recent: 0 },
    };
  }

  const [inAppRows, eventRows, requestRows, auditRows] = await Promise.all([
    safeList<NotificationRow>("notifications", () =>
      db.from<NotificationRow>("notifications").select("id, user_id, type, title, message, link, read, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ),
    safeList<NotificationEventRow>("notification_events", () =>
      db.from<NotificationEventRow>("notification_events").select("id, event_type, customer_id, order_id, tracking_id, channel_hint, metadata, status, delivery_status, created_at").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(50),
    ),
    safeList<PurchaseRequestLite>("purchase_requests", () =>
      db
        .from<PurchaseRequestLite>("purchase_requests")
        .select("id, request_number, customer_id, email, converted_deal_id, tracking_code, status")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ),
    safeList<AuditLogRow>("audit_logs", () =>
      db
        .from<AuditLogRow>("audit_logs")
        .select("id, action, record_id, old_values, new_values, created_at")
        .order("created_at", { ascending: false })
        .limit(120),
    ),
  ]);

  const projectedAuditItems = projectAuditRowsForCustomer(auditRows, requestRows, lang);
  const items = dedupeItems([
    ...inAppRows.map(mapNotificationRow),
    ...eventRows.map((event) => mapNotificationEvent(event, lang)),
    ...projectedAuditItems,
  ]).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const inApp = items.filter((item) => item.channel === "in_app" || item.source === "notifications").length;
  const providerPending = items.filter((item) => item.status === "provider_not_configured").length;
  const logged = items.filter((item) => item.status === "logged").length;
  const recentThreshold = Date.now() - 1000 * 60 * 60 * 24 * 7;
  const recent = items.filter((item) => +new Date(item.createdAt) >= recentThreshold).length;

  return {
    available: true,
    items,
    summary: {
      total: items.length,
      inApp,
      providerPending,
      logged,
      recent,
    },
  };
};
