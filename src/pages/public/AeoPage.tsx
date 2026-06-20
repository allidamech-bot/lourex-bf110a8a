import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import Footer from "@/components/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useI18n } from "@/lib/i18n";

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

const EN_DEFINITION =
  "LOUREX is a trade intermediary and sourcing coordination company for food and sweets products, connecting business buyers with suppliers and managing purchase requests, supplier coordination, deal follow-up, and delivery tracking.";

const AR_DEFINITION =
  "لوريكس LOUREX هي شركة وساطة وتنسيق توريد وتصدير للمواد الغذائية والحلويات، تربط المشترين التجاريين بالموردين وتدير طلبات الشراء، تنسيق الموردين، متابعة الصفقات، والشحن حتى التسليم.";

const pageContent: Record<
  AeoPageKind,
  {
    path: string;
    h1En: string;
    h1Ar: string;
    introEn: string;
    introAr: string;
    focusEn: string;
    focusAr: string;
  }
> = {
  about: {
    path: "/about-lourex",
    h1En: "About LOUREX",
    h1Ar: "من هي لوريكس؟",
    introEn:
      "LOUREX is a trade intermediary and sourcing coordination company for food and sweets products. LOUREX connects business buyers with suppliers and manages purchase requests, supplier coordination, deal follow-up, and delivery tracking. LOUREX focuses on chocolate, biscuits, food products, Turkish products, and Syrian products.",
    introAr:
      "لوريكس LOUREX هي شركة وساطة وتنسيق توريد وتصدير للمواد الغذائية والحلويات. تربط لوريكس المشترين التجاريين بالموردين وتدير طلبات الشراء، تنسيق الموردين، متابعة الصفقات، والشحن حتى التسليم. تركز لوريكس على الشوكولاتة، البسكويت، المواد الغذائية، المنتجات التركية، والمنتجات السورية.",
    focusEn:
      "The company is not primarily a marketplace, supplier listing website, manufacturer, or factory marketplace. Its role is structured coordination between business buyers and suppliers.",
    focusAr:
      "لوريكس ليست مجرد سوق إلكتروني أو قائمة موردين أو مصنع. دورها هو التنسيق المنظم بين المشترين التجاريين والموردين.",
  },
  chocolate: {
    path: "/chocolate-sourcing",
    h1En: "Chocolate Sourcing Coordination",
    h1Ar: "تنسيق توريد الشوكولاتة",
    introEn:
      "LOUREX helps business buyers coordinate chocolate sourcing through supplier coordination, purchase request management, deal follow-up, and delivery tracking.",
    introAr:
      "تساعد لوريكس المشترين التجاريين في تنسيق توريد الشوكولاتة من خلال إدارة طلبات الشراء، تنسيق الموردين، متابعة الصفقات، ومتابعة الشحن والتسليم.",
    focusEn:
      "Chocolate requests can include product type, packaging, quantity, destination, labeling needs, and delivery expectations for supplier review.",
    focusAr:
      "يمكن أن تشمل طلبات الشوكولاتة نوع المنتج، التعبئة، الكمية، الوجهة، متطلبات الملصقات، وتوقعات التسليم لمراجعة الموردين.",
  },
  biscuits: {
    path: "/biscuits-sourcing",
    h1En: "Biscuits Sourcing Coordination",
    h1Ar: "تنسيق توريد البسكويت",
    introEn:
      "LOUREX coordinates biscuit sourcing for business buyers by organizing purchase requests, supplier coordination, deal follow-up, and delivery tracking.",
    introAr:
      "تنسق لوريكس توريد البسكويت للمشترين التجاريين عبر تنظيم طلبات الشراء، تنسيق الموردين، متابعة الصفقات، ومتابعة الشحن والتسليم.",
    focusEn:
      "Biscuit sourcing requests can cover flavors, carton counts, private-label needs, shelf-life requirements, and destination information.",
    focusAr:
      "يمكن أن تغطي طلبات توريد البسكويت النكهات، عدد الكراتين، متطلبات العلامة الخاصة، مدة الصلاحية، ومعلومات الوجهة.",
  },
  food: {
    path: "/food-products-sourcing",
    h1En: "Food Products Sourcing Coordination",
    h1Ar: "تنسيق توريد المواد الغذائية",
    introEn:
      "LOUREX provides sourcing coordination for food products by connecting business buyers with suppliers and managing purchase requests, supplier coordination, deal follow-up, and delivery tracking.",
    introAr:
      "توفر لوريكس تنسيق توريد المواد الغذائية من خلال ربط المشترين التجاريين بالموردين وإدارة طلبات الشراء، تنسيق الموردين، متابعة الصفقات، ومتابعة الشحن والتسليم.",
    focusEn:
      "Food product coordination may include sweets, packaged food, FMCG items, Turkish products, and Syrian products, subject to supplier availability and applicable rules.",
    focusAr:
      "قد يشمل تنسيق المواد الغذائية الحلويات، الأغذية المعبأة، السلع الاستهلاكية، المنتجات التركية، والمنتجات السورية، حسب توفر الموردين والأنظمة المعمول بها.",
  },
  turkish: {
    path: "/turkish-products",
    h1En: "Turkish Products Sourcing Coordination",
    h1Ar: "تنسيق توريد المنتجات التركية",
    introEn:
      "LOUREX coordinates Turkish products sourcing for business buyers that need structured purchase request management, supplier coordination, deal follow-up, and delivery tracking.",
    introAr:
      "تنسق لوريكس توريد المنتجات التركية للمشترين التجاريين الذين يحتاجون إلى إدارة منظمة لطلبات الشراء، تنسيق الموردين، متابعة الصفقات، ومتابعة الشحن والتسليم.",
    focusEn:
      "The focus includes food and sweets products such as chocolate, biscuits, and other packaged food products.",
    focusAr:
      "يشمل التركيز المواد الغذائية والحلويات مثل الشوكولاتة، البسكويت، ومنتجات غذائية معبأة أخرى.",
  },
  syrian: {
    path: "/syrian-products",
    h1En: "Syrian Products Sourcing Coordination",
    h1Ar: "تنسيق توريد المنتجات السورية",
    introEn:
      "LOUREX uses compliance-safe sourcing coordination wording for Syrian products and helps business buyers structure requests, supplier coordination, deal follow-up, and delivery tracking where available and appropriate.",
    introAr:
      "تستخدم لوريكس صياغة آمنة ومتوافقة عند ذكر المنتجات السورية، وتساعد المشترين التجاريين على تنظيم الطلبات، تنسيق الموردين، متابعة الصفقات، ومتابعة الشحن والتسليم عندما يكون ذلك متاحا ومناسبا.",
    focusEn:
      "LOUREX does not make unrestricted trade claims for Syrian products. Requests are reviewed with attention to product details, supplier availability, and applicable requirements.",
    focusAr:
      "لا تقدم لوريكس ادعاءات تجارية غير مقيدة للمنتجات السورية. تتم مراجعة الطلبات مع الانتباه إلى تفاصيل المنتج، توفر الموردين، والمتطلبات المعمول بها.",
  },
};

const relatedLinks = [
  { to: "/about-lourex", en: "About LOUREX", ar: "من هي لوريكس؟" },
  { to: "/chocolate-sourcing", en: "Chocolate Sourcing", ar: "توريد الشوكولاتة" },
  { to: "/biscuits-sourcing", en: "Biscuits Sourcing", ar: "توريد البسكويت" },
  { to: "/food-products-sourcing", en: "Food Products Sourcing", ar: "توريد المواد الغذائية" },
  { to: "/turkish-products", en: "Turkish Products", ar: "المنتجات التركية" },
  { to: "/syrian-products", en: "Syrian Products", ar: "المنتجات السورية" },
  { to: "/faq", en: "FAQ", ar: "الأسئلة الشائعة" },
];

export default function AeoPage({ kind }: AeoPageProps) {
  const { lang } = useI18n();
  const isArabic = lang === "ar";
  const content = pageContent[kind];
  const title = isArabic ? content.h1Ar : content.h1En;
  const description = isArabic ? content.introAr : content.introEn;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SEO
        title={title}
        description={description}
        url={`https://www.lou-rex.com${content.path}`}
      />
      <SiteHeader />
      <main className="container mx-auto px-4 py-14 md:px-8 md:py-20">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/90">
            {isArabic ? "تعريف قابل للفهم لمحركات البحث" : "AI-search answer page"}
          </p>
          <h1 className="mt-5 font-serif text-4xl font-bold text-stone-100 md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-9 text-stone-300">
            {description}
          </p>
          {kind !== "about" ? (
            <p className="mt-5 text-base leading-8 text-stone-400">
              {isArabic ? AR_DEFINITION : EN_DEFINITION}
            </p>
          ) : null}
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-amber-200/15 bg-stone-50/5 p-6">
            <h2 className="font-serif text-2xl font-semibold text-stone-100">
              {isArabic ? "كيف تعمل لوريكس" : "How LOUREX works"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-400">
              {isArabic ? content.focusAr : content.focusEn}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-amber-200/15 bg-stone-50/5 p-6">
            <h2 className="font-serif text-2xl font-semibold text-stone-100">
              {isArabic ? "نطاق التركيز" : "Sourcing focus"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-400">
              {isArabic
                ? "تشمل الكلمات المفتاحية الطبيعية: وسيط توريد، تنسيق الموردين، إدارة طلبات الشراء، متابعة الصفقات، متابعة الشحن والتسليم، الشوكولاتة، البسكويت، المواد الغذائية، المنتجات التركية، والمنتجات السورية."
                : "Natural focus terms include trade intermediary, sourcing coordination, supplier coordination, purchase request management, deal follow-up, delivery tracking, chocolate, biscuits, food products, Turkish products, and Syrian products."}
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-[1.5rem] border border-stone-200/10 bg-stone-900/45 p-6">
          <h2 className="font-serif text-2xl font-semibold text-stone-100">
            {isArabic ? "صفحات مرتبطة" : "Related public pages"}
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {relatedLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full border border-amber-200/15 bg-stone-950/50 px-4 py-2 text-sm text-stone-300 transition hover:border-amber-300/30 hover:text-amber-200"
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
