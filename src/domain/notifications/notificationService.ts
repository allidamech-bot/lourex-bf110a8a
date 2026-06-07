import type { NotificationPayload } from "./types";
import { createNotifications } from "@/lib/operationsDomain";
import { dispatchEmailPayload } from "./providers/emailProviderAdapter";
import { dispatchSmsPayload } from "./providers/smsProviderAdapter";

/**
 * Centralized Notification Dispatcher.
 * Processes internal notifications and routes external delivery loggers (like SMS/WhatsApp).
 */
export const sendNotification = async (payload: NotificationPayload) => {
  console.log(`[NOTIFICATION DISPATCHED] Priority: ${payload.priority} | Channel: ${payload.channel}`);

  // In this phase, IN_APP and SYSTEM channels map to our existing database table via `createNotifications`.
  if (payload.channel === 'IN_APP' || payload.channel === 'SYSTEM') {
    let link = "";
    if (payload.metadata?.dealNumber) {
      link = `/dashboard/deals?deal=${payload.metadata.dealNumber}`;
      if (payload.metadata?.trackingId) {
        link = `/dashboard/tracking?deal=${payload.metadata.dealNumber}&tracking=${payload.metadata.trackingId}`;
      }
    }

    try {
      await createNotifications([
        {
          userId: payload.recipientId,
          type: "system_event",
          title: payload.title,
          message: payload.body,
          link,
        }
      ]);
    } catch (error) {
      console.error(`Failed to persist notification for ${payload.recipientId}`, error);
    }
  }

  // Phase 25: Abstract External Notification Gateways
  // Automatically escalate HIGH/CRITICAL alerts to SMS or EMAIL if explicitly requested or implicitly needed.
  if (payload.channel === 'EMAIL' || payload.priority === 'CRITICAL') {
    await dispatchEmailPayload(payload);
  }

  if (payload.channel === 'SMS' || payload.priority === 'CRITICAL') {
    // In a real system, you'd map the recipientId (UUID) to their phone number via a profile lookup.
    // For this simulation phase, we dispatch directly to the adapter.
    await dispatchSmsPayload(payload);
  }
};
