import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import Footer from "@/components/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useI18n } from "@/lib/i18n";
import aeoContent from "@/lib/aeo-content.json";

type AeoPageKind =
  | "about"
  | "chocolate"
  | "biscuits"
  | "food"
  | "turkish"
  | "syrian";

interface AeoPageProps {
  kind: AeoPageKind;
}

const EN_DEFINITION = aeoContent.enDefinition;

const AR_DEFINITION =
  "تنسّق لوريكس LOUREX التوريد الدولي والتواصل مع الموردين للمشترين التجاريين، مع إدارة طلبات الشراء ومتابعة الطلبات.";

const pageContent = aeoContent.pages;
const relatedLinks = aeoContent.relatedLinks;

export default function AeoPage({ kind }: AeoPageProps) {
  const { lang } = useI18n();
  const isArabic = lang === "ar";
  const content = pageContent[kind];
  const title = isArabic ? content.h1Ar : content.h1En;
  const description = isArabic ? content.introAr : content.introEn;

  return (
    <div className="lourex-public lourex-aeo min-h-screen bg-background text-foreground">
      <SEO
        title={title}
        description={description}
        url={`https://www.lou-rex.com${content.path}`}
      />
      <SiteHeader />
      <main className="container mx-auto px-4 py-14 md:px-8 md:py-20">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/90">
            {isArabic ? "التجارة والمصادر" : "LOUREX / TRADE & RESOURCES"}
          </p>
          <h1 className="mt-5 font-serif text-4xl font-bold text-foreground md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-9 text-foreground">
            {description}
          </p>
          {kind !== "about" ? (
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              {isArabic ? AR_DEFINITION : EN_DEFINITION}
            </p>
          ) : null}
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-primary/20 bg-card p-6">
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              {isArabic ? "كيف تعمل لوريكس" : "How LOUREX works"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {isArabic ? content.focusAr : content.focusEn}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-primary/20 bg-card p-6">
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              {isArabic ? "نطاق التركيز" : "Sourcing focus"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {isArabic
                ? "استكشف كتالوج المنتجات أو قدّم طلب توريد بالمواصفات والكمية والوجهة. يُؤكّد توفر الموردين والشروط التجارية لكل استفسار."
                : aeoContent.enFocus}
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-[1.5rem] border border-border/70 bg-secondary/65 p-6">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            {isArabic ? "صفحات مرتبطة" : "Related public pages"}
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {relatedLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full border border-primary/20 bg-background/70 px-4 py-2 text-sm text-foreground transition hover:border-primary/20 hover:text-primary"
              >
                {isArabic ? link.ar : link.en}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
