import {
  detectedSupabaseProjectRef,
  EXPECTED_SUPABASE_PROJECT_REF,
  isMissingBackendResourceError,
  isSupabaseConfigured,
  missingSupabaseEnvVars,
  optionalBackendTables,
  SUPABASE_URL,
  supabase,
} from "@/integrations/supabase/client";
import { STORAGE_BUCKETS } from "@/lib/storage";
import { logOperationalError } from "@/lib/monitoring";

export type SystemHealthStatus = "ok" | "warning" | "error";

export type SystemHealthCheck = {
  id: string;
  label: string;
  status: SystemHealthStatus;
  details: string;
  metadata?: Record<string, unknown>;
};

export type SystemHealthReport = {
  generatedAt: string;
  overallStatus: SystemHealthStatus;
  checks: SystemHealthCheck[];
};

const criticalTables = [
  "profiles",
  "purchase_requests",
  "deals",
  "shipments",
  "financial_entries",
  "financial_edit_requests",
] as const;

const readableOptionalTables = Array.from(optionalBackendTables).sort();

const statusRank: Record<SystemHealthStatus, number> = {
  ok: 0,
  warning: 1,
  error: 2,
};

const getOverallStatus = (checks: SystemHealthCheck[]): SystemHealthStatus => {
  return checks.reduce<SystemHealthStatus>((current, check) => {
    return statusRank[check.status] > statusRank[current] ? check.status : current;
  }, "ok");
};

const normalizeErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "Unknown error");
  }
  return "Unknown error";
};

const checkSupabaseConfiguration = (): SystemHealthCheck => {
  if (!isSupabaseConfigured) {
    return {
      id: "supabase-env",
      label: "Lovable Cloud / Supabase environment",
      status: "error",
      details: "Required Supabase environment variables are missing.",
      metadata: { missingSupabaseEnvVars },
    };
  }

  if (detectedSupabaseProjectRef && detectedSupabaseProjectRef !== EXPECTED_SUPABASE_PROJECT_REF) {
    return {
      id: "supabase-project-ref",
      label: "Supabase project reference",
      status: "warning",
      details: "Detected project ref does not match the expected LOUREX project ref.",
      metadata: {
        expected: EXPECTED_SUPABASE_PROJECT_REF,
        detected: detectedSupabaseProjectRef,
        url: SUPABASE_URL,
      },
    };
  }

  return {
    id: "supabase-env",
    label: "Lovable Cloud / Supabase environment",
    status: "ok",
    details: "Supabase environment variables are present and the project ref matches the expected LOUREX project when detectable.",
    metadata: {
      expectedProjectRef: EXPECTED_SUPABASE_PROJECT_REF,
      detectedProjectRef: detectedSupabaseProjectRef || "not-detected",
    },
  };
};

const checkTableReadable = async (tableName: string, critical: boolean): Promise<SystemHealthCheck> => {
  if (!isSupabaseConfigured) {
    return {
      id: `table-${tableName}`,
      label: `${critical ? "Critical" : "Optional"} table: ${tableName}`,
      status: critical ? "error" : "warning",
      details: "Cannot check table because Supabase environment is not configured.",
    };
  }

  try {
    const { error } = await supabase.from(tableName).select("*").limit(1);

    if (!error) {
      return {
        id: `table-${tableName}`,
        label: `${critical ? "Critical" : "Optional"} table: ${tableName}`,
        status: "ok",
        details: "Table is reachable from the current authenticated context.",
      };
    }

    const missing = isMissingBackendResourceError(error);
    return {
      id: `table-${tableName}`,
      label: `${critical ? "Critical" : "Optional"} table: ${tableName}`,
      status: critical || !missing ? "error" : "warning",
      details: missing
        ? "Backend resource appears to be unavailable in the current Lovable Cloud configuration."
        : normalizeErrorMessage(error),
      metadata: {
        code: (error as { code?: string }).code || "unknown",
        missingBackendResource: missing,
      },
    };
  } catch (error) {
    logOperationalError("system_health_table_check", error, { tableName, critical });
    return {
      id: `table-${tableName}`,
      label: `${critical ? "Critical" : "Optional"} table: ${tableName}`,
      status: critical ? "error" : "warning",
      details: normalizeErrorMessage(error),
    };
  }
};

const checkStorageBucket = async (bucketKey: keyof typeof STORAGE_BUCKETS): Promise<SystemHealthCheck> => {
  const bucketName = STORAGE_BUCKETS[bucketKey];

  if (!isSupabaseConfigured) {
    return {
      id: `storage-${bucketName}`,
      label: `Storage bucket: ${bucketName}`,
      status: "warning",
      details: "Cannot check storage bucket because Supabase environment is not configured.",
    };
  }

  try {
    const { error } = await supabase.storage.from(bucketName).list("", { limit: 1 });

    if (!error) {
      return {
        id: `storage-${bucketName}`,
        label: `Storage bucket: ${bucketName}`,
        status: "ok",
        details: "Bucket is reachable from the current authenticated context.",
      };
    }

    return {
      id: `storage-${bucketName}`,
      label: `Storage bucket: ${bucketName}`,
      status: bucketKey === "TRANSFER_PROOFS" ? "warning" : "error",
      details: normalizeErrorMessage(error),
      metadata: {
        bucket: bucketName,
        note:
          bucketKey === "TRANSFER_PROOFS"
            ? "This bucket may be intentionally private. Verify signed URL access and storage policies when Lovable SQL access is available."
            : undefined,
      },
    };
  } catch (error) {
    logOperationalError("system_health_storage_check", error, { bucketName });
    return {
      id: `storage-${bucketName}`,
      label: `Storage bucket: ${bucketName}`,
      status: "warning",
      details: normalizeErrorMessage(error),
    };
  }
};

export const buildSystemHealthReport = async (): Promise<SystemHealthReport> => {
  const checks: SystemHealthCheck[] = [checkSupabaseConfiguration()];

  const [criticalTableChecks, optionalTableChecks, storageChecks] = await Promise.all([
    Promise.all(criticalTables.map((tableName) => checkTableReadable(tableName, true))),
    Promise.all(readableOptionalTables.map((tableName) => checkTableReadable(tableName, false))),
    Promise.all((Object.keys(STORAGE_BUCKETS) as Array<keyof typeof STORAGE_BUCKETS>).map(checkStorageBucket)),
  ]);

  checks.push(...criticalTableChecks, ...optionalTableChecks, ...storageChecks);

  return {
    generatedAt: new Date().toISOString(),
    overallStatus: getOverallStatus(checks),
    checks,
  };
};
