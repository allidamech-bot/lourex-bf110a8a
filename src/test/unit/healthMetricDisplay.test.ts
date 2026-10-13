import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolvePercentage } from "@/lib/metricsDisplay";

describe("R6 data-backed operational score displays", () => {
  it("retains real zero and valid scores", () => {
    expect(resolvePercentage(0)).toBe(0);
    expect(resolvePercentage(100)).toBe(100);
    expect(resolvePercentage(72.5)).toBe(72.5);
  });

  it("never converts missing, invalid, or infinite scores into a plausible number", () => {
    expect(resolvePercentage(null)).toBeNull();
    expect(resolvePercentage(undefined)).toBeNull();
    expect(resolvePercentage(NaN)).toBeNull();
    expect(resolvePercentage(Infinity)).toBeNull();
    expect(resolvePercentage(-2)).toBeNull();
    expect(resolvePercentage(105)).toBeNull();
  });

  it("does not fabricate customer, partner or completion percentages in the overview", () => {
    const overview = readFileSync("src/pages/dashboard/OverviewPage.tsx", "utf8");
    const operations = readFileSync(
      "src/features/operations-intelligence/components/OperationsHealthCenter.tsx", "utf8"
    );
    expect(overview).toContain("customerProfiles[0]?.healthScore ?? null");
    expect(overview).toContain("partnerProfiles[0]?.performanceScore ?? null");
    expect(overview).toContain("completionScore={null}");
    expect(overview).not.toContain("healthScore || 85");
    expect(overview).not.toContain("performanceScore || 90");
    expect(operations).toContain("verifiedCompletionScore === null");
  });
});
