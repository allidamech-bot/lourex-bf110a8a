import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve("supabase/migrations/20261015010000_p0_product_catalog_readiness.sql"),"utf8");
const service = readFileSync(resolve("src/features/products/services/productCatalogService.ts"),"utf8");
const manager = readFileSync(resolve("src/pages/dashboard/ProductsManagementPage.tsx"),"utf8");

describe("P0 real catalog and security rollout",()=>{
  it("introduces real storage with RLS, draft-by-default and no old system tables",()=>{
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.product_catalog_products");
    expect(migration).toContain("status text NOT NULL DEFAULT 'draft'");
    expect(migration).toContain("ALTER TABLE public.product_catalog_products ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("TO anon,authenticated USING (status='active')");
    expect(migration).toContain("ARRAY['owner','operations_employee']");
    expect(migration).not.toMatch(/CREATE TABLE.*public\.(rfqs|orders|quotes|products)\b/i);
  });
  it("does not silently replace empty live catalog data with fake active products",()=>{
    expect(service).not.toContain("if (mapped.length === 0 && !includeInactive)");
    expect(service).not.toContain("return includeInactive ? productCatalogItems : fallbackActiveProducts();");
    expect(service).toContain('return import.meta.env.DEV ? getProductBySlug(slug) : null;');
  });
  it("starts new admin catalog entries unpublished",()=>{
    expect(manager).toMatch(/const emptyForm:[\s\S]*?status: "draft"/);
    expect(service).not.toContain('qualityLevel: product.tagsEn.includes("Demo item")');
    expect(service).toContain('manufacturingCountry: product.originCountry || ""');
  });
});
