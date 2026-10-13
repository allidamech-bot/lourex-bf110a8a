import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import Footer from "@/components/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import heroImg from "@/assets/hero-trade.jpg";
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

  const links = [
    ["/about-lourex", isArabic ? "من هي لوريكس؟" : "About LOUREX"],
    ["/chocolate-sourcing", isArabic ? "توريد الشوكولاتة" : "Chocolate Sourcing"],
    ["/biscuits-sourcing", isArabic ? "توريد البسكويت" : "Biscuits Sourcing"],
    ["/food-products-sourcing", isArabic ? "توريد المواد الغذائية" : "Food Products Sourcing"],
    ["/turkish-products", isArabic ? "المنتجات التركية" : "Turkish Products"],
    ["/syrian-products", isArabic ? "المنتجات السورية" : "Syrian Products"],
    ["/faq", isArabic ? "الأسئلة الشائعة" : "FAQ"],
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
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
          <div className="relative">
            <div aria-hidden="true" className="pointer-events-none absolute -end-4 -top-4 h-24 w-24 rounded-tr-[3rem] border-e border-t border-primary/30" />
            <img
              src={heroImg}
              alt={isArabic ? "عمليات التجارة الدولية والتوريد" : "International sourcing and trading operations"}
              className="h-[310px] w-full rounded-[1.8rem] object-cover shadow-[0_24px_65px_-40px_rgba(8,127,120,0.45)] sm:h-[420px] lg:h-[520px]"
            />
          </div>
        </section>
        <section className="border-y border-border/70 bg-[#E9F3F0] py-16 dark:bg-[#11191B] sm:py-24">
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
