import { describe, expect, it } from "vitest";
import {
  applyProductStudioSuggestion,
  canAnalyzeProductImage,
  validateProductStudioSuggestion,
} from "@/features/products/services/aiProductStudioService";
import type { ProductCatalogAdminInput } from "@/features/products/services/productCatalogService";

describe("AI Product Studio guarded drafting", () => {
  const proposal = {
    nameAr: "بسكويت محشو", nameEn: "Filled biscuits",
    shortDescriptionAr: "بسكويت مناسب للتوريد", shortDescriptionEn: "Biscuits for sourcing",
    descriptionAr: "وصف عربي", descriptionEn: "English description",
    categoryId: "food-fmcg",
    imageAltAr: "صورة عبوة", imageAltEn: "Product pack",
    tagsAr: ["بسكويت"], tagsEn: ["Biscuits"],
    moq: "999 pallets", status: "active", originCountry: "Unknown",
  };

  it("accepts bilingual draft text without trusting extra commercial fields", () => {
    const draft = validateProductStudioSuggestion(proposal);
    expect(draft.nameAr).toBe("بسكويت محشو");
    expect(draft.nameEn).toBe("Filled biscuits");
    expect(draft).not.toHaveProperty("moq");
    expect(draft).not.toHaveProperty("status");
    expect(draft).not.toHaveProperty("originCountry");
    expect(draft).not.toHaveProperty("priceNoteEn");
  });

  it("never changes human-entered MOQ, origin, prices, status or featured flag", () => {
    const original = {
      nameAr: "", nameEn: "", moq: "100 cartons",
      originCountry: "Turkey", brand: "Verified brand",
      status: "draft", isFeatured: false,
      priceNoteEn: "Ask for quotation",
      technicalSpecs: "Certified by supplier", categoryId: "packaging-supplies",
      imageUrl: "https://example.com/existing.png",
    } as ProductCatalogAdminInput;
    const filled = applyProductStudioSuggestion(original, validateProductStudioSuggestion(proposal));
    expect(filled.nameEn).toBe("Filled biscuits");
    expect(filled.moq).toBe("100 cartons");
    expect(filled.originCountry).toBe("Turkey");
    expect(filled.brand).toBe("Verified brand");
    expect(filled.priceNoteEn).toBe("Ask for quotation");
    expect(filled.status).toBe("draft");
    expect(filled.isFeatured).toBe(false);
    expect(filled.technicalSpecs).toBe("Certified by supplier");
    expect(filled.imageUrl).toBe(original.imageUrl);
  });

  it("rejects invalid response and category without overriding editor choice", () => {
    expect(() => validateProductStudioSuggestion({ nameAr: "", nameEn: "Only English" })).toThrow();
    const draft = validateProductStudioSuggestion({ nameAr: "منتج", nameEn: "Product", categoryId: "malicious" });
    expect(draft.categoryId).toBe("");
    const original = { categoryId: "cleaning-household", status: "draft" } as ProductCatalogAdminInput;
    expect(applyProductStudioSuggestion(original, draft).categoryId).toBe("cleaning-household");
  });

  it("uses uploaded LOUREX catalog images, never arbitrary external URLs", () => {
    expect(canAnalyzeProductImage("https://gxmqchznfolerliorpkz.supabase.co/storage/v1/object/public/product-images/catalog/box/a.webp")).toBe(true);
    expect(canAnalyzeProductImage("https://evil.test/photo.png")).toBe(false);
    expect(canAnalyzeProductImage("https://gxmqchznfolerliorpkz.supabase.co.evil.test/storage/v1/object/public/product-images/x.jpg")).toBe(false);
    expect(canAnalyzeProductImage("")).toBe(false);
  });
});
