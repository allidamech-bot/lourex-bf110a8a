import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Factory, Package, Ship, FileText } from "lucide-react";
import HeroSearch from "@/components/HeroSearch";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import RequestQuoteModal from "@/components/RequestQuoteModal";
import heroImg from "@/assets/hero-trade.jpg";

const HeroSection = () => {
  const { lang } = useI18n();
  const [stats, setStats] = useState({ factories: "50+", pallets: "12K+", countries: "35+" });
  const [showQuote, setShowQuote] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", ["stat_factories", "stat_pallets", "stat_countries"]);
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((r: any) => { map[r.key] = r.value; });
          setStats({
            factories: map.stat_factories || "50+",
            pallets: map.stat_pallets || "12K+",
            countries: map.stat_countries || "35+",
          });
        }
      } catch { /* use defaults */ }
    };
    fetchStats();
  }, []);

  const content = {
    en: {
      badge: "B2B Sourcing Platform",
      title1: "Source from Verified",
      title2: "Turkish Factories",
      subtitle: "End-to-end sourcing and logistics from factory floor to your warehouse. Vetted suppliers, structured trade documents, and shipment status updates at every stage.",
      cta1: "Request a Quote",
      cta2: "Explore Suppliers",
      stat1: "Verified Suppliers",
      stat2: "Pallets Shipped",
      stat3: "Countries Served",
    },
    ar: {
      badge: "منصة توريد بين الشركات",
      title1: "استورد من مصانع تركية",
      title2: "مُتحقَّق منها",
      subtitle: "توريد ولوجستيات شاملة من المصنع إلى مستودعك. موردون مُتحقَّق منهم، مستندات تجارية منظمة، وتحديثات حالة الشحنة في كل مرحلة.",
      cta1: "اطلب عرض سعر",
      cta2: "استكشف الموردين",
      stat1: "موردون موثقون",
      stat2: "باليت تم شحنها",
      stat3: "دولة يتم خدمتها",
    },
    tr: {
      badge: "B2B Tedarik Platformu",
      title1: "Doğrulanmış Türk",
      title2: "Fabrikalarından Tedarik Edin",
      subtitle: "Fabrika zemininden deponuza uçtan uca tedarik ve lojistik. Doğrulanmış tedarikçiler, yapılandırılmış ticaret belgeleri ve her aşamada gönderi durumu güncellemeleri.",
      cta1: "Teklif İsteyin",
      cta2: "Tedarikçileri Keşfedin",
      stat1: "Doğrulanmış Tedarikçi",
      stat2: "Gönderilen Palet",
      stat3: "Hizmet Verilen Ülke",
    },
  };

  const t = content[lang] || content.en;

  const statItems = [
    { icon: Factory, value: stats.factories, label: t.stat1 },
    { icon: Package, value: stats.pallets, label: t.stat2 },
    { icon: Ship, value: stats.countries, label: t.stat3 },
  ];

  return (
    <>
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Global trade port" className="w-full h-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
        </div>

        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold text-primary tracking-widest uppercase">
                  {t.badge}
                </span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            >
              {t.title1}{" "}
              <span className="text-gradient-gold">{t.title2}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
            >
              {t.subtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start gap-4"
            >
              <Button variant="gold" size="lg" className="text-base px-8 font-semibold" onClick={() => setShowQuote(true)}>
                <FileText className="w-4 h-4 me-2" />
                {t.cta1}
                <ArrowRight className="ms-2" size={18} />
              </Button>
              <Button variant="gold-outline" size="lg" className="text-base px-8" asChild>
                <Link to="/catalog">{t.cta2}</Link>
              </Button>
              <Button variant="ghost" size="lg" className="text-base px-8 text-primary hover:text-primary hover:bg-primary/10" asChild>
                <Link to="/factory-signup">
                  <Factory className="w-4 h-4 me-2" />
                  Become a Supplier
                </Link>
              </Button>
            </motion.div>

            {/* Trust stats */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="flex flex-wrap gap-8 mt-16"
            >
              {statItems.map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-serif text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>

            <HeroSearch />
          </div>
        </div>
      </section>

      <RequestQuoteModal open={showQuote} onClose={() => setShowQuote(false)} />
    </>
  );
};

export default HeroSection;
