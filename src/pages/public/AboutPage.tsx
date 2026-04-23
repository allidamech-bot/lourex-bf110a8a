import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { useI18n } from "@/lib/i18n";

export default function AboutPage() {
  const { lang } = useI18n();

  const items =
    lang === "ar"
      ? [
          "لسنا Marketplace ولا منصة كتالوج تعتمد على السلة والشراء الفوري.",
          "نحن نظام تشغيل للطلبات والصفقات والشحنات والمحاسبة الداخلية الموثقة.",
          "الهدف هو تقليل الفوضى التشغيلية ورفع وضوح المسؤوليات لكل من العميل والوكلاء وفريق العمليات.",
        ]
      : [
          "Lourex is not a marketplace, supplier directory, or cart-based storefront.",
          "It is an operational platform for purchase intake, deals, shipments, controlled accounting, and audit visibility.",
          "The goal is to reduce execution chaos and make responsibilities clear for the customer, both partners, and the operations team.",
        ];

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={lang === "ar" ? "عن Lourex" : "About Lourex"}
        description={lang === "ar" ? "تعرف على Lourex كمنصة وسيط عمليات تربط بين العملاء والشركاء في تركيا والسعودية." : "Learn about Lourex as an intermediary operations platform connecting customers with partners in Turkey and Saudi Arabia."}
      />
      <SiteHeader />
      <div className="container mx-auto px-4 py-12 md:px-8">
        <SectionHeading
          eyebrow={lang === "ar" ? "عن Lourex" : "About Lourex"}
          title={lang === "ar" ? "Lourex كمنصة وسيط عمليات" : "Lourex as an intermediary operations platform"}
          description={
            lang === "ar"
              ? "Lourex تربط بين العميل ووكيل تركيا ووكيل السعودية عبر سير عمل مضبوط يبدأ بطلب شراء وينتهي بتسليم وتوثيق وتقارير قابلة للتدقيق."
              : "Lourex connects the customer, Turkish partner, and Saudi partner through a structured workflow that starts with purchase intake and ends with delivery, reporting, and audit-ready records."
          }
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="rounded-3xl border border-border/60 bg-card p-6 text-sm leading-7 text-muted-foreground">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
