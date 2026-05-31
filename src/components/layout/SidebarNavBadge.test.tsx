import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SidebarNavBadge } from "./SidebarNavBadge";

// Mock the i18n hook
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({ lang: "en" }),
}));

describe("SidebarNavBadge", () => {
  it("renders null for count 0 and no dot severity", () => {
    const { container } = render(<SidebarNavBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders number for count 5", () => {
    const { getByText } = render(<SidebarNavBadge count={5} />);
    expect(getByText("5")).toBeInTheDocument();
  });

  it("renders 99+ for count over 99", () => {
    const { getByText } = render(<SidebarNavBadge count={120} />);
    expect(getByText("99+")).toBeInTheDocument();
  });

  it("renders dot for severity without count", () => {
    const { container } = render(<SidebarNavBadge severity="warning" />);
    // When showing just a dot, it shouldn't render any text content, but it should render an element
    expect(container.firstChild).not.toBeNull();
    expect(container.firstChild).toHaveClass("h-2 w-2 rounded-full");
    expect(container.firstChild).toHaveClass("bg-orange-500");
  });

  it("applies critical pulse when pulse true", () => {
    const { container } = render(<SidebarNavBadge count={5} severity="info" pulse={true} />);
    // Pulse adds an absolute inner element with animate-pulse
    const pulseElement = container.querySelector(".animate-pulse");
    expect(pulseElement).toBeInTheDocument();
  });
  
  it("applies critical pulse automatically when severity is critical", () => {
    const { container } = render(<SidebarNavBadge count={3} severity="critical" />);
    const pulseElement = container.querySelector(".animate-pulse");
    expect(pulseElement).toBeInTheDocument();
  });
});
