import type { DeliveryPolicy, NotificationPriority } from "@/features/runtime-infra/types/runtimeTypes";

export const deliveryPolicies: Record<NotificationPriority, DeliveryPolicy> = {
  info: {
    priority: "info",
    maxAttempts: 1,
    retryAfterMinutes: 120,
    channels: ["in_app"],
  },
  warning: {
    priority: "warning",
    maxAttempts: 2,
    retryAfterMinutes: 60,
    channels: ["in_app", "email_ready"],
  },
  urgent: {
    priority: "urgent",
    maxAttempts: 3,
    retryAfterMinutes: 30,
    channels: ["in_app", "email_ready", "partner_alert"],
  },
  critical: {
    priority: "critical",
    maxAttempts: 4,
    retryAfterMinutes: 15,
    channels: ["in_app", "email_ready", "sms_ready", "executive_alert"],
  },
};

export const getDeliveryPolicy = (priority: NotificationPriority): DeliveryPolicy => deliveryPolicies[priority];
