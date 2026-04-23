import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserContext, toJsonObject } from "@/lib/operationsDomain";
import type { Json } from "@/integrations/supabase/types";

export interface AuditLogEntry {
  action: string;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export const writeAuditLog = async (entry: AuditLogEntry) => {
  const { user, profile } = await getCurrentUserContext();

  await supabase.from("audit_logs").insert({
    action: entry.action,
    table_name: entry.tableName,
    record_id: entry.recordId,
    changed_by: user?.id || null,
    old_values: toJsonObject(entry.oldValues),
    new_values: {
      actor_label: profile?.full_name || user?.email || "System",
      actor_role: profile?.role || null,
      ...entry.newValues,
    } as Json,
  });
};
