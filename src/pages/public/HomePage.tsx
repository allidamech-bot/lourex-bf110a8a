import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import CoreFeatures from "@/components/CoreFeatures";
import DashboardPreview from "@/components/DashboardPreview";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import LogisticsProcess from "@/components/LogisticsProcess";
import TrustSection from "@/components/TrustSection";
import WhyLourexSafe from "@/components/WhyLourexSafe";
import { motion } from "framer-motion";
import { BadgeDollarSign, ClipboardCheck, Route, Users2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const EN_DESCRIPTION =
  "LOUREX is a trade intermediary and sourcing coordination company for food and sweets products, connecting business buyers with suppliers and managing purchase requests, supplier coordination, deal follow-up, and delivery tracking.";

const AR_DESCRIPTION =
  "لوريكس LOUREX هي شركة وساطة وتنسيق توريد وتصدير للمواد الغذائية والحلويات، تربط المشترين التجاريين بالموردين وتدير طلبات الشراء، تنسيق الموردين، متابعة الصفقات، والشحن حتى التسليم.";

export default function HomePage() {
  const { t, lang } = useI18n();
  const isArabic = lang === "ar";

  const seoDescription = isArabic ? AR_DESCRIPTION : EN_DESCRIPTION;

  const charterDescription = isArabic
    ? "لوريكس شركة وساطة تجارية وتنسيق توريد وتصدير للمواد الغذائية والحلويات. نعمل مع المشترين التجاريين، المستوردين، الموزعين، تجار الجملة، والموردين لتنسيق الشوكولاتة، البسكويت، المواد الغذائية، المنتجات التركية، والمنتجات السورية بصياغة تجارية منظمة وآمنة."
    : "LOUREX is a trade intermediary and sourcing coordination company for food and sweets products. We help business buyers, importers, distributors, wholesalers, and suppliers coordinate chocolate, biscuits, food products, Turkish products, and Syrian products through structured purchase request management, supplier coordination, deal follow-up, and delivery tracking.";

  const charter = [
    {
      icon: Users2,
      title: isArabic ? "وساطة بين المشترين والموردين" : "Buyer and supplier coordination",
      description: isArabic
        ? "لوريكس تربط المشترين التجاريين بالموردين عبر دور وسيط توريد واضح، وليس كتصنيع أو سوق مفتوح."
        : "LOUREX connects business buyers with suppliers through a clear trade intermediary role, not as a manufacturer or open marketplace.",
    },
    {
      icon: ClipboardCheck,
      title: isArabic ? "إدارة طلبات الشراء" : "Purchase request management",
      description: isArabic
        ? "تبدأ العملية بطلب شراء منظم ثم مراجعة المنتج والمواصفات والكمية قبل تنسيق الموردين."
        : "The process starts with structured intake, then product, specification, and quantity review before supplier coordination.",
    },
    {
      icon: Route,
      title: isArabic ? "متابعة الصفقات والتسليم" : "Deal follow-up and delivery tracking",
      description: isArabic
        ? "تتابع لوريكس الصفقة والشحن حتى التسليم مع وضوح المرحلة والمسؤولية."
        : "LOUREX follows deals and shipments through delivery with clear stage and responsibility visibility.",
    },
    {
      icon: BadgeDollarSign,
      title: isArabic ? "تنسيق تجاري منظم" : "Structured trade coordination",
      description: isArabic
        ? "التركيز على تنسيق التوريد والتصدير والمتابعة التجارية للمواد الغذائية والحلويات."
        : "The focus is export coordination, supplier coordination, and trade follow-up for food and sweets products.",
    },
  ];

  const operatingPath = [
    isArabic ? "استقبال طلب الشراء" : "Purchase request intake",
    isArabic ? "مراجعة المنتج والمواصفات" : "Product and specification review",
    isArabic ? "تنسيق الموردين" : "Supplier coordination",
    isArabic ? "متابعة الصفقة" : "Deal follow-up",
    isArabic ? "متابعة الشحن والتسليم" : "Delivery tracking",
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SEO
        title={
          isArabic
            ? "لوريكس | وسيط توريد وتصدير للمواد الغذائية والحلويات"
            : "LOUREX | Trade Intermediary & Sourcing Coordination"
        }
        description={seoDescription}
        url="https://www.lou-rex.com/"
      />
      <SiteHeader />
      <HeroSection />
      <section className="relative overflow-hidden border-y border-stone-200/10 bg-[linear-gradient(180deg,rgba(28,25,23,0.78),rgba(12,10,9,0.98))] py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(214,160,74,0.08),transparent_28%),radial-gradient(circle_at_82%_55%,rgba(245,245,244,0.04),transparent_24%)]" />
        <div className="container relative mx-auto px-4 md:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:sticky lg:top-28"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/90">
                {isArabic ? "تعريف لوريكس" : "LOUREX positioning"}
              </p>
              <h2 className="mt-5 font-serif text-3xl font-bold text-stone-100 md:text-5xl">
                {isArabic
                  ? "شركة وساطة وتنسيق توريد للمواد الغذائية والحلويات"
                  : "A trade intermediary for food and sweets sourcing"}
              </h2>
              <p className="mt-5 text-base leading-8 text-stone-300">
                {charterDescription}
              </p>

              <div className="mt-8 rounded-[1.75rem] border border-stone-200/10 bg-stone-950/45 p-5">
                <p className="text-sm font-semibold text-stone-100">
                  {isArabic ? "المسار المختصر" : "Condensed coordination path"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {operatingPath.map((step, index) => (
                    <span
                      key={step}
                      className="rounded-full border border-stone-200/10 bg-stone-900/70 px-3 py-1.5 text-xs text-stone-300"
                    >
                      {index + 1}. {step}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2">
              {charter.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="group rounded-[1.75rem] border border-stone-200/10 bg-stone-950/40 p-6 shadow-xl shadow-stone-950/20 transition hover:-translate-y-1 hover:border-amber-300/20 hover:bg-stone-900/65"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/10 text-amber-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-serif text-2xl font-semibold text-stone-100 group-hover:text-amber-100">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-400">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <LogisticsProcess />
      <CoreFeatures />
      <TrustSection />
      <WhyLourexSafe />
      <DashboardPreview />
      <FinalCTA />
      <Footer />
    </div>
  );
}
