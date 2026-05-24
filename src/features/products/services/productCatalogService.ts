import { productCatalogCategories, productCatalogItems } from "@/features/products/data/productCatalogData";
import type { ProductCatalogItem, ProductRequestPrefill } from "@/features/products/types/productTypes";

export const listProductCategories = () => productCatalogCategories;

export const listActiveProducts = () =>
  productCatalogItems
    .filter((product) => product.status === "active")
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.nameEn.localeCompare(b.nameEn));

export const getProductBySlug = (slug: string) =>
  listActiveProducts().find((product) => product.slug === slug) || null;

export const getProductById = (id: string) =>
  listActiveProducts().find((product) => product.id === id) || null;

export const getCategoryById = (id: string) =>
  productCatalogCategories.find((category) => category.id === id) || null;

export const filterProducts = ({
  query,
  categoryId,
}: {
  query?: string;
  categoryId?: string;
}) => {
  const normalizedQuery = query?.trim().toLowerCase() || "";

  return listActiveProducts().filter((product) => {
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
