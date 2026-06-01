import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
export const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();
export const EXPECTED_SUPABASE_PROJECT_REF = "qezrzwoiyhbjrrxnrqra";
export const ENABLE_OPTIONAL_BACKEND_PROBES =
  (import.meta.env.VITE_ENABLE_OPTIONAL_BACKEND_PROBES as string | undefined)?.trim() === "true";

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
  "tracking_updates",
  "support_conversations",
  "conversation_messages",
  "transfer_proofs",
  "order_followups",
  "notification_events",
  "notification_settings",
  "notification_templates",
  "notification_delivery_queue",
]);

export const optionalBackendUnavailableMessage =
  "This optional backend feature is not available in the current Lovable Cloud configuration.";

const warnedOptionalBackendKeys = new Set<string>();
const unavailableTables = new Set<string>();
const inFlightTableProbes = new Map<string, Promise<boolean>>();

export const isTableUnavailable = (tableName: string) => unavailableTables.has(tableName);

export const markTableUnavailable = (tableName: string) => {
  unavailableTables.add(tableName);
};

export const checkOptionalTableAvailable = (tableName: string): Promise<boolean> => {
  if (unavailableTables.has(tableName)) return Promise.resolve(false);

  if (inFlightTableProbes.has(tableName)) {
    return inFlightTableProbes.get(tableName)!;
  }

  const probePromise = (async () => {
    try {
      const { error } = await supabase.from(tableName).select("id").limit(1);
      if (error && isMissingBackendResourceError(error)) {
        unavailableTables.add(tableName);
        return false;
      }
      return true;
    } catch (e) {
      return true;
    } finally {
      inFlightTableProbes.delete(tableName);
    }
  })();

  inFlightTableProbes.set(tableName, probePromise);
  return probePromise;
};

export async function safeOptionalSelect<T>(
  tableName: string,
  queryFactory: () => Promise<{ data: T | null; error: unknown }>,
  fallback: T
): Promise<T> {
  const isAvailable = await checkOptionalTableAvailable(tableName);
  if (!isAvailable) return fallback;

  try {
    const { data, error } = await queryFactory();
    if (error) {
      if (isMissingBackendResourceError(error)) {
        unavailableTables.add(tableName);
        return fallback;
      }
      logOptionalBackendUnavailableOnce(tableName, error);
      return fallback;
    }
    return data !== null ? data : fallback;
  } catch (err) {
    logOptionalBackendUnavailableOnce(tableName, err);
    return fallback;
  }
}

export const logOptionalBackendUnavailableOnce = (feature: string, error?: unknown) => {
  if (!import.meta.env.DEV || warnedOptionalBackendKeys.has(feature)) return;
  warnedOptionalBackendKeys.add(feature);

  if (ENABLE_OPTIONAL_BACKEND_PROBES) {
    console.info(`[lourex:optional-backend] ${feature} is not configured yet.`, error);
  }
};

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
    message.includes("column") ||
    details.includes("does not exist") ||
    details.includes("could not find") ||
    details.includes("column") ||
    hint.includes("could not find")
  );
};

export const isOptionalBackendUnavailable = (error: unknown) =>
  !isSupabaseConfigured || isMissingBackendResourceError(error);

const runtimeSupabaseUrl =
  SUPABASE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost");

const getProjectRefFromUrl = (url: string | undefined) => {
  if (!url) return "";
  try {
    const hostname = new URL(url).hostname;
    const match = hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match?.[1] || "";
  } catch {
    return "";
  }
};

export const detectedSupabaseProjectRef = getProjectRefFromUrl(SUPABASE_URL);

if (
  import.meta.env.PROD &&
  detectedSupabaseProjectRef &&
  detectedSupabaseProjectRef !== EXPECTED_SUPABASE_PROJECT_REF
) {
  console.warn(
    `[lourex:supabase] Expected project ref ${EXPECTED_SUPABASE_PROJECT_REF}, detected ${detectedSupabaseProjectRef}. Check VITE_SUPABASE_URL.`,
  );
}

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