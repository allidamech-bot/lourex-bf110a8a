import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import RequestPage from "@/pages/public/RequestPage";
import { fetchRequests } from "@/domain/operations/service";
import type { OperationsRequest } from "@/domain/operations/types";
import { fetchCatalogProductById } from "@/features/products/services/productCatalogService";
import type { ProductCatalogItem } from "@/features/products/types/productTypes";
import { productCatalogItems } from "@/features/products/data/productCatalogData";

const capture = vi.hoisted(() => ({ form: vi.fn(), gate: vi.fn() }));
vi.mock("@/components/layout/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/seo/SEO", () => ({ SEO: () => null }));
vi.mock("@/features/help-center/components/PageHelpBox", () => ({ PageHelpBox: () => null }));
vi.mock("@/domain/operations/service", () => ({ fetchRequests: vi.fn() }));
vi.mock("@/features/products/services/productCatalogService", async importOriginal => {
  const actual = await importOriginal<typeof import("@/features/products/services/productCatalogService")>();
  return { ...actual, fetchCatalogProductById: vi.fn() };
});
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
beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchCatalogProductById).mockResolvedValue(null); });
afterEach(cleanup);

describe("Request page presentation preserves the operational form boundary", () => {
  it("keeps catalog attribution and the form inside the contact gate", async () => {
    mount("/request?source=products&product=sample-cleaning-liquid", "ar");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(await screen.findByTestId("contact-gate")).toHaveTextContent("Existing request form");
    expect(capture.gate).toHaveBeenCalledWith("ar");
    await waitFor(() => expect(capture.form).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "create", sourceProductId: "sample-cleaning-liquid", sourceProduct: null, requestId: undefined }),
    ));
    expect(fetchRequests).not.toHaveBeenCalled();
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    const summaries = document.querySelectorAll("summary");
    expect(summaries).toHaveLength(3);
    fireEvent.click(summaries[0]);
    expect(summaries[0].parentElement).toHaveAttribute("open");
  });

  it("fetches a real published Supabase product and passes it to the operational form", async () => {
    const productId = "a3263f14-f4a1-4a77-bfff-2d54a4c651a9";
    const catalogProduct: ProductCatalogItem = {
      ...productCatalogItems[0],
      id: productId,
      slug: "test-real-product",
      nameEn: "Real B2B Product",
      nameAr: "منتج توريد حقيقي",
      brand: "QA Brand",
      status: "active",
    };
    vi.mocked(fetchCatalogProductById).mockResolvedValue(catalogProduct);
    mount(`/request?source=products&product=${productId}`, "ar");
    await waitFor(() => expect(fetchCatalogProductById).toHaveBeenCalledWith(productId));
    await waitFor(() => expect(capture.form).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "create", sourceProductId: productId, sourceProduct: catalogProduct }),
    ));
    expect(screen.getByText(/منتج توريد حقيقي/)).toBeInTheDocument();
  });

  it("does not resolve an external product when editing an existing customer request", async () => {
    const request = { id: "qa-request", product_name: "Existing brief" } as unknown as OperationsRequest;
    vi.mocked(fetchRequests).mockResolvedValue([request]);
    mount("/request?edit=qa-request&product=a3263f14-f4a1-4a77-bfff-2d54a4c651a9");
    await screen.findByText("Existing request form");
    expect(fetchCatalogProductById).not.toHaveBeenCalled();
    expect(capture.form).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "edit", requestId: "qa-request", initialRequest: request }),
    );
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
