import { motion } from "framer-motion";
import { Shield, BadgeCheck, Scale, FileCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const WhyLourexSafe = () => {
  const { lang } = useI18n();

  const items = [
    {
      icon: BadgeCheck,
      title: lang === "ar" ? "موردون مُتحقَّق منهم" : "Vetted Suppliers",
      desc:
        lang === "ar"
          ? "كل مورد يقدم وثائقه التجارية ويُراجَع من فريقنا قبل الموافقة على الظهور."
          : "Every supplier submits trade documents that are reviewed by our team before being approved to list.",
    },
    {
      icon: FileCheck,
      title: lang === "ar" ? "وثائق طلب منظمة" : "Structured Order Documents",
      desc:
        lang === "ar"
          ? "عروض الأسعار، فواتير الأداء، وإيصالات الشحن كلها موثقة في حسابك."
          : "Quotes, proforma invoices, and shipping documents are all kept in your account for every deal.",
    },
    {
      icon: Scale,
      title: lang === "ar" ? "وسيط لحل النزاعات" : "Dispute Mediation",
      desc:
        lang === "ar"
          ? "إذا اختلف الطرفان، فريق LOUREX يتدخل كوسيط للوصول إلى حل عادل."
          : "If buyer and supplier disagree, the LOUREX team steps in as a mediator to reach a fair outcome.",
    },
    {
      icon: Shield,
      title: lang === "ar" ? "تتبع شفاف للشحنات" : "Transparent Shipment Status",
      desc:
        lang === "ar"
          ? "حالة كل شحنة تُحدَّث على المنصة من المصنع حتى التسليم."
          : "Each shipment's status is updated on the platform from factory dispatch through delivery.",
    },
  ];

  return (
    <section className="py-24 bg-card/50">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-5xl font-bold mb-4">
            {lang === "ar" ? "كيف تحمي LOUREX صفقاتك" : "How LOUREX Protects Your Trade"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {lang === "ar"
              ? "نوفّر بيئة مهنية شفافة، مع موردين مُتحقَّق منهم ومستندات تجارية واضحة."
              : "A professional, transparent trading environment with vetted suppliers and clear trade documents."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="luxury-card p-6 text-center group"
            >
              <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <item.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyLourexSafe;
