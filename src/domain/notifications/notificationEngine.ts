import { isOptionalBackendUnavailable, logOptionalBackendUnavailableOnce, supabase, isTableUnavailable, markTableUnavailable, checkOptionalTableAvailable } from "@/integrations/supabase/client";
import type { LooseDomainClient } from "@/lib/operationsDomain";

export type NotificationChannel = "email" | "whatsapp_sms" | "in_app" | "system";
export type NotificationQueueStatus = "queued" | "provider_not_configured" | "processing" | "sent" | "failed" | "cancelled" | "skipped";

export type NotificationSettingRow = {
  id: string;
  setting_key: string;
  channel: NotificationChannel;
  enabled: boolean;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type NotificationTemplateRow = {
  id: string;
  template_key: string;
  event_type: string;
  channel: NotificationChannel;
  audience: string;
  locale: "en" | "ar";
  subject: string | null;
  body: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type NotificationEventRow = {
  id: string;
  event_type: string;
  customer_id: string | null;
  order_id: string | null;
  tracking_id: string | null;
  channel_hint: string;
  metadata: Record<string, unknown> | null;
  status: string;
  severity?: string | null;
  template_key?: string | null;
  delivery_status?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type NotificationDeliveryQueueRow = {
  id: string;
  event_id: string | null;
  event_type: string;
  channel: NotificationChannel;
  recipient_type: string;
  recipient_id: string | null;
  recipient_contact: string | null;
  template_key: string | null;
  payload: Record<string, unknown> | null;
  status: NotificationQueueStatus;
  provider: string | null;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  scheduled_for: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

type AuditLogRow = {
  id: string;
  action: string;
  table_name?: string | null;
  record_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  created_at: string;
};

export type NotificationEngineReport = {
  available: boolean;
  migrationlessMode: boolean;
  providerFlags: { email: boolean; messaging: boolean };
  settings: NotificationSettingRow[];
  templates: NotificationTemplateRow[];
  events: NotificationEventRow[];
  queue: NotificationDeliveryQueueRow[];
  summary: {
    settingsCount: number;
    templatesCount: number;
    queued: number;
    providerNotConfigured: number;
    sent: number;
    failed: number;
    warnings: number;
  };
};

const notificationsDb = supabase as unknown as LooseDomainClient;

export const isEmailNotificationProviderEnabled = () =>
  Boolean(import.meta.env.VITE_EMAIL_NOTIFICATIONS_ENABLED === "true");

export const isMessagingNotificationProviderEnabled = () =>
  Boolean(import.meta.env.VITE_WHATSAPP_SMS_NOTIFICATIONS_ENABLED === "true");

const nowIso = () => new Date().toISOString();

const builtinTemplates: NotificationTemplateRow[] = [
  {
    id: "builtin-order-stage-en",
    template_key: "order_stage_changed_email_en",
    event_type: "order_stage_changed",
    channel: "email",
    audience: "customer",
    locale: "en",
    subject: "Your Lourex order was updated",
    body: "Your order stage has been updated. Please sign in to your Lourex portal for details.",
    enabled: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "builtin-order-stage-ar",
    template_key: "order_stage_changed_email_ar",
    event_type: "order_stage_changed",
    channel: "email",
    audience: "customer",
    locale: "ar",
    subject: "تم تحديث طلبك في لوركس",
    body: "تم تحديث مرحلة طلبك. يرجى الدخول إلى بوابة لوركس لمعرفة التفاصيل.",
    enabled: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "builtin-shipment-en",
    template_key: "shipment_status_changed_email_en",
    event_type: "shipment_status_changed",
    channel: "email",
    audience: "customer",
    locale: "en",
    subject: "Shipment status updated",
    body: "Your shipment status has changed. Please check your Lourex tracking page.",
    enabled: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "builtin-shipment-ar",
    template_key: "shipment_status_changed_email_ar",
    event_type: "shipment_status_changed",
    channel: "email",
    audience: "customer",
    locale: "ar",
    subject: "تم تحديث حالة الشحنة",
    body: "تم تحديث حالة شحنتك. يرجى مراجعة صفحة التتبع في لوركس.",
    enabled: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "builtin-transfer-en",
    template_key: "transfer_receipt_reviewed_email_en",
    event_type: "transfer_receipt_reviewed",
    channel: "email",
    audience: "customer",
    locale: "en",
    subject: "Transfer proof reviewed",
    body: "Your transfer proof review status has been updated.",
    enabled: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "builtin-transfer-ar",
    template_key: "transfer_receipt_reviewed_email_ar",
    event_type: "transfer_receipt_reviewed",
    channel: "email",
    audience: "customer",
    locale: "ar",
    subject: "تمت مراجعة إثبات التحويل",
    body: "تم تحديث حالة مراجعة إثبات التحويل الخاص بك.",
    enabled: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "builtin-admin-message-en",
    template_key: "admin_message_sent_in_app_en",
    event_type: "admin_message_sent",
    channel: "in_app",
    audience: "customer",
    locale: "en",
    subject: null,
    body: "You have a new official message in your Lourex portal.",
    enabled: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "builtin-admin-message-ar",
    template_key: "admin_message_sent_in_app_ar",
    event_type: "admin_message_sent",
    channel: "in_app",
    audience: "customer",
    locale: "ar",
    subject: null,
    body: "لديك رسالة رسمية جديدة داخل بوابة لوركس.",
    enabled: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  },
];

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

const buildAuditBackedNotificationEvents = (auditRows: AuditLogRow[]): NotificationEventRow[] =>
  auditRows
    .map((row): NotificationEventRow | null => {
      const newValues = asObject(row.new_values);
      const oldValues = asObject(row.old_values);
      const requestId = asString(newValues.request_id) || asString(row.record_id);
      const dealId = asString(newValues.deal_id);
      const trackingId = asString(newValues.tracking_id);

      if (row.action === "purchase_request.status_updated") {
        return {
          id: `audit-${row.id}`,
          event_type: "order_stage_changed",
          customer_id: null,
          order_id: dealId || requestId,
          tracking_id: null,
          channel_hint: "both",
          metadata: {
            source: "audit_logs",
            action: row.action,
            request_id: requestId,
            request_number: asString(newValues.request_number),
            old_status: asString(oldValues.status),
            new_status: asString(newValues.status),
            entity_label: asString(newValues.entity_label),
          },
          status: "logged",
          template_key: "order_stage_changed_email_en",
          delivery_status: "provider_not_configured",
          created_at: row.created_at,
          updated_at: row.created_at,
        };
      }

      if (row.action === "tracking.updated") {
        return {
          id: `audit-${row.id}`,
          event_type: "shipment_status_changed",
          customer_id: null,
          order_id: dealId,
          tracking_id: trackingId,
          channel_hint: "both",
          metadata: {
            source: "audit_logs",
            action: row.action,
            shipment_id: asString(newValues.shipment_id),
            deal_id: dealId,
            tracking_id: trackingId,
            old_stage: asString(oldValues.stage_code),
            new_stage: asString(newValues.stage_code),
            customer_note: asString(newValues.customer_note),
            entity_label: asString(newValues.entity_label),
          },
          status: "logged",
          template_key: "shipment_status_changed_email_en",
          delivery_status: "provider_not_configured",
          created_at: row.created_at,
          updated_at: row.created_at,
        };
      }

      return null;
    })
    .filter((item): item is NotificationEventRow => Boolean(item));

const dedupeEvents = (events: NotificationEventRow[]) => {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.id}:${event.event_type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildVirtualQueueFromEvents = (events: NotificationEventRow[]): NotificationDeliveryQueueRow[] =>
  events.map((event) => {
    const metadata = event.metadata || {};
    const contact = metadata.customerEmail || metadata.email || metadata.customerPhone || metadata.phone;
    const providerConfigured = isEmailNotificationProviderEnabled() || isMessagingNotificationProviderEnabled();

    return {
      id: `event-${event.id}`,
      event_id: event.id,
      event_type: event.event_type,
      channel: event.channel_hint === "whatsapp_sms" ? "whatsapp_sms" : "email",
      recipient_type: "customer",
      recipient_id: event.customer_id,
      recipient_contact: typeof contact === "string" ? contact : null,
      template_key: event.template_key || `${event.event_type}_email_en`,
      payload: {
        order_id: event.order_id,
        tracking_id: event.tracking_id,
        metadata,
        source: metadata.source || "notification_events_fallback",
      },
      status: providerConfigured ? "queued" : "provider_not_configured",
      provider: providerConfigured ? "ready_for_provider" : null,
      attempt_count: 0,
      max_attempts: 3,
      last_error: providerConfigured
        ? null
        : "External delivery provider is not configured yet. Event is safely visible in migrationless notification mode.",
      scheduled_for: event.created_at,
      sent_at: null,
      created_at: event.created_at,
      updated_at: event.updated_at || event.created_at,
    };
  });

const optionalList = async <T extends Record<string, unknown>>(
  table: string,
  runner: () => PromiseLike<{ data: T[] | null; error: unknown | null }>,
) => {
  const isAvailable = await checkOptionalTableAvailable(table);
  if (!isAvailable) return [];
  try {
    const { data, error } = await runner();
    if (error) throw error;
    return data || [];
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      markTableUnavailable(table);
      logOptionalBackendUnavailableOnce(table, error);
      return [];
    }
    throw error;
  }
};

export const loadNotificationEngineReport = async (): Promise<NotificationEngineReport> => {
  const [settings, storedTemplates, notificationEvents, auditRows, storedQueue] = await Promise.all([
    optionalList<NotificationSettingRow>("notification_settings", () =>
      notificationsDb.from<NotificationSettingRow>("notification_settings").select("*").order("setting_key"),
    ),
    optionalList<NotificationTemplateRow>("notification_templates", () =>
      notificationsDb.from<NotificationTemplateRow>("notification_templates").select("*").order("event_type").order("locale"),
    ),
    optionalList<NotificationEventRow>("notification_events", () =>
      notificationsDb.from<NotificationEventRow>("notification_events").select("*").order("created_at", { ascending: false }).limit(50),
    ),
    optionalList<AuditLogRow>("audit_logs", () =>
      notificationsDb
        .from<AuditLogRow>("audit_logs")
        .select("id, action, table_name, record_id, old_values, new_values, created_at")
        .order("created_at", { ascending: false })
        .limit(80),
    ),
    optionalList<NotificationDeliveryQueueRow>("notification_delivery_queue", () =>
      notificationsDb.from<NotificationDeliveryQueueRow>("notification_delivery_queue").select("*").order("created_at", { ascending: false }).limit(50),
    ),
  ]);

  const auditBackedEvents = buildAuditBackedNotificationEvents(auditRows);
  const events = dedupeEvents([...notificationEvents, ...auditBackedEvents]).sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
  const templates = storedTemplates.length > 0 ? storedTemplates : builtinTemplates;
  const queue = storedQueue.length > 0 ? storedQueue : buildVirtualQueueFromEvents(events);
  const migrationlessMode = storedTemplates.length === 0 || storedQueue.length === 0 || settings.length === 0;

  const queued = queue.filter((item) => item.status === "queued" || item.status === "processing").length;
  const providerNotConfigured = queue.filter((item) => item.status === "provider_not_configured").length;
  const sent = queue.filter((item) => item.status === "sent").length;
  const failed = queue.filter((item) => item.status === "failed").length;
  const warnings = Number(!isEmailNotificationProviderEnabled()) + Number(!isMessagingNotificationProviderEnabled()) + providerNotConfigured + failed;

  return {
    available: true,
    migrationlessMode,
    providerFlags: {
      email: isEmailNotificationProviderEnabled(),
      messaging: isMessagingNotificationProviderEnabled(),
    },
    settings,
    templates,
    events,
    queue,
    summary: {
      settingsCount: settings.length,
      templatesCount: templates.length,
      queued,
      providerNotConfigured,
      sent,
      failed,
      warnings,
    },
  };
};