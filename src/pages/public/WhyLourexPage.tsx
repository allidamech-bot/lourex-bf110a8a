import { useEffect } from "react";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function WhyLourexPage() {
  const { t } = useI18n();


  const reasons = [
    { title: t("why.reason1Title"), desc: t("why.reason1Desc") },
    { title: t("why.reason2Title"), desc: t("why.reason2Desc") },
    { title: t("why.reason3Title"), desc: t("why.reason3Desc") },
    { title: t("why.reason4Title"), desc: t("why.reason4Desc") },
    { title: t("why.reason5Title"), desc: t("why.reason5Desc") },
    { title: t("why.reason6Title"), desc: t("why.reason6Desc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={t("nav.whyLourex")}
        description="Six reasons merchants choose LOUREX: verified factories, milestone escrow, real-time tracking, and more."
      />
      <SiteHeader />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              {t("why.title")} <span className="text-gradient-gold">{t("why.titleHighlight")}</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-10">{t("why.subtitle")}</p>

            <div className="space-y-4">
              {reasons.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-4 rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{r.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
