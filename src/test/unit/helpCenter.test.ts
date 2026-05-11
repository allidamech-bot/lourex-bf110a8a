import { describe, expect, it } from "vitest";
import { audienceFromRole, resolveHelpContent } from "@/features/help-center/services/helpContentResolver";

describe("help center content resolver", () => {
  it("resolves Arabic accounting education content", () => {
    const content = resolveHelpContent({ pageKey: "accounting", language: "ar", role: "owner" });

    expect(content.title).toContain("المحاسبة");
    expect(content.topics.some((topic) => topic.title.includes("الرصيد"))).toBe(true);
    expect(content.topics.some((topic) => topic.title.includes("قيد"))).toBe(true);
  });

  it("resolves customer page help in Arabic", () => {
    const content = resolveHelpContent({ pageKey: "customer_tracking", language: "ar", role: "customer" });

    expect(content.audience).toBe("customer");
    expect(content.title).toContain("الشحنة");
    expect(content.topics.some((topic) => topic.body.includes("رقم التتبع") || topic.body.includes("مرحلة"))).toBe(true);
  });

  it("resolves partner help for partner roles", () => {
    const content = resolveHelpContent({ pageKey: "partner_settlements", language: "ar", role: "turkey_partner" });

    expect(audienceFromRole("turkey_partner")).toBe("partner");
    expect(content.audience).toBe("partner");
    expect(content.topics.some((topic) => topic.title.includes("المبالغ المستحقة"))).toBe(true);
  });

  it("falls back to admin Arabic help for internal pages", () => {
    const content = resolveHelpContent({ pageKey: "dashboard_overview", language: "ar", role: "operations_employee" });

    expect(content.audience).toBe("admin");
    expect(content.summary).toContain("الشحنات");
  });

  it("provides English fallback content when no page-specific English copy exists", () => {
    const content = resolveHelpContent({ pageKey: "deals", language: "en", role: "owner" });

    expect(content.title).toBe("How do I use this page?");
    expect(content.topics.length).toBeGreaterThan(0);
  });
});
