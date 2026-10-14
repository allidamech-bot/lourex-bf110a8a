import { useEffect } from "react";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";

export default function PrivacyPage() {
  const { t, dir } = useI18n();


  return (
    <div className="lourex-public lourex-privacy min-h-screen bg-background text-foreground">
      <SEO 
        title={t("consent.privacyTitle")}
        description={
          dir === "rtl"
            ? "سياسة خصوصية Lourex: كيف نجمع ونخزن ونحمي بيانات الحساب والتشغيل."
            : "Lourex Privacy Policy: how we collect, store, and protect account and operational data."
        }
      />
      <SiteHeader />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary-soft border border-primary/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
                {t("consent.privacyTitle")}
              </h1>
            </div>
            <div className="rounded-xl border border-primary/20 bg-card p-6 md:p-8 backdrop-blur-xl shadow-soft">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line font-medium">
                {t("consent.privacyContent")}
              </p>
            </div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-6 text-center">
              {t("legal.lastUpdated")}: March 2026
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
