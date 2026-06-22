export type ProductionFallbackKind = "backend" | "optionalFeature" | "aiService" | "runtimeEmpty" | "lazyError" | "loading";

export const resolveProductionFallback = (kind: ProductionFallbackKind, language: "ar" | "en") => {
  const copy = {
    en: {
      backend: {
        titleKey: "productionFallbacks.backend.title",
        bodyKey: "productionFallbacks.backend.body",
      },
      optionalFeature: {
        titleKey: "productionFallbacks.optionalFeature.title",
        bodyKey: "productionFallbacks.optionalFeature.body",
      },
      aiService: {
        titleKey: "productionFallbacks.aiService.title",
        bodyKey: "productionFallbacks.aiService.body",
      },
      runtimeEmpty: {
        titleKey: "productionFallbacks.runtimeEmpty.title",
        bodyKey: "productionFallbacks.runtimeEmpty.body",
      },
      lazyError: {
        titleKey: "productionFallbacks.lazyError.title",
        bodyKey: "productionFallbacks.lazyError.body",
      },
      loading: {
        titleKey: "productionFallbacks.loading.title",
        bodyKey: "productionFallbacks.loading.body",
      },
    },
    ar: {
      backend: {
        titleKey: "productionFallbacks.backend.title",
        bodyKey: "productionFallbacks.backend.body",
      },
      optionalFeature: {
        titleKey: "productionFallbacks.optionalFeature.title",
        bodyKey: "productionFallbacks.optionalFeature.body",
      },
      aiService: {
        titleKey: "productionFallbacks.aiService.title",
        bodyKey: "productionFallbacks.aiService.body",
      },
      runtimeEmpty: {
        titleKey: "productionFallbacks.runtimeEmpty.title",
        bodyKey: "productionFallbacks.runtimeEmpty.body",
      },
      lazyError: {
        titleKey: "productionFallbacks.lazyError.title",
        bodyKey: "productionFallbacks.lazyError.body",
      },
      loading: {
        titleKey: "productionFallbacks.loading.title",
        bodyKey: "productionFallbacks.loading.body",
      },
    },
  } as const;

  return copy[language][kind];
};
