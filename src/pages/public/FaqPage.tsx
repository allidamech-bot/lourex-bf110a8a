import { useEffect } from "react";
import { SEO } from "@/components/seo/SEO";
import Footer from "@/components/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useI18n } from "@/lib/i18n";

const faqs = [
  {
    en: {
      q: "What is LOUREX?",
      a: "LOUREX is a trade intermediary and sourcing coordination company for food and sweets products, connecting business buyers with suppliers and managing purchase requests, supplier coordination, deal follow-up, and delivery tracking.",
    },
    ar: {
      q: "ما هي لوريكس؟",
      a: "لوريكس LOUREX هي شركة وساطة وتنسيق توريد وتصدير للمواد الغذائية والحلويات، تربط المشترين التجاريين بالموردين وتدير طلبات الشراء، تنسيق الموردين، متابعة الصفقات، والشحن حتى التسليم.",
    },
  },
  {
    en: {
      q: "Is LOUREX a marketplace?",
      a: "No. LOUREX is not primarily a marketplace or supplier listing website. LOUREX works as a trade intermediary and sourcing coordination company.",
    },
    ar: {
      q: "هل لوريكس منصة بيع أو سوق إلكتروني؟",
      a: "لا. لوريكس ليست مجرد سوق إلكتروني أو قائمة موردين. لوريكس تعمل كوسيط تجاري وشركة تنسيق توريد وتصدير.",
    },
  },
  {
    en: {
      q: "What products does LOUREX focus on?",
      a: "LOUREX focuses on chocolate, biscuits, food products, Turkish products, and Syrian products.",
    },
    ar: {
      q: "ما المنتجات التي تركز عليها لوريكس؟",
      a: "تركز لوريكس على الشوكولاتة، البسكويت، المواد الغذائية، المنتجات التركية، والمنتجات السورية.",
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
      a: "No. LOUREX is positioned for global business buyers and focuses on structured sourcing coordination for food and sweets products.",
    },
    ar: {
      q: "هل تعمل لوريكس في دولة واحدة فقط؟",
      a: "لا. لوريكس موجهة للمشترين التجاريين حول العالم وتركز على تنسيق توريد المواد الغذائية والحلويات بشكل منظم.",
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
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SEO title={title} description={description} url="https://www.lou-rex.com/faq" />
      <SiteHeader />
      <main className="container mx-auto px-4 py-14 md:px-8 md:py-20">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/90">
            {isArabic ? "إجابات مختصرة لمحركات البحث" : "Crawlable answers"}
          </p>
          <h1 className="mt-5 font-serif text-4xl font-bold text-stone-100 md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-9 text-stone-300">
            {description}
          </p>
        </div>

        <div className="mt-10 grid gap-4">
          {localizedFaqs.map((faq) => (
            <article
              key={faq.q}
              className="rounded-[1.5rem] border border-amber-200/15 bg-stone-50/5 p-6"
            >
              <h2 className="font-serif text-2xl font-semibold text-stone-100">
                {faq.q}
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-400">
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
