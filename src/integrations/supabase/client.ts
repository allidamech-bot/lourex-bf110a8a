import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
export const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();

export const missingSupabaseEnvVars = [
  !SUPABASE_URL ? "VITE_SUPABASE_URL" : null,
  !SUPABASE_PUBLISHABLE_KEY ? "VITE_SUPABASE_PUBLISHABLE_KEY" : null,
].filter(Boolean) as string[];

export const isSupabaseConfigured = missingSupabaseEnvVars.length === 0;

export const optionalBackendTables = new Set([
  "partner_settlements",
  "payments",
  "payment_allocations",
  "business_rules",
  "security_audit_events",
  "system_health_snapshots",
  "system_events",
]);

export const optionalBackendUnavailableMessage =
  "This optional backend feature is not available in the current Lovable Cloud configuration.";

export const isMissingBackendResourceError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown; status?: unknown };
  const message = String(record.message || "").toLowerCase();
  const details = String(record.details || "").toLowerCase();
  const hint = String(record.hint || "").toLowerCase();
  const code = String(record.code || "");

  return (
    record.status === 404 ||
    ["42P01", "42703", "42883", "PGRST204", "PGRST205", "PGRST202"].includes(code) ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("relation") ||
    message.includes("function") ||
    details.includes("does not exist") ||
    details.includes("could not find") ||
    hint.includes("could not find")
  );
};

export const isOptionalBackendUnavailable = (error: unknown) =>
  !isSupabaseConfigured || isMissingBackendResourceError(error);

const runtimeSupabaseUrl =
  SUPABASE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost");

export const supabase = createClient<Database>(
    runtimeSupabaseUrl,
    SUPABASE_PUBLISHABLE_KEY || "lovable-cloud-runtime-not-configured",
    {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    },
);
