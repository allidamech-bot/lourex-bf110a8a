import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import Footer from "@/components/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TradeEmblem } from "@/components/shared/TradeEmblem";
import { useI18n } from "@/lib/i18n";

const EN_DESCRIPTION =
  "LOUREX TRADING AND SOURCING coordinates international sourcing for importers, wholesalers and distributors, including food, FMCG and other commercial products. Business buyers can submit purchase requirements, coordinate supplier discussions and follow agreed orders.";

const AR_DESCRIPTION =
  "تنسّق لوريكس LOUREX التوريد الدولي للمستوردين وتجار الجملة والموزعين، بما يشمل الأغذية والسلع الاستهلاكية والمنتجات التجارية الأخرى. يستطيع المشترون تقديم متطلبات الشراء وتنسيق التواصل مع الموردين ومتابعة الطلبات المتفق عليها.";

export default function AboutPage() {
  const { lang } = useI18n();
  const isArabic = lang === "ar";

  const items = isArabic
    ? [
        "لوريكس ليست مجرد سوق إلكتروني أو قائمة موردين أو مصنع.",
        "تنسّق لوريكس التوريد الدولي للأغذية والسلع الاستهلاكية والمنتجات التجارية الأخرى.",
        "تنسّق لوريكس استفسارات الأغذية والحلويات والسلع الاستهلاكية والمنظفات والعناية الشخصية والتغليف وفق التوفر والمتطلبات المعمول بها.",
      ]
    : [
        "LOUREX is not primarily a marketplace, supplier listing website, manufacturer, or factory marketplace.",
        "LOUREX coordinates international trade sourcing inquiries for food, FMCG and other commercial products.",
        "LOUREX coordinates inquiries across food, confectionery, FMCG, cleaning, personal care and packaging, subject to availability and applicable requirements.",
      ];

  const links = [
    ["/about-lourex", isArabic ? "من هي لوريكس؟" : "About LOUREX"],
    ["/chocolate-sourcing", isArabic ? "توريد الشوكولاتة" : "Chocolate Sourcing"],
    ["/biscuits-sourcing", isArabic ? "توريد البسكويت" : "Biscuits Sourcing"],
    ["/food-products-sourcing", isArabic ? "توريد المواد الغذائية" : "Food Products Sourcing"],
    ["/turkish-products", isArabic ? "المنتجات التركية" : "Turkish Products"],
    ["/syrian-products", isArabic ? "المنتجات السورية" : "Syrian Products"],
    [isArabic ? "/ar/turkiye-sourcing-guide" : "/turkiye-sourcing-guide", isArabic ? "دليل المشتري للتوريد من تركيا" : "Buyer guide: sourcing products from Türkiye"],
    [isArabic ? "/ar/wholesale-rfq-checklist" : "/wholesale-rfq-checklist", isArabic ? "قائمة تجهيز طلب عرض سعر بالجملة للمستوردين والموزعين" : "Wholesale RFQ checklist for importers and distributors"],
    ["/faq", isArabic ? "الأسئلة الشائعة" : "FAQ"],
  ];

  return (
    <div className="lourex-public lourex-about min-h-screen bg-background text-foreground">
      <SEO
        title={isArabic ? "عن لوريكس" : "About LOUREX"}
        description={isArabic ? AR_DESCRIPTION : EN_DESCRIPTION}
        url="https://www.lou-rex.com/about"
      />
      <SiteHeader />
      <main>
        <section className="container mx-auto grid gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:px-8 lg:py-24">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
              {isArabic ? "تعرف على لوريكس" : "ABOUT LOUREX"}
            </p>
            <h1 className="mt-5 text-[clamp(2.5rem,5vw,4.6rem)] font-bold leading-[1.15] tracking-tight text-heading">
              {isArabic ? "نربط التجارة بالثقة." : "Connecting trade with confidence."}
            </h1>
            <p className="mt-6 max-w-[37rem] text-base leading-8 text-muted-foreground">
              {isArabic ? AR_DESCRIPTION : EN_DESCRIPTION}
            </p>
            <Link to="/request" className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">
              {isArabic ? "قدّم طلب شراء" : "Submit a request"} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
          <TradeEmblem lang={lang} />
        </section>
        <section className="border-y border-border/70 bg-secondary py-16 dark:bg-secondary sm:py-24">
          <div className="container mx-auto grid gap-10 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20 lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">{isArabic ? "طبيعة عملنا" : "OUR APPROACH"}</p>
              <h2 className="mt-4 text-3xl font-bold leading-snug text-heading sm:text-4xl">
                {isArabic ? "تنسيق واضح، من البداية." : "Clarity at every stage."}
              </h2>
            </div>
            <div className="divide-y divide-border/80">
              {items.map((item, index) => (
                <div key={item} className="flex gap-5 py-6 first:pt-0 last:pb-0">
                  <span className="min-w-8 text-xs font-bold tabular-nums text-primary">0{index + 1}</span>
                  <p className="max-w-[45rem] text-[15px] leading-8 text-foreground">{item}</p>
                  <CheckCircle2 className="ms-auto h-5 w-5 shrink-0 text-primary/70" strokeWidth={1.5} aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="container mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
            {isArabic ? "استكشف خدماتنا" : "EXPLORE OUR SERVICES"}
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-tight text-heading sm:text-4xl">
            {isArabic ? "مجالات التوريد والمعلومات" : "Explore sourcing & insights"}
          </h2>
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {links.map(([to, label]) => (
              <Link key={to} to={to} className="group flex min-h-20 items-center justify-between gap-3 rounded-[1.25rem] border border-border bg-card px-5 py-4 text-sm font-semibold text-heading transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-soft">
                {label}
                <ArrowUpRight className="h-4 w-4 shrink-0 text-primary rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
