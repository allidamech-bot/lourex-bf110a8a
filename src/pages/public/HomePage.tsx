import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import CoreFeatures from "@/components/CoreFeatures";
import DashboardPreview from "@/components/DashboardPreview";
import FinalCTA from "@/components/FinalCTA";
import HeroSection from "@/components/HeroSection";
import LogisticsProcess from "@/components/LogisticsProcess";
import TrustSection from "@/components/TrustSection";
import WhyLourexSafe from "@/components/WhyLourexSafe";
import { motion } from "framer-motion";
import { BadgeDollarSign, ClipboardCheck, Route, Users2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t, lang } = useI18n();
  const isArabic = lang === "ar";

  const seoDescription = isArabic
    ? "لوركس LOUREX هي شركة توريد وعمليات تجارية B2B مقرها تركيا، تساعد الشركات والتجار في السعودية والخليج على الوصول إلى منتجات تركية موثوقة وإدارة طلبات الشراء والصفقات والمتابعة حتى التسليم."
    : "LOUREX is a Turkey-based B2B sourcing and trade operations company helping Saudi Arabia and Gulf buyers source verified Turkish products, manage purchase requests, supplier coordination, deal execution, and delivery follow-up.";

  const charterDescription = isArabic
    ? "لوركس LOUREX ليست مجرد نموذج طلب أو لوحة تتبع منفصلة. هي شركة توريد وعمليات تجارية B2B مقرها تركيا، تربط طلبات الشراء بالموردين الأتراك والصفقات والتتبع والانضباط المالي حتى التسليم للأسواق السعودية والخليجية."
    : "LOUREX is not just a form front-end or a separate shipment viewer. It is a Turkey-based B2B sourcing and trade operations company that connects purchase requests, Turkish supplier coordination, deal execution, shipment progress, financial discipline, and delivery follow-up for Saudi Arabia and Gulf buyers.";

  const charter = [
    {
      icon: Users2,
      title: t("home.charter.items.model.title"),
      description: t("home.charter.items.model.description"),
    },
    {
      icon: ClipboardCheck,
      title: t("home.charter.items.request.title"),
      description: t("home.charter.items.request.description"),
    },
    {
      icon: Route,
      title: t("home.charter.items.logistics.title"),
      description: t("home.charter.items.logistics.description"),
    },
    {
      icon: BadgeDollarSign,
      title: t("home.charter.items.finance.title"),
      description: t("home.charter.items.finance.description"),
    },
  ];

  const operatingPath = [
    isArabic ? "استقبال الطلب" : "Request intake",
    isArabic ? "مراجعة داخلية" : "Internal review",
    isArabic ? "تحويل إلى صفقة" : "Deal conversion",
    isArabic ? "تتبع رسمي" : "Official tracking",
    isArabic ? "محاسبة وتدقيق" : "Accounting & audit",
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SEO
        title={isArabic ? "توريد منتجات تركية إلى السعودية والخليج" : "Turkey to Saudi B2B Sourcing"}
        description={seoDescription}
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
                {t("home.charter.eyebrow")}
              </p>
              <h2 className="mt-5 font-serif text-3xl font-bold text-stone-100 md:text-5xl">
                {t("home.charter.title")}
              </h2>
              <p className="mt-5 text-base leading-8 text-stone-300">
                {charterDescription}
              </p>

              <div className="mt-8 rounded-[1.75rem] border border-stone-200/10 bg-stone-950/45 p-5">
                <p className="text-sm font-semibold text-stone-100">
                  {isArabic ? "المسار التشغيلي المختصر" : "Condensed operating path"}
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
    </div>
  );
}
