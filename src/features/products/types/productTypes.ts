export type ProductCatalogStatus = "active" | "draft" | "archived";

export type ProductCatalogImage = {
  url: string;
  altAr: string;
  altEn: string;
};

export type ProductCatalogItem = {
  id: string;
  slug: string;
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
  status: ProductCatalogStatus;
  isFeatured: boolean;
  images: ProductCatalogImage[];
  tagsAr: string[];
  tagsEn: string[];
  createdAt: string;
  updatedAt: string;
};

export type ProductCatalogCategory = {
  id: string;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
};

export type ProductRequestPrefill = {
  productName: string;
  productDescription: string;
  brand: string;
  manufacturingCountry: string;
  material: string;
  technicalSpecs: string;
  weight: string;
  sizeDimensions: string;
  qualityLevel: string;
  referenceLink: string;
  deliveryNotes: string;
};
