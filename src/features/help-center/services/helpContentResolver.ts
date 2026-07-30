import type { HelpAudience, HelpResolveInput, PageHelpContent } from "@/features/help-center/types/helpTypes";
import { accountingHelpAr } from "@/features/help-center/content/accountingHelp.ar";
import { accountingHelpEn } from "@/features/help-center/content/accountingHelp.en";
import { customerHelpAr } from "@/features/help-center/content/customerHelp.ar";
import { partnerHelpAr } from "@/features/help-center/content/partnerHelp.ar";
import type { LourexRole } from "@/features/auth/rbac";

const partnerRoles: LourexRole[] = ["turkish_partner", "saudi_partner"];
const customerRoles: LourexRole[] = ["customer"];

export const audienceFromRole = (role?: LourexRole | null): HelpAudience => {
  if (role && partnerRoles.includes(role)) return "partner";
  if (role && customerRoles.includes(role)) return "customer";
  if (role) return "admin";
  return "general";
};

const englishFallback = (pageKey: PageHelpContent["pageKey"], audience: HelpAudience): PageHelpContent => ({
  pageKey,
  audience,
  eyebrow: "Page help",
  title: "How do I use this page?",
  summary: "Use this guide to understand the page, review the key numbers, and decide what to check next.",
  topics: [
    {
      id: "start",
      title: "Start with the summary",
      body: "Read the main cards first, then open the related records only when something needs review.",
    },
    {
      id: "terms",
      title: "What do these numbers mean?",
      body: "Counts show operational volume. Financial numbers are operational summaries until reviewed and approved by the responsible team.",
    },
    {
      id: "action",
      title: "Before taking action",
      body: "Check the related request, deal, shipment, or financial entry. Sensitive actions should follow approval rules.",
    },
  ],
});

const arabicFallback = (pageKey: PageHelpContent["pageKey"], audience: HelpAudience): PageHelpContent => ({
  pageKey,
  audience,
  eyebrow: "مساعدة الصفحة",
  title: "كيف أستخدم هذه الصفحة؟",
  summary: "ابدأ بقراءة الملخص، ثم راجع السجلات المرتبطة عند وجود رقم أو حالة تحتاج متابعة.",
  topics: [
    { id: "start", title: "ابدأ بالملخص", body: "البطاقات العلوية تعطيك صورة سريعة عن الوضع الحالي قبل الدخول في التفاصيل." },
    { id: "numbers", title: "ماذا تعني الأرقام؟", body: "الأرقام تساعد على الفهم والمتابعة، لكنها لا تعني اعتماداً نهائياً إذا كانت مرتبطة بالمال أو المخاطر." },
    { id: "next", title: "ما الخطوة التالية؟", body: "افتح الطلب أو الصفقة أو الشحنة المرتبطة، ثم اتبع مسار الموافقة إذا كان الإجراء حساساً." },
  ],
});

export const resolveHelpContent = (input: HelpResolveInput): PageHelpContent => {
  const audience = audienceFromRole(input.role);
  const pageKey = input.pageKey;

  if (input.language === "en") {
    return accountingHelpEn[pageKey] || englishFallback(pageKey, audience);
  }

  if (audience === "customer") {
    return customerHelpAr[pageKey] || accountingHelpAr[pageKey] || arabicFallback(pageKey, audience);
  }

  if (audience === "partner") {
    return partnerHelpAr[pageKey] || accountingHelpAr[pageKey] || arabicFallback(pageKey, audience);
  }

  return accountingHelpAr[pageKey] || customerHelpAr[pageKey] || partnerHelpAr[pageKey] || arabicFallback(pageKey, audience);
};
