import { useEffect } from "react";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";

export default function TermsPage() {
  const { t } = useI18n();


  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SEO 
        title={t("consent.tosTitle")}
        description="LOUREX Terms of Service: escrow payments, factory verification, order fulfillment, and liability terms."
      />
      <SiteHeader />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <ScrollText className="w-5 h-5 text-amber-500" />
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-stone-100">
                {t("consent.tosTitle")}
              </h1>
            </div>
            <div className="rounded-xl border border-amber-200/10 bg-stone-50/5 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
              <p className="text-sm text-stone-400 leading-relaxed whitespace-pre-line font-medium">
                {t("consent.tosContent")}
              </p>
            </div>
            <p className="text-xs text-stone-600 font-bold uppercase tracking-widest mt-6 text-center">
              {t("legal.lastUpdated")}: March 2026
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
