import { supabase, isOptionalBackendUnavailable, logOptionalBackendUnavailableOnce } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";

export type CustomerNotificationEvent =
  | "order_stage_changed"
  | "shipment_status_changed"
  | "customer_update_added"
  | "admin_message_sent";

export type NotificationReadinessInput = {
  eventType: CustomerNotificationEvent;
  customerId?: string | null;
  orderId?: string | null;
  trackingId?: string | null;
  channelHint?: "email" | "whatsapp_sms" | "both";
  metadata?: Record<string, unknown>;
};

const hasEmailProvider = () => Boolean(import.meta.env.VITE_EMAIL_NOTIFICATIONS_ENABLED === "true");
const hasMessagingProvider = () => Boolean(import.meta.env.VITE_WHATSAPP_SMS_NOTIFICATIONS_ENABLED === "true");

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

  try {
    const { error } = await supabase.from("notification_events").insert(payload);
    if (error) throw error;
    return { logged: true, providerConfigured: payload.provider_email_configured || payload.provider_messaging_configured };
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      logOptionalBackendUnavailableOnce("notification_events", error);
      return { logged: false, providerConfigured: payload.provider_email_configured || payload.provider_messaging_configured };
    }

    throw error;
  }
};
