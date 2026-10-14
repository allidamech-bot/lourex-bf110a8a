import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import ProductsPage from "@/pages/public/ProductsPage";
import { productCatalogItems } from "@/features/products/data/productCatalogData";
import type { ProductCatalogItem } from "@/features/products/types/productTypes";
import { fetchCatalogProducts } from "@/features/products/services/productCatalogService";

vi.mock("@/components/layout/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/seo/SEO", () => ({ SEO: () => null }));
vi.mock("@/features/products/services/productCatalogService", async importOriginal => {
  const actual = await importOriginal<typeof import("@/features/products/services/productCatalogService")>();
  return { ...actual, fetchCatalogProducts: vi.fn() };
});
const cleaning = productCatalogItems[0];
const food: ProductCatalogItem = {
  ...cleaning, id: "qa-food", slug: "qa-food", nameEn: "QA Food Fixture", nameAr: "عنصر غذائي للاختبار",
  categoryId: "food-fmcg", tagsEn: [], tagsAr: [], isFeatured: false,
};
const mount = (lang = "en") => {
  localStorage.setItem("lourex-lang", lang);
  return render(<MemoryRouter><I18nProvider><ProductsPage /></I18nProvider></MemoryRouter>);
};
beforeEach(() => vi.mocked(fetchCatalogProducts).mockReset());
afterEach(cleanup);

describe("LOUREX catalog presentation and preserved sourcing links", () => {
  it("keeps search, sector buttons, native select and reset synchronized", async () => {
    vi.mocked(fetchCatalogProducts).mockResolvedValue([cleaning, food]);
    const { container } = mount();
    await screen.findByText(food.nameEn);
    expect(container.querySelectorAll("[data-product-id]")).toHaveLength(2);
    const select = screen.getByRole("combobox");
    fireEvent.click(screen.getByRole("button", { name: /Food & FMCG/ }));
    expect(select).toHaveValue("food-fmcg");
    expect(container.querySelectorAll("[data-product-id]")).toHaveLength(1);
    fireEvent.change(select, { target: { value: "cleaning-household" } });
    expect(screen.getByRole("button", { name: /Cleaning & Household/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(cleaning.nameEn)).toBeInTheDocument();
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "no-match-qa-123" } });
    expect(container.querySelectorAll("[data-product-id]")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(container.querySelectorAll("[data-product-id]")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(select).toHaveValue("all");
    expect(input).toHaveValue("");
    expect(container.querySelectorAll("[data-product-id]")).toHaveLength(2);
    const card = container.querySelector(`[data-product-id="${cleaning.id}"]`)!;
    expect(card.querySelector(`a[href="/products/${cleaning.slug}"]`)).toBeTruthy();
    expect(card.querySelector(`a[href="/request?source=products&product=${cleaning.id}"]`)).toBeTruthy();
    expect(card.querySelector('img[src="/logo.png"]')).toBeNull();
    expect(screen.getAllByText("Product image unavailable")).toHaveLength(2);
  });

  it("handles a failed catalog read and retries without changing the service", async () => {
    vi.mocked(fetchCatalogProducts).mockRejectedValueOnce(new Error("Temporary read failure")).mockResolvedValueOnce([cleaning]);
    const { container } = mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("The catalog could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText(cleaning.nameEn);
    await waitFor(() => expect(fetchCatalogProducts).toHaveBeenCalledTimes(2));
    expect(container.querySelectorAll("[data-product-id]")).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the Arabic experience with RTL and the same product request target", async () => {
    vi.mocked(fetchCatalogProducts).mockResolvedValue([cleaning]);
    const { container } = mount("ar");
    await screen.findByText(cleaning.nameAr);
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("منتجك القادم.");
    expect(container.querySelector(`a[href="/request?source=products&product=${cleaning.id}"]`)).toBeTruthy();
  });
});
