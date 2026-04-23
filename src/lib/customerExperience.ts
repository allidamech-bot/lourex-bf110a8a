import type { PurchaseRequestStatus } from "@/types/lourex";
import type { Lang } from "@/lib/i18n";

type LocalizedCopy = {
  label: string;
  description: string;
  nextStep: string;
};

const requestStatusCopy: Record<PurchaseRequestStatus, { ar: LocalizedCopy; en: LocalizedCopy }> = {
  intake_submitted: {
    ar: {
      label: "تم استلام الطلب",
      description: "تم تسجيل طلبك بنجاح وأصبح في قائمة المراجعة لدى فريق Lourex.",
      nextStep: "الخطوة التالية: سيقوم الفريق بمراجعة التفاصيل الأساسية والتواصل معك إذا احتجنا أي توضيح إضافي.",
    },
    en: {
      label: "Request received",
      description: "Your request was submitted successfully and is now in Lourex's review queue.",
      nextStep: "Next step: our team will review the basics and contact you if any clarification is needed.",
    },
  },
  under_review: {
    ar: {
      label: "قيد المراجعة",
      description: "يتم الآن فحص التفاصيل والمتطلبات التشغيلية قبل الانتقال للمرحلة التالية.",
      nextStep: "الخطوة التالية: سنؤكد الجاهزية أو نطلب منك معلومات إضافية إذا لزم الأمر.",
    },
    en: {
      label: "Under review",
      description: "Your request is being checked for completeness and operational fit.",
      nextStep: "Next step: we will either confirm readiness or request more details if needed.",
    },
  },
  awaiting_clarification: {
    ar: {
      label: "بانتظار إيضاح",
      description: "نحتاج إلى معلومة أو تأكيد إضافي منك قبل متابعة التنفيذ بثقة.",
      nextStep: "الخطوة التالية: راقب قنوات التواصل المسجلة لديك، لأن الفريق قد يتواصل لطلب تفصيل محدد.",
    },
    en: {
      label: "Awaiting clarification",
      description: "We need one or more details from you before the request can move forward confidently.",
      nextStep: "Next step: please watch your registered contact channels in case the team reaches out for a specific detail.",
    },
  },
  ready_for_conversion: {
    ar: {
      label: "جاهز للتحويل إلى عملية",
      description: "الطلب أصبح جاهزًا للتحويل إلى صفقة تشغيلية ومتابعة التنفيذ الفعلي.",
      nextStep: "الخطوة التالية: سيقوم الفريق بفتح العملية التشغيلية وإعداد بيانات التتبع عند توفرها.",
    },
    en: {
      label: "Ready for operation",
      description: "The request is approved and ready to become an active operational deal.",
      nextStep: "Next step: the team will open the operation and tracking details will appear once available.",
    },
  },
  converted_to_deal: {
    ar: {
      label: "تحول إلى صفقة",
      description: "تم نقل الطلب إلى عملية تشغيلية نشطة ويمكنك متابعة التقدم من قسم التتبع.",
      nextStep: "الخطوة التالية: استخدم التتبع لمتابعة المراحل والاطلاع على آخر تحديث آمن للعميل.",
    },
    en: {
      label: "Converted to deal",
      description: "This request is now an active operation, and progress can be followed in tracking.",
      nextStep: "Next step: use tracking to follow the stages and read the latest customer-safe update.",
    },
  },
};

export const getCustomerRequestStatusCopy = (status: PurchaseRequestStatus, lang: Lang) =>
  requestStatusCopy[status][lang];

export const getCustomerFinancialSummaryCopy = (lang: Lang, options: { hasMixedCurrencies: boolean; dealsCount: number }) => {
  if (lang === "ar") {
    if (options.hasMixedCurrencies) {
      return "قد تشمل هذه الأرقام عمليات بعملات متعددة، لذلك تُعرض هنا كملخص تشغيلي تقريبي وليست كشف تسوية نهائي.";
    }

    if (options.dealsCount === 0) {
      return "ستظهر الأرقام المالية هنا عندما ترتبط بطلباتك أو بعملياتك النشطة.";
    }

    return "يمثل هذا الملخص الدخل والمصروفات المسجلة على عملياتك الحالية، وقد يتغير مع تقدم التنفيذ أو إضافة قيود جديدة.";
  }

  if (options.hasMixedCurrencies) {
    return "These figures may include operations recorded in more than one currency, so treat them as an operational summary rather than a final settlement statement.";
  }

  if (options.dealsCount === 0) {
    return "Financial figures will appear here once they are linked to your requests or active operations.";
  }

  return "This summary reflects income and expense entries recorded against your active operations, and it can change as execution progresses.";
};
