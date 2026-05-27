import { supabase, isOptionalBackendUnavailable, logOptionalBackendUnavailableOnce } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";

export type CustomerNotificationEvent =
  | "order_stage_changed"
  | "shipment_status_changed"
  | "customer_update_added"
  | "admin_message_sent"
  | "official_conversation_opened"
  | "official_conversation_message"
  | "transfer_receipt_uploaded"
  | "transfer_receipt_reviewed"
  | "order_followup_added";

export type NotificationReadinessInput = {
  eventType: CustomerNotificationEvent;
  customerId?: string | null;
  orderId?: string | null;
  trackingId?: string | null;
  channelHint?: "email" | "whatsapp_sms" | "both";
  metadata?: Record<string, unknown>;
};

type NotificationDeliveryChannel = "email" | "whatsapp_sms";
type NotificationDeliveryStatus = "queued" | "provider_not_configured";

const hasEmailProvider = () => Boolean(import.meta.env.VITE_EMAIL_NOTIFICATIONS_ENABLED === "true");
const hasMessagingProvider = () => Boolean(import.meta.env.VITE_WHATSAPP_SMS_NOTIFICATIONS_ENABLED === "true");

const resolveDeliveryChannels = (channelHint: NotificationReadinessInput["channelHint"]): NotificationDeliveryChannel[] => {
  if (channelHint === "email") return ["email"];
  if (channelHint === "whatsapp_sms") return ["whatsapp_sms"];
  return ["email", "whatsapp_sms"];
};

const getProviderConfiguredForChannel = (channel: NotificationDeliveryChannel) =>
  channel === "email" ? hasEmailProvider() : hasMessagingProvider();

const getDeliveryStatusForChannel = (channel: NotificationDeliveryChannel): NotificationDeliveryStatus =>
  getProviderConfiguredForChannel(channel) ? "queued" : "provider_not_configured";

const getTemplateKeyForEvent = (eventType: CustomerNotificationEvent, channel: NotificationDeliveryChannel) => {
  const channelSuffix = channel === "email" ? "email_en" : "whatsapp_sms_en";
  return `${eventType}_${channelSuffix}`;
};

const getRecipientContactFromMetadata = (metadata: Record<string, unknown> | undefined) => {
  const value = metadata?.customerEmail || metadata?.email || metadata?.phone || metadata?.customerPhone;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const queueNotificationDelivery = async (input: NotificationReadinessInput) => {
  const metadata = input.metadata || {};
  const channels = resolveDeliveryChannels(input.channelHint);
  const rows = channels.map((channel) => {
    const status = getDeliveryStatusForChannel(channel);

    return {
      event_type: input.eventType,
      channel,
      recipient_type: "customer",
      recipient_id: input.customerId || null,
      recipient_contact: getRecipientContactFromMetadata(metadata),
      template_key: getTemplateKeyForEvent(input.eventType, channel),
      payload: {
        order_id: input.orderId || null,
        tracking_id: input.trackingId || null,
        metadata,
      },
      status,
      provider: status === "queued" ? "ready_for_provider" : null,
      last_error: status === "provider_not_configured" ? "External delivery provider is not configured yet." : null,
    };
  });

  if (rows.length === 0) return { queued: false, deliveryStatus: "skipped" as const };

  try {
    const { error } = await supabase.from("notification_delivery_queue").insert(rows);
    if (error) throw error;

    return {
      queued: true,
      deliveryStatus: rows.some((row) => row.status === "queued") ? "queued" : "provider_not_configured",
    };
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      logOptionalBackendUnavailableOnce("notification_delivery_queue", error);
      return { queued: false, deliveryStatus: "skipped" as const };
    }

    throw error;
  }
};

export const getCustomerNotificationCopy = (lang: Lang) =>
  lang === "ar"
    ? "سيتم إشعار العميل عند تحديث حالة الطلب."
    : "The customer will be notified when the order status changes.";

export const getNotificationProviderStatus = (lang: Lang) => {
  const email = hasEmailProvider();
  const messaging = hasMessagingProvider();

  if (email || messaging) {
    return {
      configured: true,
      message: getCustomerNotificationCopy(lang),
      email,
      messaging,
    };
  }

  return {
    configured: false,
    message:
      lang === "ar"
        ? "مزود إشعارات البريد أو واتساب/SMS غير مهيأ حالياً، لذلك سيتم تسجيل الاستعداد فقط."
        : "Email or WhatsApp/SMS notification provider is not configured yet, so readiness will be logged only.",
    email,
    messaging,
  };
};

export const recordNotificationReadiness = async (input: NotificationReadinessInput) => {
  const payload = {
    event_type: input.eventType,
    customer_id: input.customerId || null,
    order_id: input.orderId || null,
    tracking_id: input.trackingId || null,
    channel_hint: input.channelHint || "both",
    provider_email_configured: hasEmailProvider(),
    provider_messaging_configured: hasMessagingProvider(),
    metadata: input.metadata || {},
    status: "ready",
  };

  let logged = false;

  try {
    const { error } = await supabase.from("notification_events").insert(payload);
    if (error) throw error;
    logged = true;
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      logOptionalBackendUnavailableOnce("notification_events", error);
    } else {
      throw error;
    }
  }

  const queued = await queueNotificationDelivery(input);

  return {
    logged,
    queued: queued.queued,
    deliveryStatus: queued.deliveryStatus,
    providerConfigured: payload.provider_email_configured || payload.provider_messaging_configured,
  };
};