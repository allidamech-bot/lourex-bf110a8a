import { writeAuditLog } from "./service";
import type { AppAuditLogEntry, AuditEventType, EventPayload } from "./types";
import { getCurrentUserContext } from "@/lib/operationsDomain";

/**
 * Generates an immutable audit event securely.
 */
export const logSystemEvent = async (input: {
  eventType: AuditEventType;
  targetId: string;
  payload: EventPayload;
}) => {
  const { user, profile } = await getCurrentUserContext();

  const entry: AppAuditLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    userId: user?.id || null,
    userRole: profile?.role || null,
    eventType: input.eventType,
    targetId: input.targetId,
    payload: input.payload,
  };

  // Map securely to the existing physical audit_logs table without requiring schema migrations
  await writeAuditLog({
    action: `SYSTEM_EVENT:${entry.eventType}`,
    tableName: "system_events_layer",
    recordId: entry.targetId,
    oldValues: entry.payload.beforeState,
    newValues: {
      ...entry.payload.afterState,
      _eventId: entry.id,
      _eventTimestamp: entry.timestamp.toISOString(),
      _eventMetadata: entry.payload.metadata,
      _systemEnforced: true,
    },
  });
  // Intercept events and route to Notification System
  const { sendNotification } = await import("@/domain/notifications/notificationService");

  if (entry.eventType === "DEAL_CLOSED") {
    // Notify Saudi Partner
    const { loadDeals } = await import("@/lib/operationsDomain");
    const deals = await loadDeals();
    const deal = deals.find((d) => d.id === entry.targetId);

    if (deal && deal.saudiPartnerId) {
      await sendNotification({
        recipientId: deal.saudiPartnerId,
        title: "تم إغلاق الصفقة (Settlement Ready)",
        body: `تم إغلاق الصفقة ${deal.dealNumber} وبدء عملية التسوية المالية الآلية.`,
        channel: "IN_APP",
        priority: "CRITICAL",
        metadata: {
          dealId: deal.id,
          dealNumber: deal.dealNumber,
        },
      });
    }
  } else if (entry.eventType === "TRACKING_STAGE_MUTATED") {
    const nextStage = entry.payload.afterState?.stage_code;
    
    // Notify on critical tracking stages (e.g., 'closed' or 'arrived_ksa')
    if (nextStage === "closed" || nextStage === "arrived_ksa") {
      const dealId = entry.payload.metadata?.dealId as string | undefined;
      if (dealId) {
        const { loadDeals } = await import("@/lib/operationsDomain");
        const deals = await loadDeals();
        const deal = deals.find((d) => d.id === dealId);

        if (deal && deal.saudiPartnerId) {
          await sendNotification({
            recipientId: deal.saudiPartnerId,
            title: `تحديث هام للشحنة في الصفقة ${deal.dealNumber}`,
            body: `انتقلت إحدى الشحنات إلى مرحلة: ${nextStage}`,
            channel: "IN_APP",
            priority: "HIGH",
            metadata: {
              dealId: deal.id,
              dealNumber: deal.dealNumber,
              trackingId: entry.targetId,
            },
          });
        }
      }
    }
  }

  return entry;
};
