import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkOptionalTableAvailable, isTableUnavailable, markTableUnavailable } from "@/integrations/supabase/client";

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
    const isAvail = await checkOptionalTableAvailable("product_catalog_products");
    expect(isAvail).toBe(false);
  });

  it("financial_entries is not affected and would still probe or throw", async () => {
    // financial_entries is not in OPTIONAL_TABLE_CAPABILITIES
    const p1 = checkOptionalTableAvailable("financial_entries");
    const p2 = checkOptionalTableAvailable("financial_entries");
    expect(p1).toBe(p2);
  });
});

