import { useEffect } from "react";
import { SEO } from "@/components/seo/SEO";
import Footer from "@/components/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useI18n } from "@/lib/i18n";

const faqs = [
  {
    en: {
      q: "What is LOUREX?",
      a: "LOUREX TRADING AND SOURCING coordinates international sourcing for importers, wholesalers and distributors, including food, FMCG and other commercial products. Business buyers can submit purchase requirements, coordinate supplier discussions and follow agreed orders.",
    },
    ar: {
      q: "ما هي لوريكس؟",
      a: "تنسّق لوريكس LOUREX التوريد الدولي للمستوردين وتجار الجملة والموزعين، بما يشمل الأغذية والسلع الاستهلاكية والمنتجات التجارية الأخرى. يستطيع المشترون تقديم متطلبات الشراء وتنسيق التواصل مع الموردين ومتابعة الطلبات المتفق عليها.",
    },
  },
  {
    en: {
      q: "Is LOUREX a marketplace?",
      a: "No. LOUREX is not primarily a marketplace or supplier listing website. LOUREX is an online sourcing coordination platform. The legal contracting party and applicable terms must be confirmed for each inquiry.",
    },
    ar: {
      q: "هل لوريكس منصة بيع أو سوق إلكتروني؟",
      a: "لا. لوريكس ليست مجرد سوق إلكتروني أو قائمة موردين. لوريكس منصة إلكترونية لتنسيق التوريد. يجب تأكيد الطرف القانوني المتعاقد والشروط المعمول بها لكل استفسار.",
    },
  },
  {
    en: {
      q: "What products does LOUREX focus on?",
      a: "LOUREX coordinates inquiries across food, confectionery, FMCG, cleaning, personal care and packaging categories, subject to availability and applicable requirements.",
    },
    ar: {
      q: "ما المنتجات التي تركز عليها لوريكس؟",
      a: "تنسّق لوريكس استفسارات الأغذية والحلويات والسلع الاستهلاكية والمنظفات والعناية الشخصية والتغليف وفق التوفر والمتطلبات المعمول بها.",
    },
  },
  {
    en: {
      q: "Who does LOUREX serve?",
      a: "LOUREX serves business buyers, importers, distributors, wholesalers, and companies that need structured sourcing coordination and trade follow-up.",
    },
    ar: {
      q: "من تخدم لوريكس؟",
      a: "تخدم لوريكس المشترين التجاريين، المستوردين، الموزعين، تجار الجملة، والشركات التي تحتاج إلى تنسيق توريد ومتابعة تجارية منظمة.",
    },
  },
  {
    en: {
      q: "How does LOUREX manage purchase requests?",
      a: "LOUREX manages purchase requests through structured intake, product review, supplier coordination, deal follow-up, and delivery tracking.",
    },
    ar: {
      q: "كيف تدير لوريكس طلبات الشراء؟",
      a: "تدير لوريكس طلبات الشراء من خلال استقبال منظم للطلب، مراجعة المنتج، تنسيق الموردين، متابعة الصفقة، والتتبع حتى التسليم.",
    },
  },
  {
    en: {
      q: "Does LOUREX work only in one country?",
      a: "LOUREX accepts inquiries from international business buyers; feasibility depends on the product, supplier availability, destination requirements and agreed commercial terms.",
    },
    ar: {
      q: "هل تعمل لوريكس في دولة واحدة فقط؟",
      a: "تستقبل لوريكس استفسارات المشترين التجاريين الدوليين؛ وتعتمد إمكانية التنفيذ على المنتج وتوفر المورد ومتطلبات الوجهة والشروط المتفق عليها.",
    },
  },
];

export default function FaqPage() {
  const { lang } = useI18n();
  const isArabic = lang === "ar";
  const localizedFaqs = faqs.map((faq) => (isArabic ? faq.ar : faq.en));
  const title = isArabic ? "الأسئلة الشائعة عن لوريكس" : "LOUREX FAQ";
  const description = localizedFaqs[0].a;

  useEffect(() => {
    const scriptId = "lourex-faq-json-ld";
    document.getElementById(scriptId)?.remove();

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: localizedFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    });
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [localizedFaqs]);

  return (
    <div className="lourex-public lourex-faq min-h-screen bg-background text-foreground">
      <SEO title={title} description={description} url="https://www.lou-rex.com/faq" />
      <SiteHeader />
      <main className="container mx-auto px-4 py-14 md:px-8 md:py-20">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/90">
            {isArabic ? "المعرفة تبدأ بسؤال" : "LOUREX / KNOWLEDGE"}
          </p>
          <h1 className="mt-5 font-serif text-4xl font-bold text-foreground md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-9 text-foreground">
            {description}
          </p>
        </div>

        <div className="mt-10 grid gap-4">
          {localizedFaqs.map((faq, index) => (
            <article
              key={faq.q}
              className="rounded-[1.5rem] border border-primary/20 bg-card p-6"
            >
              <span className="lrx-faq-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                {faq.q}
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {faq.a}
              </p>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
