import { productCatalogCategories, productCatalogItems } from "@/features/products/data/productCatalogData";
import type { ProductCatalogItem, ProductRequestPrefill } from "@/features/products/types/productTypes";
import { isOptionalBackendUnavailable, supabase, isTableUnavailable, markTableUnavailable } from "@/integrations/supabase/client";
import type { LooseDomainClient } from "@/lib/operationsDomain";

const productDb = supabase as unknown as LooseDomainClient;

type ProductCatalogProductRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  short_description_ar: string;
  short_description_en: string;
  description_ar: string;
  description_en: string;
  category_id: string;
  origin_country: string;
  brand: string | null;
  moq: string | null;
  unit: string | null;
  packaging: string | null;
  weight: string | null;
  dimensions: string | null;
  material: string | null;
  technical_specs: string | null;
  price_note_ar: string | null;
  price_note_en: string | null;
  status: "active" | "draft" | "archived";
  is_featured: boolean;
  image_url: string | null;
  image_alt_ar: string | null;
  image_alt_en: string | null;
  tags_ar: string[] | null;
  tags_en: string[] | null;
  created_at: string;
  updated_at: string;
};

export type ProductCatalogAdminInput = {
  slug?: string;
  nameAr: string;
  nameEn: string;
  shortDescriptionAr: string;
  shortDescriptionEn: string;
  descriptionAr: string;
  descriptionEn: string;
  categoryId: string;
  originCountry: string;
  brand?: string;
  moq?: string;
  unit?: string;
  packaging?: string;
  weight?: string;
  dimensions?: string;
  material?: string;
  technicalSpecs?: string;
  priceNoteAr?: string;
  priceNoteEn?: string;
  status: "active" | "draft" | "archived";
  isFeatured: boolean;
  imageUrl?: string;
  imageAltAr?: string;
  imageAltEn?: string;
  tagsAr?: string[];
  tagsEn?: string[];
};

const PRODUCT_SELECT = "id, slug, name_ar, name_en, short_description_ar, short_description_en, description_ar, description_en, category_id, origin_country, brand, moq, unit, packaging, weight, dimensions, material, technical_specs, price_note_ar, price_note_en, status, is_featured, image_url, image_alt_ar, image_alt_en, tags_ar, tags_en, created_at, updated_at";

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

export const createProductSlug = (name: string) => {
  const slug = normalizeSlug(name);
  return slug || `product-${Date.now()}`;
};

const toTextArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

const mapProductRow = (row: ProductCatalogProductRow): ProductCatalogItem => ({
  id: row.id,
  slug: row.slug,
  nameAr: row.name_ar || "",
  nameEn: row.name_en || "",
  shortDescriptionAr: row.short_description_ar || "",
  shortDescriptionEn: row.short_description_en || "",
  descriptionAr: row.description_ar || "",
  descriptionEn: row.description_en || "",
  categoryId: row.category_id || "food-fmcg",
  originCountry: row.origin_country || "Turkey",
  brand: row.brand || "",
  moq: row.moq || "",
  unit: row.unit || "",
  packaging: row.packaging || "",
  weight: row.weight || "",
  dimensions: row.dimensions || "",
  material: row.material || "",
  technicalSpecs: row.technical_specs || "",
  priceNoteAr: row.price_note_ar || "",
  priceNoteEn: row.price_note_en || "",
  status: row.status || "active",
  isFeatured: Boolean(row.is_featured),
  images: row.image_url
    ? [
        {
          url: row.image_url,
          altAr: row.image_alt_ar || row.name_ar || "صورة منتج",
          altEn: row.image_alt_en || row.name_en || "Product image",
        },
      ]
    : [],
  tagsAr: toTextArray(row.tags_ar),
  tagsEn: toTextArray(row.tags_en),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAdminInput = (input: ProductCatalogAdminInput) => ({
  slug: createProductSlug(input.slug || input.nameEn || input.nameAr),
  name_ar: input.nameAr.trim(),
  name_en: input.nameEn.trim(),
  short_description_ar: input.shortDescriptionAr.trim(),
  short_description_en: input.shortDescriptionEn.trim(),
  description_ar: input.descriptionAr.trim(),
  description_en: input.descriptionEn.trim(),
  category_id: input.categoryId || "food-fmcg",
  origin_country: input.originCountry.trim() || "Turkey",
  brand: input.brand?.trim() || "",
  moq: input.moq?.trim() || "",
  unit: input.unit?.trim() || "",
  packaging: input.packaging?.trim() || "",
  weight: input.weight?.trim() || "",
  dimensions: input.dimensions?.trim() || "",
  material: input.material?.trim() || "",
  technical_specs: input.technicalSpecs?.trim() || "",
  price_note_ar: input.priceNoteAr?.trim() || "",
  price_note_en: input.priceNoteEn?.trim() || "",
  status: input.status,
  is_featured: input.isFeatured,
  image_url: input.imageUrl?.trim() || "",
  image_alt_ar: input.imageAltAr?.trim() || input.nameAr.trim(),
  image_alt_en: input.imageAltEn?.trim() || input.nameEn.trim(),
  tags_ar: input.tagsAr || [],
  tags_en: input.tagsEn || [],
});

const fallbackActiveProducts = () =>
  productCatalogItems
    .filter((product) => product.status === "active")
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.nameEn.localeCompare(b.nameEn));

export const listProductCategories = () => productCatalogCategories;

export const listActiveProducts = () => fallbackActiveProducts();

export const fetchCatalogProducts = async ({ includeInactive = false } = {}) => {
  try {
    if (isTableUnavailable("product_catalog_products")) {
      return includeInactive ? productCatalogItems : fallbackActiveProducts();
    }
    let query = productDb.from("product_catalog_products").select(PRODUCT_SELECT).order("is_featured", { ascending: false }).order("updated_at", { ascending: false });

    if (!includeInactive) {
      query = query.eq("status", "active");
    }

    const { data, error } = await query;

    if (error) {
      if (isOptionalBackendUnavailable(error)) {
        markTableUnavailable("product_catalog_products");
        return includeInactive ? productCatalogItems : fallbackActiveProducts();
      }
      throw error;
    }

    const mapped = ((data || []) as ProductCatalogProductRow[]).map(mapProductRow);

    if (mapped.length === 0 && !includeInactive) {
      return fallbackActiveProducts();
    }

    return mapped;
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      markTableUnavailable("product_catalog_products");
      return includeInactive ? productCatalogItems : fallbackActiveProducts();
    }
    throw error;
  }
};

export const fetchCatalogProductBySlug = async (slug: string) => {
  try {
    if (isTableUnavailable("product_catalog_products")) {
      return getProductBySlug(slug);
    }
    const { data, error } = await productDb
      .from("product_catalog_products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      if (isOptionalBackendUnavailable(error)) {
        markTableUnavailable("product_catalog_products");
        return getProductBySlug(slug);
      }
      throw error;
    }

    return data ? mapProductRow(data as ProductCatalogProductRow) : getProductBySlug(slug);
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      markTableUnavailable("product_catalog_products");
      return getProductBySlug(slug);
    }
    throw error;
  }
};

export const createCatalogProduct = async (input: ProductCatalogAdminInput) => {
  const payload = mapAdminInput(input);
  const { data, error } = await productDb
    .from("product_catalog_products")
    .insert(payload)
    .select(PRODUCT_SELECT)
    .single();

  if (error) throw error;
  return mapProductRow(data as ProductCatalogProductRow);
};

export const updateCatalogProduct = async (id: string, input: ProductCatalogAdminInput) => {
  const payload = mapAdminInput(input);
  const { data, error } = await productDb
    .from("product_catalog_products")
    .update(payload)
    .eq("id", id)
    .select(PRODUCT_SELECT)
    .single();

  if (error) throw error;
  return mapProductRow(data as ProductCatalogProductRow);
};

export const getProductBySlug = (slug: string) =>
  fallbackActiveProducts().find((product) => product.slug === slug) || null;

export const getProductById = (id: string) =>
  fallbackActiveProducts().find((product) => product.id === id) || null;

export const getCategoryById = (id: string) =>
  productCatalogCategories.find((category) => category.id === id) || null;

export const filterProductList = ({
  products,
  query,
  categoryId,
}: {
  products: ProductCatalogItem[];
  query?: string;
  categoryId?: string;
}) => {
  const normalizedQuery = query?.trim().toLowerCase() || "";

  return products.filter((product) => {
    const matchesCategory = !categoryId || categoryId === "all" || product.categoryId === categoryId;
    const searchable = [
      product.nameAr,
      product.nameEn,
      product.shortDescriptionAr,
      product.shortDescriptionEn,
      product.descriptionAr,
      product.descriptionEn,
      product.originCountry,
      product.brand,
      product.material,
      product.technicalSpecs,
      ...product.tagsAr,
      ...product.tagsEn,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
};

export const filterProducts = ({
  query,
  categoryId,
}: {
  query?: string;
  categoryId?: string;
}) => filterProductList({ products: fallbackActiveProducts(), query, categoryId });

export const buildProductRequestPrefill = (
  product: ProductCatalogItem,
  language: "ar" | "en" = "en",
): ProductRequestPrefill => {
  const isArabic = language === "ar";
  const name = isArabic ? product.nameAr : product.nameEn;
  const description = isArabic ? product.descriptionAr : product.descriptionEn;
  const shortDescription = isArabic ? product.shortDescriptionAr : product.shortDescriptionEn;
  const priceNote = isArabic ? product.priceNoteAr : product.priceNoteEn;

  return {
    productName: name,
    productDescription: [description, shortDescription].filter(Boolean).join("\n\n"),
    brand: product.brand || "",
    manufacturingCountry: product.originCountry || "Turkey",
    material: product.material || "",
    technicalSpecs: [product.technicalSpecs, product.packaging ? `Packaging: ${product.packaging}` : "", priceNote].filter(Boolean).join("\n"),
    weight: product.weight || "",
    sizeDimensions: product.dimensions || "",
    qualityLevel: product.tagsEn.includes("Demo item") ? "" : "Commercial sourcing quality",
    referenceLink: typeof window !== "undefined" ? `${window.location.origin}/products/${product.slug}` : `/products/${product.slug}`,
    deliveryNotes: isArabic
      ? `طلب مبدئي من كتالوج Lourex للمنتج: ${product.nameAr}. يرجى مراجعة الكمية والسعر والشحن حسب التوفر.`
      : `Initial request from Lourex catalog for: ${product.nameEn}. Please review quantity, pricing, and shipping based on availability.`,
  };
};
