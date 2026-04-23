import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const PrivacyPolicy = () => {
  const { t } = useI18n();

  useEffect(() => {
    document.title = "Privacy Policy | LOUREX - Data Protection & Security";
    const meta = document.querySelector('meta[name="description"]');
    const content = "LOUREX Privacy Policy: how we collect, store, and protect your personal and trade data with AES-256 encryption, RBAC access control, and full consent logging.";
    if (meta) meta.setAttribute("content", content);
    else { const m = document.createElement("meta"); m.name = "description"; m.content = content; document.head.appendChild(m); }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold">
                {t("consent.privacyTitle")}
              </h1>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 md:p-8">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {t("consent.privacyContent")}
              </p>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-4 text-center">
              {t("legal.lastUpdated")}: March 2026
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
