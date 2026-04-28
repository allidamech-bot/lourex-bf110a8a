import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Globe, Shield, Truck, Users } from "lucide-react";

const AboutPage = () => {
  const { t } = useI18n();

  useEffect(() => {
    document.title = "About LOUREX | Global Import Export & Logistics Hub";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "LOUREX connects verified factories in Turkey, China & Syria with buyers worldwide. Premium sourcing, logistics & trade facilitation.");
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "LOUREX connects verified factories in Turkey, China & Syria with buyers worldwide. Premium sourcing, logistics & trade facilitation.";
      document.head.appendChild(m);
    }
  }, []);

  const pillars = [
    { icon: Globe, title: t("about.pillar1Title"), desc: t("about.pillar1Desc") },
    { icon: Shield, title: t("about.pillar2Title"), desc: t("about.pillar2Desc") },
    { icon: Truck, title: t("about.pillar3Title"), desc: t("about.pillar3Desc") },
    { icon: Users, title: t("about.pillar4Title"), desc: t("about.pillar4Desc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              {t("about.title")} <span className="text-gradient-gold">{t("about.titleHighlight")}</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed">{t("about.intro")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {pillars.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-border bg-card p-6 space-y-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <p.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{t("about.body")}</p>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
