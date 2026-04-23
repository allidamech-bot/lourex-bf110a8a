import { SEO } from "@/components/seo/SEO";
import { ClipboardList, PackageSearch, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { PurchaseRequestForm } from "@/features/purchase-requests/components/PurchaseRequestForm";
import { useI18n } from "@/lib/i18n";

export default function RequestPage() {
  const { lang } = useI18n();

  const cards = [
    {
      icon: ClipboardList,
      title: lang === "ar" ? "تفاصيل قابلة للمراجعة" : "Review-ready detail",
      desc:
        lang === "ar"
          ? "نطلب تفاصيل وصورًا حقيقية حتى لا يتحول الطلب إلى مراسلات غامضة يصعب تنفيذها."
          : "We ask for real images and useful detail so the request does not become a vague message thread.",
    },
    {
      icon: PackageSearch,
      title: lang === "ar" ? "جاهز للتحويل إلى صفقة" : "Ready for deal conversion",
      desc:
        lang === "ar"
          ? "بعد المراجعة يمكن لفريق Lourex تحويل الطلب إلى عملية تشغيلية داخل لوحة التحكم مباشرة."
          : "After review, the Lourex team can convert the request into an operational deal inside the dashboard.",
    },
    {
      icon: ShieldCheck,
      title: lang === "ar" ? "ثقة أعلى في التنفيذ" : "Higher execution trust",
      desc:
        lang === "ar"
          ? "المسار يبدأ من هنا ثم ينتقل إلى التتبع والمحاسبة والسجل التدقيقي داخل نفس المنصة."
          : "The flow starts here, then continues into tracking, accounting, and audit context within the same system.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={lang === "ar" ? "إرسال طلب شراء" : "Submit Purchase Request"}
        description={lang === "ar" ? "أرسل طلب شراء جديد لعمليات الاستيراد والتصدير عبر لوحة تحكم Lourex." : "Submit a new purchase request for import/export operations through Lourex dashboard."}
      />
      <SiteHeader />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.08),transparent_30%)]" />
        <div className="container relative mx-auto px-4 py-12 md:px-8 md:py-16">
          <div className="grid gap-10 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <SectionHeading
                eyebrow={lang === "ar" ? "استقبال الطلب" : "Purchase Intake"}
                title={lang === "ar" ? "إرسال طلب شراء بمستوى تنفيذي" : "Submit an execution-ready purchase request"}
                description={
                  lang === "ar"
                    ? "هذه الصفحة ليست نموذج اتصال عادي. إنها نقطة دخول رسمية لعملية Lourex، لذلك صممناها لتكون أكثر وضوحًا وهدوءًا وثقة."
                    : "This is not a generic contact form. It is the formal intake point for a Lourex operation, designed for clarity, trust, and real execution."
                }
              />
              <div className="grid gap-4">
                {cards.map((item) => (
                  <div key={item.title} className="rounded-[1.7rem] border border-primary/12 bg-card/90 p-5 shadow-[0_18px_42px_-34px_rgba(0,0,0,0.2)] dark:shadow-[0_18px_42px_-34px_rgba(0,0,0,0.48)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-serif text-2xl font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <PurchaseRequestForm />
          </div>
        </div>
      </div>
    </div>
  );
}
