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
  const { t } = useI18n();

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

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SEO 
        title={t("nav.home")} 
        description={t("home.charter.description")}
      />
      <SiteHeader />
      <HeroSection />
      <section className="relative overflow-hidden border-y border-amber-200/10 bg-stone-900/50 py-20">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-4xl text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-500">
              {t("home.charter.eyebrow")}
            </p>
            <h2 className="mt-5 font-serif text-3xl font-bold text-stone-100 md:text-5xl">
              {t("home.charter.title")}
            </h2>
            <p className="mt-5 text-base leading-8 text-stone-300">
              {t("home.charter.description")}
            </p>
          </motion.div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {charter.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="rounded-[1.9rem] border border-amber-200/15 bg-stone-50/5 p-6 shadow-2xl backdrop-blur-xl"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-serif text-2xl font-semibold text-stone-100">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-400">{item.description}</p>
              </motion.div>
            ))}
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
