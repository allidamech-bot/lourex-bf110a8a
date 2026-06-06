import type { NotificationPayload } from "./types";
import { createNotifications } from "@/lib/operationsDomain";

/**
 * Centralized Notification Dispatcher.
 * Processes internal notifications and simulates external delivery loggers (like SMS/WhatsApp).
 */
export const sendNotification = async (payload: NotificationPayload) => {
  // Always log to console to simulate external logging for future integrations
  console.log(`[NOTIFICATION DISPATCHED] Priority: ${payload.priority} | Channel: ${payload.channel}`);
  console.log(`To: ${payload.recipientId} | Title: ${payload.title}`);
  console.log(`Body: ${payload.body}`);

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

  // Future integration point for EMAIL/SMS
  if (payload.channel === 'EMAIL') {
    console.log(`[EMAIL DISPATCHER] Simulated sending email to user ${payload.recipientId}...`);
  }
};
