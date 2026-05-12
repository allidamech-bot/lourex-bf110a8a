export type ProductionFallbackKind = "backend" | "optionalFeature" | "aiService" | "runtimeEmpty" | "lazyError" | "loading";

export const resolveProductionFallback = (kind: ProductionFallbackKind, language: "ar" | "en") => {
  const copy = {
    en: {
      backend: {
        title: "Backend unavailable",
        body: "Lovable Cloud runtime data is not available right now. The page will stay open and update when the service returns.",
      },
      optionalFeature: {
        title: "Optional feature not configured",
        body: "This section depends on an optional backend table or function. It is safe to continue using the rest of Lourex.",
      },
      aiService: {
        title: "AI service unavailable",
        body: "AI recommendations are temporarily unavailable. Operational data and manual workflows remain available.",
      },
      runtimeEmpty: {
        title: "No runtime data yet",
        body: "There are no runtime events to show for this section yet.",
      },
      lazyError: {
        title: "Section could not load",
        body: "This heavy operational section failed to load. Refresh the section or continue with the rest of the dashboard.",
      },
      loading: {
        title: "Loading section",
        body: "Preparing this operational section...",
      },
    },
    ar: {
      backend: {
        title: "الخلفية غير متاحة",
        body: "بيانات تشغيل Lovable Cloud غير متاحة حاليا. ستبقى الصفحة مفتوحة ويتم التحديث عند عودة الخدمة.",
      },
      optionalFeature: {
        title: "ميزة اختيارية غير مفعلة",
        body: "هذا القسم يعتمد على جدول أو وظيفة اختيارية في الخلفية. يمكنك متابعة استخدام باقي Lourex بأمان.",
      },
      aiService: {
        title: "خدمة الذكاء غير متاحة",
        body: "توصيات الذكاء غير متاحة مؤقتا. تبقى البيانات التشغيلية والعمل اليدوي متاحين.",
      },
      runtimeEmpty: {
        title: "لا توجد بيانات تشغيل بعد",
        body: "لا توجد أحداث تشغيلية لعرضها في هذا القسم حتى الآن.",
      },
      lazyError: {
        title: "تعذر تحميل القسم",
        body: "فشل تحميل هذا القسم التشغيلي الثقيل. يمكنك تحديث القسم أو متابعة استخدام بقية اللوحة.",
      },
      loading: {
        title: "جاري تحميل القسم",
        body: "يتم تجهيز هذا القسم التشغيلي...",
      },
    },
  } as const;

  return copy[language][kind];
};
