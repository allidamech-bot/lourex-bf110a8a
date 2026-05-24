import type { ProductCatalogCategory, ProductCatalogItem } from "@/features/products/types/productTypes";

export const productCatalogCategories: ProductCatalogCategory[] = [
  {
    id: "food-fmcg",
    labelAr: "أغذية ومواد استهلاكية",
    labelEn: "Food & FMCG",
    descriptionAr: "منتجات غذائية واستهلاكية تركية قابلة للتوريد حسب الكمية والمواصفات.",
    descriptionEn: "Turkish food and fast-moving consumer goods available for sourcing by quantity and specification.",
  },
  {
    id: "cleaning-household",
    labelAr: "منظفات ومنتجات منزلية",
    labelEn: "Cleaning & Household",
    descriptionAr: "منتجات تنظيف وعناية منزلية مناسبة للطلبات التجارية والتوزيع.",
    descriptionEn: "Cleaning and household products suitable for commercial sourcing and distribution.",
  },
  {
    id: "cosmetics-care",
    labelAr: "تجميل وعناية",
    labelEn: "Cosmetics & Care",
    descriptionAr: "منتجات عناية شخصية وتجميل تحتاج مراجعة مواصفات وملصقات قبل التوريد.",
    descriptionEn: "Personal care and cosmetics that need specification and label review before sourcing.",
  },
  {
    id: "packaging-supplies",
    labelAr: "تغليف ومستلزمات",
    labelEn: "Packaging & Supplies",
    descriptionAr: "مواد تغليف ومستلزمات تشغيلية قابلة للتخصيص حسب المقاس والخامة والطباعة.",
    descriptionEn: "Packaging and operational supplies configurable by size, material, and print requirements.",
  },
];

export const productCatalogItems: ProductCatalogItem[] = [
  {
    id: "sample-cleaning-liquid",
    slug: "turkish-cleaning-liquid-sample",
    nameAr: "نموذج منتج تنظيف تركي",
    nameEn: "Turkish Cleaning Product Sample",
    shortDescriptionAr: "قالب جاهز لعرض منتجات التنظيف التي سيتم إضافتها من قبلكم.",
    shortDescriptionEn: "Ready template for cleaning products that your team can replace with real items.",
    descriptionAr: "هذا المنتج تجريبي لتوضيح شكل الكتالوج فقط. يمكن استبداله باسم المنتج الحقيقي، الصور، التعبئة، الكمية، والمواصفات عند تجهيز بيانات المنتجات.",
    descriptionEn: "This is a demo item used to show the catalog layout only. Replace it with the real product name, images, packaging, quantity, and specifications once product data is ready.",
    categoryId: "cleaning-household",
    originCountry: "Turkey",
    brand: "LOUREX Sample",
    moq: "حسب الاتفاق",
    unit: "Carton / Pallet",
    packaging: "قابل للتحديد حسب المنتج",
    weight: "يحدد لاحقاً",
    dimensions: "يحدد لاحقاً",
    material: "يحدد لاحقاً",
    technicalSpecs: "أضف مواصفات المنتج الحقيقية، صور العبوة، التركيبة أو بيانات السلامة عند الحاجة.",
    priceNoteAr: "السعر حسب الكمية والشحن والتوفر.",
    priceNoteEn: "Price depends on quantity, shipping, and availability.",
    status: "active",
    isFeatured: true,
    images: [
      {
        url: "/logo.png",
        altAr: "صورة مؤقتة لمنتج تنظيف تركي",
        altEn: "Temporary Turkish cleaning product image",
      },
    ],
    tagsAr: ["منتج تجريبي", "قابل للتوريد", "من تركيا"],
    tagsEn: ["Demo item", "Sourcing ready", "From Turkey"],
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
  },
];
