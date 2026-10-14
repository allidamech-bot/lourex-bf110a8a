import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import RequestPage from "@/pages/public/RequestPage";
import { fetchRequests } from "@/domain/operations/service";
import type { OperationsRequest } from "@/domain/operations/types";

const capture = vi.hoisted(() => ({ form: vi.fn(), gate: vi.fn() }));
vi.mock("@/components/layout/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/seo/SEO", () => ({ SEO: () => null }));
vi.mock("@/features/help-center/components/PageHelpBox", () => ({ PageHelpBox: () => null }));
vi.mock("@/domain/operations/service", () => ({ fetchRequests: vi.fn() }));
vi.mock("@/features/purchase-requests/components/RequestContactGate", () => ({
  RequestContactGate: ({ children, lang }: { children: React.ReactNode; lang: string }) => {
    capture.gate(lang); return <div data-testid="contact-gate">{children}</div>;
  },
}));
vi.mock("@/features/purchase-requests/components/PurchaseRequestForm", () => ({
  PurchaseRequestForm: (props: Record<string, unknown>) => { capture.form(props); return <div>Existing request form</div>; },
}));
const mount = (url: string, lang = "en") => {
  localStorage.setItem("lourex-lang", lang);
  return render(<MemoryRouter initialEntries={[url]}><I18nProvider><RequestPage /></I18nProvider></MemoryRouter>);
};
beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

describe("Request page presentation preserves the operational form boundary", () => {
  it("keeps catalog attribution and the form inside the contact gate", async () => {
    mount("/request?source=products&product=sample-cleaning-liquid", "ar");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId("contact-gate")).toHaveTextContent("Existing request form");
    expect(capture.gate).toHaveBeenCalledWith("ar");
    expect(capture.form).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "create", sourceProductId: "sample-cleaning-liquid", requestId: undefined }));
    expect(fetchRequests).not.toHaveBeenCalled();
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    const summaries = document.querySelectorAll("summary");
    expect(summaries).toHaveLength(3);
    fireEvent.click(summaries[0]);
    expect(summaries[0].parentElement).toHaveAttribute("open");
  });

  it("loads an existing edit request and forwards it without replacing its data", async () => {
    const request = { id: "qa-request", product_name: "Existing brief" } as unknown as OperationsRequest;
    vi.mocked(fetchRequests).mockResolvedValue([request]);
    mount("/request?edit=qa-request");
    await screen.findByText("Existing request form");
    expect(capture.form).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "edit", requestId: "qa-request", initialRequest: request, onEditSuccess: expect.any(Function) }));
  });

  it("does not mount an editable form for a missing request", async () => {
    vi.mocked(fetchRequests).mockResolvedValue([]);
    mount("/request?edit=missing");
    await waitFor(() => expect(fetchRequests).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("The request could not be found.")).toBeInTheDocument();
    expect(screen.queryByText("Existing request form")).not.toBeInTheDocument();
    expect(capture.form).not.toHaveBeenCalled();
  });
});
