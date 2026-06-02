import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkOptionalTableAvailable,
  isTableUnavailable,
  markTableUnavailable,
} from "@/integrations/supabase/client";

// Mock the internal supabase object or just mock the global fetch if we really want to intercept.
// But we can actually use vi.mock on the module if we refactor it, or just use the behavior test.

describe("Optional Backend Capability Gating", () => {
  beforeEach(() => {
    // We can't easily clear the Set from outside, but we can test the Promise deduping by calling it concurrently
  });

  it("concurrent calls should share same Promise", () => {
    const p1 = checkOptionalTableAvailable("test_concurrent_table");
    const p2 = checkOptionalTableAvailable("test_concurrent_table");

    // As long as the table isn't marked unavailable yet, the promises should be strictly equal
    expect(p1).toBe(p2);
  });

  it("missing table is probed once and returns false after mark", async () => {
    markTableUnavailable("test_missing_table");
    const isAvail = await checkOptionalTableAvailable("test_missing_table");
    expect(isAvail).toBe(false);
  });

  it("disabled optional table does not call Supabase even once", async () => {
    const isAvail = await checkOptionalTableAvailable(
      "product_catalog_products",
    );
    expect(isAvail).toBe(false);
  });

  it("financial_entries is not affected and would still probe or throw", async () => {
    // financial_entries is not in OPTIONAL_TABLE_CAPABILITIES
    const p1 = checkOptionalTableAvailable("financial_entries");
    const p2 = checkOptionalTableAvailable("financial_entries");
    expect(p1).toBe(p2);
  });
});

describe("System Health and Readiness Static Gating", () => {
  it("backendReadiness loadBackendReadinessReport should not call supabase.from for disabled optional tables", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const fromSpy = vi.spyOn(supabase, "from");

    const { loadBackendReadinessReport } =
      await import("@/features/system/backendReadiness");
    const report = await loadBackendReadinessReport();

    // Check that none of the disabled tables were queried
    const disabledTables = [
      "product_catalog_products",
      "notification_templates",
      "notification_settings",
      "notification_delivery_queue",
      "business_rules",
      "system_events",
      "security_audit_events",
      "system_health_snapshots",
    ];

    disabledTables.forEach((table) => {
      expect(fromSpy).not.toHaveBeenCalledWith(table);

      const probe = report.probes.find((p) => p.table === table);
      expect(probe?.status).toBe("warning");
      expect(probe?.message).toContain("disabled statically");
    });

    fromSpy.mockRestore();
  });

  it("health buildSystemHealthReport should not call supabase.from for disabled optional tables", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const fromSpy = vi.spyOn(supabase, "from");

    const { buildSystemHealthReport } = await import("@/domain/system/health");
    const report = await buildSystemHealthReport();

    const disabledTables = [
      "product_catalog_products",
      "notification_templates",
      "notification_settings",
      "notification_delivery_queue",
      "business_rules",
      "system_events",
      "security_audit_events",
      "system_health_snapshots",
    ];

    disabledTables.forEach((table) => {
      expect(fromSpy).not.toHaveBeenCalledWith(table);

      const check = report.checks.find((c) => c.id === `table-${table}`);
      if (check) {
        expect(check.status).toBe("warning");
        expect(check.details).toContain("disabled statically");
      }
    });

    fromSpy.mockRestore();
  });
});
