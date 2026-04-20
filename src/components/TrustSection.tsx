import { motion } from "framer-motion";
import { ShieldCheck, Lock, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const TrustSection = () => {
  const { lang } = useI18n();

  const title = lang === "ar" ? "موثوق من الشركات حول العالم" : lang === "tr" ? "Dünya Genelinde İşletmeler Tarafından Güveniliyor" : "Trusted by Businesses Worldwide";

  const badges = [
    {
      icon: ShieldCheck,
      en: { label: "Verified", desc: "All suppliers are KYC-verified" },
      ar: { label: "موثّق", desc: "جميع الموردين موثّقون بالهوية" },
      tr: { label: "Doğrulanmış", desc: "Tüm tedarikçiler KYC doğrulamalı" },
    },
    {
      icon: Lock,
      en: { label: "Secure", desc: "Escrow-protected transactions" },
      ar: { label: "آمن", desc: "معاملات محمية بنظام الضمان" },
      tr: { label: "Güvenli", desc: "Emanet korumalı işlemler" },
    },
    {
      icon: Globe,
      en: { label: "Global", desc: "Operating in 35+ countries" },
      ar: { label: "عالمي", desc: "نعمل في أكثر من 35 دولة" },
      tr: { label: "Küresel", desc: "35+ ülkede faaliyet" },
    },
  ];

  const stats = [
    { value: "200+", en: "Active Merchants", ar: "تاجر نشط", tr: "Aktif Tüccar" },
    { value: "50+", en: "Verified Suppliers", ar: "مورد موثّق", tr: "Doğrulanmış Tedarikçi" },
    { value: "12K+", en: "Orders Processed", ar: "طلب تمت معالجته", tr: "İşlenen Sipariş" },
    { value: "35+", en: "Countries Served", ar: "دولة يتم خدمتها", tr: "Hizmet Verilen Ülke" },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-5xl font-bold">{title}</h2>
        </motion.div>

        {/* Animated stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="font-serif text-4xl md:text-5xl font-bold text-gradient-gold mb-2">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s[lang as "en" | "ar" | "tr"] || s.en}</div>
            </motion.div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {badges.map((b, i) => {
            const loc = b[lang as "en" | "ar" | "tr"] || b.en;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-6 rounded-2xl border border-primary/20 bg-primary/5"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                  <b.icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <div className="font-serif font-bold text-lg">{loc.label}</div>
                  <div className="text-sm text-muted-foreground">{loc.desc}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
