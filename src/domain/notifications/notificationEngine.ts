import { isOptionalBackendUnavailable, logOptionalBackendUnavailableOnce, supabase } from "@/integrations/supabase/client";
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

export type NotificationEngineReport = {
  available: boolean;
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

const optionalList = async <T extends Record<string, unknown>>(
  table: string,
  runner: () => PromiseLike<{ data: T[] | null; error: unknown | null }>,
) => {
  try {
    const { data, error } = await runner();
    if (error) throw error;
    return data || [];
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      logOptionalBackendUnavailableOnce(table, error);
      return [];
    }
    throw error;
  }
};

export const loadNotificationEngineReport = async (): Promise<NotificationEngineReport> => {
  const [settings, templates, events, queue] = await Promise.all([
    optionalList<NotificationSettingRow>("notification_settings", () =>
      notificationsDb.from<NotificationSettingRow>("notification_settings").select("*").order("setting_key"),
    ),
    optionalList<NotificationTemplateRow>("notification_templates", () =>
      notificationsDb.from<NotificationTemplateRow>("notification_templates").select("*").order("event_type").order("locale"),
    ),
    optionalList<NotificationEventRow>("notification_events", () =>
      notificationsDb.from<NotificationEventRow>("notification_events").select("*").order("created_at", { ascending: false }).limit(50),
    ),
    optionalList<NotificationDeliveryQueueRow>("notification_delivery_queue", () =>
      notificationsDb.from<NotificationDeliveryQueueRow>("notification_delivery_queue").select("*").order("created_at", { ascending: false }).limit(50),
    ),
  ]);

  const queued = queue.filter((item) => item.status === "queued" || item.status === "processing").length;
  const providerNotConfigured = queue.filter((item) => item.status === "provider_not_configured").length;
  const sent = queue.filter((item) => item.status === "sent").length;
  const failed = queue.filter((item) => item.status === "failed").length;
  const warnings = Number(!isEmailNotificationProviderEnabled()) + Number(!isMessagingNotificationProviderEnabled()) + providerNotConfigured + failed;

  return {
    available: settings.length > 0 || templates.length > 0 || events.length > 0 || queue.length > 0,
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