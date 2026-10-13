import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserContext, toJsonObject } from "@/lib/operationsDomain";
import { logOperationalError } from "@/lib/monitoring";
import type { Json } from "@/integrations/supabase/types";

export interface AuditLogEntry {
  action: string;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export type AuditWriteResult =
  | { ok: true; error: null }
  | { ok: false; error: unknown };

// A successful business mutation is NOT evidence that its separate audit INSERT
// succeeded. Return the outcome explicitly, so critical flows can be moved to
// transactional database RPCs rather than falsely reporting rollback after commit.
export const writeAuditLog = async (entry: AuditLogEntry): Promise<AuditWriteResult> => {
  try {
    const { user, profile } = await getCurrentUserContext();

    if (!user) {
      const error = new Error("Authenticated actor is required for audit logging.");
      logOperationalError("audit_log_write_denied", error, {
        action: entry.action,
        tableName: entry.tableName,
      });
      return { ok: false, error };
    }

    const { error } = await supabase.from("audit_logs").insert({
      action: entry.action,
      table_name: entry.tableName,
      record_id: entry.recordId,
      changed_by: user.id,
      old_values: toJsonObject(entry.oldValues),
      new_values: {
        actor_label: profile?.full_name || user.email || "System",
        actor_role: profile?.role || null,
        ...entry.newValues,
      } as Json,
    });

    if (error) {
      logOperationalError("audit_log_insert_failed", error, {
        action: entry.action,
        tableName: entry.tableName,
      });
      return { ok: false, error };
    }

    return { ok: true, error: null };
  } catch (error) {
    logOperationalError("audit_log_write_failed", error, {
      action: entry.action,
      tableName: entry.tableName,
    });
    return { ok: false, error };
  }
};
