import {
  detectedSupabaseProjectRef,
  EXPECTED_SUPABASE_PROJECT_REF,
  isOptionalBackendUnavailable,
  isSupabaseConfigured,
  optionalBackendTables,
  supabase,
  checkOptionalTableAvailable,
  OPTIONAL_TABLE_CAPABILITIES,
} from "@/integrations/supabase/client";

export type BackendReadinessRequirement = "critical" | "recommended" | "optional" | "manual";
export type BackendReadinessStatus = "ready" | "warning" | "missing" | "unknown";
export type BackendReadinessProbeType = "environment" | "table" | "function" | "storage" | "provider";

export type BackendReadinessProbe = {
  id: string;
  label: string;
  area: string;
  type: BackendReadinessProbeType;
  requirement: BackendReadinessRequirement;
  status: BackendReadinessStatus;
  message: string;
  table?: string;
  details?: Record<string, unknown>;
};

export type BackendReadinessReport = {
  generatedAt: string;
  overallStatus: "ready" | "attention" | "blocked";
  summary: {
    total: number;
    ready: number;
    warnings: number;
    missing: number;
    manual: number;
    criticalMissing: number;
  };
  probes: BackendReadinessProbe[];
};

type TableProbeDefinition = {
  id: string;
  label: string;
  area: string;
  table: string;
  requirement: BackendReadinessRequirement;
  description: string;
};

type ReadinessTableClient = {
  from: (table: string) => {
    select: (query?: string) => {
      limit: (count: number) => PromiseLike<{ data: unknown[] | null; error: unknown | null }>;
    };
  };
};

const readinessDb = supabase as unknown as ReadinessTableClient;

const coreTableProbes: TableProbeDefinition[] = [
  {
    id: "profiles",
    label: "Profiles and roles",
    area: "Identity",
    table: "profiles",
    requirement: "critical",
    description: "Role-based access control depends on user profiles and account status.",
  },
  {
    id: "lourex-customers",
    label: "Customer records",
    area: "Customer Portal",
    table: "lourex_customers",
    requirement: "critical",
    description: "Customer portal ownership and request visibility depend on this table.",
  },
  {
    id: "purchase-requests",
    label: "Purchase requests",
    area: "Sourcing",
    table: "purchase_requests",
    requirement: "critical",
    description: "The sourcing request lifecycle depends on this table.",
  },
  {
    id: "deals",
    label: "Deals / operations",
    area: "Operations",
    table: "deals",
    requirement: "critical",
    description: "Converted operations and partner assignment depend on this table.",
  },
  {
    id: "shipments",
    label: "Shipments",
    area: "Tracking",
    table: "shipments",
    requirement: "critical",
    description: "The 11-stage tracking workflow depends on shipment records.",
  },
  {
    id: "financial-entries",
    label: "Locked financial entries",
    area: "Accounting",
    table: "financial_entries",
    requirement: "critical",
    description: "Immutable accounting, reports, and balances depend on this table.",
  },
  {
    id: "financial-edit-requests",
    label: "Financial edit requests",
    area: "Accounting",
    table: "financial_edit_requests",
    requirement: "critical",
    description: "Locked-entry correction approval depends on this table.",
  },
  {
    id: "audit-logs",
    label: "Audit logs",
    area: "Audit",
    table: "audit_logs",
    requirement: "critical",
    description: "Operational and accounting traceability depends on audit logs.",
  },
  {
    id: "attachments",
    label: "Attachments",
    area: "Files",
    table: "attachments",
    requirement: "critical",
    description: "Request images, deal files, and document links depend on this table.",
  },
  {
    id: "product-catalog-products",
    label: "Managed product catalog",
    area: "Products",
    table: "product_catalog_products",
    requirement: "recommended",
    description: "Public products can fall back to static catalog data, but admin-managed products need this table.",
  },
  {
    id: "notifications",
    label: "In-app notifications",
    area: "Notifications",
    table: "notifications",
    requirement: "recommended",
    description: "Internal and customer notification cards depend on this table.",
  },
];

const optionalProductionTableProbes: TableProbeDefinition[] = Array.from(optionalBackendTables).map((table) => ({
  id: `optional-${table}`,
  label: table
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" "),
  area: optionalAreaByTable(table),
  table,
  requirement: optionalRequirementByTable(table),
  description: optionalDescriptionByTable(table),
}));

const manualProductionProbes: BackendReadinessProbe[] = [
  {
    id: "storage-product-images",
    label: "product-images storage bucket",
    area: "Storage",
    type: "storage",
    requirement: "manual",
    status: "unknown",
    message: "Verify that the product-images bucket exists and that catalog upload policies support catalog/{slug}/... paths.",
  },
  {
    id: "storage-transfer-proofs",
    label: "transfer proofs storage policy",
    area: "Storage",
    type: "storage",
    requirement: "manual",
    status: "unknown",
    message: "Verify transfer proof upload bucket and RLS policies for customer upload and admin review.",
  },
  {
    id: "rpc-core-functions",
    label: "Core guarded RPC functions",
    area: "Database Functions",
    type: "function",
    requirement: "manual",
    status: "unknown",
    message: "Verify RPC functions: upsert_current_customer_record, cancel_purchase_request, create_locked_financial_entry, request_financial_entry_edit, review_financial_entry_edit_request, capture_system_health_snapshot.",
  },
  {
    id: "edge-lourex-ai-chat",
    label: "lourex-ai-chat Edge Function",
    area: "AI",
    type: "function",
    requirement: "manual",
    status: "unknown",
    message: "Verify Edge Function deployment, LOVABLE_API_KEY, SUPABASE_SERVICE_ROLE_KEY, and ALLOWED_ORIGIN configuration.",
  },
];

function optionalAreaByTable(table: string) {
  if (table.includes("payment") || table.includes("settlement")) return "Payments";
  if (table.includes("notification")) return "Notifications";
  if (table.includes("support") || table.includes("conversation")) return "Support";
  if (table.includes("tracking") || table.includes("followup")) return "Tracking";
  if (table.includes("audit") || table.includes("event") || table.includes("health")) return "Observability";
  if (table.includes("rule")) return "System Rules";
  return "Backend";
}

function optionalRequirementByTable(table: string): BackendReadinessRequirement {
  if (["payments", "payment_allocations", "partner_settlements", "notification_events"].includes(table)) return "recommended";
  if (["business_rules", "security_audit_events", "system_health_snapshots", "system_events"].includes(table)) return "recommended";
  return "optional";
}

function optionalDescriptionByTable(table: string) {
  const descriptions: Record<string, string> = {
    partner_settlements: "Partner settlement visibility, payment status, disputes, and statement reporting.",
    payments: "Recorded customer and operational payment receipts.",
    payment_allocations: "Allocation of payments to requests, deals, customers, or statements.",
    business_rules: "Configurable production rules for operations, risk, and system controls.",
    security_audit_events: "Security-sensitive event trail for privileged operations.",
    system_health_snapshots: "Stored health snapshots used by the admin health center.",
    system_events: "General system observability events and production warnings.",
    tracking_updates: "Detailed shipment stage updates and customer-visible tracking timeline.",
    support_conversations: "Official customer/order support conversation threads.",
    conversation_messages: "Messages inside official support conversations.",
    transfer_proofs: "Structured transfer proof review records.",
    order_followups: "Customer follow-up records and operational reminders.",
    notification_events: "Email/WhatsApp/SMS notification readiness and delivery events.",
  };

  return descriptions[table] || "Optional production backend table used by advanced Lourex workflows.";
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "Unknown backend error");
  }
  return String(error || "Unknown backend error");
}

function buildEnvironmentProbes(): BackendReadinessProbe[] {
  const emailEnabled = (import.meta.env.VITE_EMAIL_NOTIFICATIONS_ENABLED as string | undefined) === "true";
  const messagingEnabled = (import.meta.env.VITE_WHATSAPP_SMS_NOTIFICATIONS_ENABLED as string | undefined) === "true";

  return [
    {
      id: "supabase-env",
      label: "Lovable Cloud client configuration",
      area: "Environment",
      type: "environment",
      requirement: "critical",
      status: isSupabaseConfigured ? "ready" : "missing",
      message: isSupabaseConfigured
        ? "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are configured."
        : "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.",
      details: { isSupabaseConfigured },
    },
    {
      id: "supabase-project-ref",
      label: "Expected Lovable Cloud project",
      area: "Environment",
      type: "environment",
      requirement: "critical",
      status:
        detectedSupabaseProjectRef && detectedSupabaseProjectRef === EXPECTED_SUPABASE_PROJECT_REF
          ? "ready"
          : "warning",
      message:
        detectedSupabaseProjectRef && detectedSupabaseProjectRef === EXPECTED_SUPABASE_PROJECT_REF
          ? `Connected to expected project ${EXPECTED_SUPABASE_PROJECT_REF}.`
          : `Expected project ${EXPECTED_SUPABASE_PROJECT_REF}, detected ${detectedSupabaseProjectRef || "unknown"}.`,
      details: { expected: EXPECTED_SUPABASE_PROJECT_REF, detected: detectedSupabaseProjectRef || null },
    },
    {
      id: "email-provider-flag",
      label: "Email notification provider flag",
      area: "Notifications",
      type: "provider",
      requirement: "recommended",
      status: emailEnabled ? "ready" : "warning",
      message: emailEnabled
        ? "Email notifications are enabled by environment flag."
        : "Email notifications are not enabled; readiness may be logged without delivery.",
      details: { VITE_EMAIL_NOTIFICATIONS_ENABLED: emailEnabled },
    },
    {
      id: "messaging-provider-flag",
      label: "WhatsApp/SMS provider flag",
      area: "Notifications",
      type: "provider",
      requirement: "optional",
      status: messagingEnabled ? "ready" : "warning",
      message: messagingEnabled
        ? "WhatsApp/SMS notifications are enabled by environment flag."
        : "WhatsApp/SMS provider is not enabled yet.",
      details: { VITE_WHATSAPP_SMS_NOTIFICATIONS_ENABLED: messagingEnabled },
    },
  ];
}

async function probeTable(definition: TableProbeDefinition): Promise<BackendReadinessProbe> {
  if (!isSupabaseConfigured) {
    return {
      id: definition.id,
      label: definition.label,
      area: definition.area,
      table: definition.table,
      type: "table",
      requirement: definition.requirement,
      status: definition.requirement === "critical" ? "missing" : "warning",
      message: "Lovable Cloud client configuration is missing, so this table could not be checked.",
      details: { description: definition.description },
    };
  }

  try {
    const isExplicitlyDisabled = OPTIONAL_TABLE_CAPABILITIES[definition.table] === false;
    if (definition.requirement !== "critical" && (isExplicitlyDisabled || optionalBackendTables.has(definition.table))) {
      const isAvailable = await checkOptionalTableAvailable(definition.table);
      if (!isAvailable) {
        return {
          id: definition.id,
          label: definition.label,
          area: definition.area,
          table: definition.table,
          type: "table",
          requirement: definition.requirement,
          status: "warning",
          message: "Table is disabled statically in capability configuration (no network request made).",
          details: { description: definition.description, disabled: true },
        };
      }
    }

    const { error } = await readinessDb.from(definition.table).select("id").limit(1);

    if (!error) {
      return {
        id: definition.id,
        label: definition.label,
        area: definition.area,
        table: definition.table,
        type: "table",
        requirement: definition.requirement,
        status: "ready",
        message: "Read probe succeeded.",
        details: { description: definition.description },
      };
    }

    const unavailable = isOptionalBackendUnavailable(error);
    return {
      id: definition.id,
      label: definition.label,
      area: definition.area,
      table: definition.table,
      type: "table",
      requirement: definition.requirement,
      status: definition.requirement === "critical" && unavailable ? "missing" : "warning",
      message: unavailable
        ? `${definition.table} is missing or not exposed to the current role.`
        : errorMessage(error),
      details: { description: definition.description, error: errorMessage(error) },
    };
  } catch (error) {
    return {
      id: definition.id,
      label: definition.label,
      area: definition.area,
      table: definition.table,
      type: "table",
      requirement: definition.requirement,
      status: definition.requirement === "critical" ? "missing" : "warning",
      message: errorMessage(error),
      details: { description: definition.description },
    };
  }
}

export const loadBackendReadinessReport = async (): Promise<BackendReadinessReport> => {
  const tableDefinitions = [...coreTableProbes, ...optionalProductionTableProbes];
  const tableProbes = await Promise.all(tableDefinitions.map(probeTable));
  const probes = [...buildEnvironmentProbes(), ...tableProbes, ...manualProductionProbes];

  const ready = probes.filter((probe) => probe.status === "ready").length;
  const missing = probes.filter((probe) => probe.status === "missing").length;
  const warnings = probes.filter((probe) => probe.status === "warning").length;
  const manual = probes.filter((probe) => probe.status === "unknown" || probe.requirement === "manual").length;
  const criticalMissing = probes.filter((probe) => probe.requirement === "critical" && probe.status === "missing").length;

  return {
    generatedAt: new Date().toISOString(),
    overallStatus: criticalMissing > 0 ? "blocked" : warnings > 0 || missing > 0 || manual > 0 ? "attention" : "ready",
    summary: {
      total: probes.length,
      ready,
      warnings,
      missing,
      manual,
      criticalMissing,
    },
    probes,
  };
};
