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

  return entry;
};
