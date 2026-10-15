import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerLayout } from "@/components/layout/CustomerLayout";

const view = vi.hoisted(() => ({ lang: "en" as "en" | "ar" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: view.lang }) }));
vi.mock("@/lib/siteExperience", () => ({ FLOATING_AI_ENABLED: false }));
vi.mock("@/components/layout/SiteHeader", () => ({ SiteHeader: () => null }));

const mount = () => render(
  <MemoryRouter initialEntries={["/customer-portal/requests"]}>
    <Routes>
      <Route path="/customer-portal" element={<CustomerLayout />}>
        <Route path="requests" element={<p>Request details</p>} />
      </Route>
    </Routes>
  </MemoryRouter>,
);

afterEach(cleanup);

describe("Customer portal mobile navigation", () => {
  it.each([
    ["en", "Customer portal navigation", ["Overview", "Operations", "My requests", "Tracking", "Notifications"]],
    ["ar", "تنقل بوابة العميل", ["الرئيسية", "مركز العمليات", "طلباتي", "التتبع", "الإشعارات"]],
  ] as const)("keeps every %s tab in one unbroken horizontal scroll row", (lang, label, linkNames) => {
    view.lang = lang;
    mount();
    const nav = screen.getByRole("navigation", { name: label });
    expect(nav).toHaveClass("overflow-x-auto", "flex-nowrap", "min-w-0");
    for (const linkName of linkNames) {
      const link = within(nav).getByRole("link", { name: linkName });
      expect(link).toHaveClass("flex-none", "shrink-0", "whitespace-nowrap");
      const text = within(link).getByText(linkName);
      expect(text).toHaveStyle({ whiteSpace: "nowrap", wordBreak: "keep-all" });
    }
    expect(within(nav).getByRole("link", { name: lang === "ar" ? "طلباتي" : "My requests" })).toHaveAttribute("aria-current", "page");
  });
});
