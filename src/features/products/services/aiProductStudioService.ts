import { supabase } from "@/integrations/supabase/client";
import type { ProductCatalogAdminInput } from "@/features/products/services/productCatalogService";

export type ProductStudioSuggestion = Pick<ProductCatalogAdminInput,
  | "nameAr" | "nameEn" | "shortDescriptionAr" | "shortDescriptionEn"
  | "descriptionAr" | "descriptionEn" | "categoryId"
  | "imageAltAr" | "imageAltEn" | "tagsAr" | "tagsEn"
>;

const ALLOWED_CATEGORIES = new Set(["food-fmcg", "cleaning-household", "cosmetics-care", "packaging-supplies"]);
const PROJECT_IMAGE_URL = /^https:\/\/gxmqchznfolerliorpkz\.supabase\.co\/storage\/v1\/object\/public\/product-images\//;

export const canAnalyzeProductImage = (imageUrl: string): boolean =>
  PROJECT_IMAGE_URL.test(imageUrl.trim());

const cleanText = (value: unknown, max = 1600) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export const validateProductStudioSuggestion = (raw: unknown): ProductStudioSuggestion => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("AI returned an invalid product draft");
  const item = raw as Record<string, unknown>;
  const nameAr = cleanText(item.nameAr, 140);
  const nameEn = cleanText(item.nameEn, 140);
  if (!nameAr || !nameEn) throw new Error("AI did not generate both Arabic and English names");
  return {
    nameAr,
    nameEn,
    shortDescriptionAr: cleanText(item.shortDescriptionAr, 250),
    shortDescriptionEn: cleanText(item.shortDescriptionEn, 250),
    descriptionAr: cleanText(item.descriptionAr),
    descriptionEn: cleanText(item.descriptionEn),
    categoryId: ALLOWED_CATEGORIES.has(item.categoryId as string) ? item.categoryId as string : "",
    imageAltAr: cleanText(item.imageAltAr, 140),
    imageAltEn: cleanText(item.imageAltEn, 140),
    tagsAr: Array.isArray(item.tagsAr) ? item.tagsAr.filter(x => typeof x === "string").slice(0, 6).map(x => cleanText(x, 60)).filter(Boolean) : [],
    tagsEn: Array.isArray(item.tagsEn) ? item.tagsEn.filter(x => typeof x === "string").slice(0, 6).map(x => cleanText(x, 60)).filter(Boolean) : [],
  };
};

// Suggestions never include or change MOQ, origin, prices, publication status, etc.
export const applyProductStudioSuggestion = (
  current: ProductCatalogAdminInput,
  suggestion: ProductStudioSuggestion,
): ProductCatalogAdminInput => ({
  ...current,
  ...suggestion,
  categoryId: suggestion.categoryId || current.categoryId,
  status: current.status,
  isFeatured: current.isFeatured,
});

export const generateProductStudioSuggestion = async (
  current: ProductCatalogAdminInput,
  notes: string,
): Promise<ProductStudioSuggestion> => {
  if (!notes.trim() && !current.nameEn.trim() && !current.nameAr.trim() && !canAnalyzeProductImage(current.imageUrl || "")) {
    throw new Error("Add a product photo, name or notes before generating a draft");
  }
  const { data, error } = await supabase.functions.invoke("lourex-product-studio", {
    body: {
      notes: notes.trim().slice(0, 2400),
      imageUrl: canAnalyzeProductImage(current.imageUrl || "") ? current.imageUrl : "",
      hints: {
        nameAr: current.nameAr,
        nameEn: current.nameEn,
        categoryId: current.categoryId,
        originCountry: current.originCountry,
        brand: current.brand,
        moq: current.moq,
        unit: current.unit,
        packaging: current.packaging,
        technicalSpecs: current.technicalSpecs,
      },
    },
  });
  if (error) {
    // FunctionsHttpError exposes the response for useful 4xx/5xx hints.
    const response = "context" in error ? (error as { context?: Response }).context : null;
    const body = response && typeof response.json === "function"
      ? await response.json().catch(() => null) as { error?: string } | null
      : null;
    throw new Error(body?.error || "Product Studio is unavailable. Verify AI configuration and access.");
  }
  return validateProductStudioSuggestion((data as { suggestion?: unknown } | null)?.suggestion);
};
