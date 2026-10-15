import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import SmartRfqPage from "@/pages/public/SmartRfqPage";
import { fetchCatalogProductById, fetchCatalogProducts } from "@/features/products/services/productCatalogService";
import { productCatalogItems } from "@/features/products/data/productCatalogData";
import { submitSmartRfq, readSmartRfqDraft } from "@/features/smart-rfq/smartRfqService";
import type { ProductCatalogItem } from "@/features/products/types/productTypes";

const auth = vi.hoisted(() => ({ role: "customer", signedIn: true }));
const productId = "1a2b3c4d-1234-4123-8123-123456789abc";
const product: ProductCatalogItem = {
  ...productCatalogItems[0],
  id: productId,
  status: "active",
  nameAr: "زيت دوار الشمس",
  nameEn: "Sunflower oil",
  slug: "sunflower-oil",
  unit: "cartons",
  moq: "100 cartons",
  images: [],
};
vi.mock("@/components/layout/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/seo/SEO", () => ({ SEO: () => null }));
vi.mock("@/features/auth/AuthSessionProvider", () => ({
  useAuthSession: () => ({
    user: auth.signedIn ? { id: "b3263f14-f4a1-4a77-bfff-2d54a4c651a9", email: "qa@example.test" } : null,
    profile: auth.signedIn ? { role: auth.role, status: "active", fullName: "QA Customer" } : null,
    loading: false,
  }),
}));
vi.mock("@/features/purchase-requests/components/RequestContactGate", () => ({
  RequestContactGate: ({ children }: { children: React.ReactNode }) => <div data-testid="contact-gate">{children}</div>,
}));
vi.mock("@/features/products/services/productCatalogService", async orig => {
  const actual = await orig<typeof import("@/features/products/services/productCatalogService")>();
  return { ...actual, fetchCatalogProducts: vi.fn(), fetchCatalogProductById: vi.fn() };
});
vi.mock("@/features/smart-rfq/smartRfqService", async orig => {
  const actual = await orig<typeof import("@/features/smart-rfq/smartRfqService")>();
  return { ...actual, submitSmartRfq: vi.fn() };
});

const mount = (url: string, lang: "ar" | "en" = "en") => {
  localStorage.setItem("lourex-lang", lang);
  return render(
    <MemoryRouter initialEntries={[url]}>
      <I18nProvider><SmartRfqPage /></I18nProvider>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  auth.role = "customer";
  auth.signedIn = true;
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.mocked(fetchCatalogProducts).mockResolvedValue([product]);
  vi.mocked(fetchCatalogProductById).mockResolvedValue(product);
  vi.mocked(submitSmartRfq).mockResolvedValue({
    requestId: "a3263f14-f4a1-4a77-bfff-2d54a4c651a9",
    requestNumber: "RFQ-2026-TEST", trackingCode: "TRX-TEST",
  });
});
afterEach(cleanup);

describe("Smart RFQ end-user interface", () => {
  it("adds a real published catalog product and preserves it in local draft", async () => {
    mount("/smart-rfq?add=" + productId);
    expect(await screen.findByText("Sunflower oil")).toBeInTheDocument();
    await waitFor(() => expect(readSmartRfqDraft()).toEqual([
      expect.objectContaining({ catalogProductId: productId, quantity: "100" }),
    ]));
    expect(screen.getByText("Published MOQ: 100 cartons")).toBeInTheDocument();
    expect(screen.getByTestId("contact-gate")).toBeInTheDocument();
    expect(screen.getByText(/No public prices: our team prepares a tailored quotation/i)).toBeInTheDocument();
  });

  it("adds an available catalog item using the in-page picker with the right MOQ", async () => {
    mount("/smart-rfq");
    const picker = await screen.findByLabelText("Add a catalog product directly");
    fireEvent.change(picker, { target: { value: productId } });
    expect(await screen.findByText("Published MOQ: 100 cartons")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Quantity/i)).toHaveValue(100);
    await waitFor(() => expect(readSmartRfqDraft()).toEqual([
      expect.objectContaining({ catalogProductId: productId, quantity: "100" }),
    ]));
    expect(picker.querySelector('option[value="' + productId + '"]')).toBeDisabled();
  });

  it("collects a custom item with quantities, shipping terms and submits one canonical RFQ", async () => {
    mount("/smart-rfq");
    await screen.findByRole("button", { name: /Custom product/i });
    fireEvent.click(screen.getByRole("button", { name: /Custom product/i }));
    fireEvent.change(screen.getByLabelText(/Product name/i), { target: { value: "Private label biscuits" } });
    fireEvent.change(screen.getByLabelText(/^Quantity/i), { target: { value: "250" } });
    fireEvent.change(screen.getByLabelText(/Destination \/ country/i), { target: { value: "Jeddah" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Smart RFQ/ }));
    await waitFor(() => expect(submitSmartRfq).toHaveBeenCalledWith(
      [expect.objectContaining({ catalogProductId: null, productName: "Private label biscuits", quantity: "250" })],
      "Jeddah", "", "", "", expect.objectContaining({ name: "QA Customer" }), [],
    ));
    expect(await screen.findByText("RFQ-2026-TEST")).toBeInTheDocument();
    expect(readSmartRfqDraft()).toEqual([]);
    expect(screen.getByRole("link", { name: /View my request/i })).toHaveAttribute("href", "/customer-portal/requests?request=a3263f14-f4a1-4a77-bfff-2d54a4c651a9");
  });

  it("blocks submitting an empty basket or submitting as a noncustomer", async () => {
    const { unmount } = mount("/smart-rfq");
    expect(screen.getByRole("button", { name: /Submit Smart RFQ/ })).toBeDisabled();
    unmount();
    auth.role = "owner";
    mount("/smart-rfq");
    fireEvent.click(screen.getByRole("button", { name: /Custom product/i }));
    expect(screen.getByRole("button", { name: /Submit Smart RFQ/ })).toBeDisabled();
    expect(submitSmartRfq).not.toHaveBeenCalled();
  });

  it("keeps Arabic labels and stays RTL for a customer RFQ", async () => {
    mount("/smart-rfq", "ar");
    expect(await screen.findByRole("heading", { name: /منتجات متعددة/ })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("button", { name: /منتج غير موجود/ })).toBeInTheDocument();
  });
});
