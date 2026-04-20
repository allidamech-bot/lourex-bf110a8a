import { motion } from "framer-motion";
import { Shield, Truck, Clock, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const ValueProps = () => {
  const { t } = useI18n();

  const features = [
    { icon: Shield, title: t("vp.verified"), description: t("vp.verifiedDesc") },
    { icon: Truck, title: t("vp.logistics"), description: t("vp.logisticsDesc") },
    { icon: Clock, title: t("vp.tracking"), description: t("vp.trackingDesc") },
    { icon: Globe, title: t("vp.global"), description: t("vp.globalDesc") },
  ];

  return (
    <section className="py-24 bg-surface-overlay">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            {t("vp.title")} <span className="text-gradient-gold">LOUREX</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">{t("vp.subtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-lg p-6 hover:border-gold/30 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4 group-hover:bg-gold/20 transition-colors">
                <feature.icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-serif text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueProps;
