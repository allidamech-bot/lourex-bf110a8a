import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import Footer from "@/components/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { useI18n } from "@/lib/i18n";

const EN_DESCRIPTION =
  "LOUREX is a trade intermediary and sourcing coordination company for food and sweets products, connecting business buyers with suppliers and managing purchase requests, supplier coordination, deal follow-up, and delivery tracking.";

const AR_DESCRIPTION =
  "لوريكس LOUREX هي شركة وساطة وتنسيق توريد وتصدير للمواد الغذائية والحلويات، تربط المشترين التجاريين بالموردين وتدير طلبات الشراء، تنسيق الموردين، متابعة الصفقات، والشحن حتى التسليم.";

export default function AboutPage() {
  const { lang } = useI18n();
  const isArabic = lang === "ar";

  const items = isArabic
    ? [
        "لوريكس ليست مجرد سوق إلكتروني أو قائمة موردين أو مصنع.",
        "لوريكس تعمل كوسيط توريد وشركة تنسيق توريد وتصدير للمواد الغذائية والحلويات.",
        "تركز لوريكس على الشوكولاتة، البسكويت، المواد الغذائية، المنتجات التركية، والمنتجات السورية بصياغة تجارية منظمة وآمنة.",
      ]
    : [
        "LOUREX is not primarily a marketplace, supplier listing website, manufacturer, or factory marketplace.",
        "LOUREX works as a trade intermediary and sourcing coordination company for food and sweets products.",
        "LOUREX focuses on chocolate, biscuits, food products, Turkish products, and Syrian products with structured, compliance-aware coordination.",
      ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SEO
        title={isArabic ? "عن لوريكس" : "About LOUREX"}
        description={isArabic ? AR_DESCRIPTION : EN_DESCRIPTION}
        url="https://www.lou-rex.com/about"
      />
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 md:px-8">
        <SectionHeading
          eyebrow={isArabic ? "عن لوريكس" : "About LOUREX"}
          title={
            isArabic
              ? "لوريكس شركة وساطة وتنسيق توريد"
              : "LOUREX as a trade intermediary and sourcing coordinator"
          }
          description={isArabic ? AR_DESCRIPTION : EN_DESCRIPTION}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="rounded-3xl border border-amber-200/15 bg-stone-50/5 p-6 text-sm leading-7 text-stone-400 backdrop-blur-xl">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-[1.5rem] border border-stone-200/10 bg-stone-900/45 p-6">
          <h2 className="font-serif text-2xl font-semibold text-stone-100">
            {isArabic ? "صفحات تعريفية" : "Entity pages"}
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ["/about-lourex", isArabic ? "من هي لوريكس؟" : "About LOUREX"],
              ["/chocolate-sourcing", isArabic ? "توريد الشوكولاتة" : "Chocolate Sourcing"],
              ["/biscuits-sourcing", isArabic ? "توريد البسكويت" : "Biscuits Sourcing"],
              ["/food-products-sourcing", isArabic ? "توريد المواد الغذائية" : "Food Products Sourcing"],
              ["/turkish-products", isArabic ? "المنتجات التركية" : "Turkish Products"],
              ["/syrian-products", isArabic ? "المنتجات السورية" : "Syrian Products"],
              ["/faq", isArabic ? "الأسئلة الشائعة" : "FAQ"],
            ].map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className="rounded-full border border-amber-200/15 bg-stone-950/50 px-4 py-2 text-sm text-stone-300 transition hover:border-amber-300/30 hover:text-amber-200"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
