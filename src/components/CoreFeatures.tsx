import { motion } from "framer-motion";
import { ShieldCheck, Lock, Sparkles, Globe, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CoreFeatures = () => {
  const { lang } = useI18n();

  const features = [
    {
      icon: ShieldCheck,
      en: { title: "Verified Suppliers", desc: "Work only with trusted and verified manufacturers" },
      ar: { title: "موردون موثوقون", desc: "تعامل فقط مع مصنّعين موثوقين ومعتمدين" },
      tr: { title: "Doğrulanmış Tedarikçiler", desc: "Yalnızca güvenilir ve doğrulanmış üreticilerle çalışın" },
    },
    {
      icon: Lock,
      en: { title: "Secure Transactions", desc: "Protected payments and safe business environment" },
      ar: { title: "معاملات آمنة", desc: "مدفوعات محمية وبيئة أعمال آمنة" },
      tr: { title: "Güvenli İşlemler", desc: "Korumalı ödemeler ve güvenli iş ortamı" },
    },
    {
      icon: Sparkles,
      en: { title: "Smart Matching", desc: "Find the right supplier instantly" },
      ar: { title: "مطابقة ذكية", desc: "ابحث عن المورد المناسب فوراً" },
      tr: { title: "Akıllı Eşleştirme", desc: "Doğru tedarikçiyi anında bulun" },
    },
    {
      icon: Globe,
      en: { title: "Global Logistics Support", desc: "End-to-end shipping guidance" },
      ar: { title: "دعم لوجستي عالمي", desc: "إرشاد شحن شامل من البداية إلى النهاية" },
      tr: { title: "Küresel Lojistik Desteği", desc: "Uçtan uca nakliye rehberliği" },
    },
    {
      icon: Languages,
      en: { title: "Multi-language Platform", desc: "Supports English, Arabic, Turkish and more" },
      ar: { title: "منصة متعددة اللغات", desc: "تدعم العربية والإنجليزية والتركية والمزيد" },
      tr: { title: "Çok Dilli Platform", desc: "İngilizce, Arapça, Türkçe ve daha fazlasını destekler" },
    },
  ];

  const title = lang === "ar" ? "ميزات قوية للتجارة العالمية" : lang === "tr" ? "Küresel Ticaret İçin Güçlü Özellikler" : "Powerful Features for Global Trade";

  return (
    <section className="py-24 bg-card/50">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-5xl font-bold">{title}</h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const loc = f[lang as "en" | "ar" | "tr"] || f.en;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="luxury-card p-8 hover:border-primary/40 transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-bold mb-2">{loc.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{loc.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CoreFeatures;
