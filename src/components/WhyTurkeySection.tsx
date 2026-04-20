import { motion } from "framer-motion";
import { MapPin, DollarSign, ShieldCheck, Truck, Award, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const WhyTurkeySection = () => {
  const { lang } = useI18n();

  const reasons = [
    {
      icon: MapPin,
      en: { title: "Strategic Location", desc: "Positioned at the crossroads of Europe, Asia, and the Middle East — ideal for fast shipping to the Gulf (7-12 days by sea)." },
      ar: { title: "موقع استراتيجي", desc: "تقع في ملتقى أوروبا وآسيا والشرق الأوسط — مثالية للشحن السريع إلى الخليج (7-12 يوم بحراً)." },
    },
    {
      icon: DollarSign,
      en: { title: "Competitive Pricing", desc: "Turkish manufacturing offers European-level quality at significantly lower costs compared to EU producers, with flexible MOQs." },
      ar: { title: "أسعار تنافسية", desc: "التصنيع التركي يوفر جودة أوروبية بتكاليف أقل بكثير مع مرونة في الحد الأدنى للطلب." },
    },
    {
      icon: Award,
      en: { title: "Quality Standards", desc: "Turkish factories comply with international standards including ISO, SFDA, Halal, and Saber certifications required for Gulf markets." },
      ar: { title: "معايير الجودة", desc: "المصانع التركية تلتزم بالمعايير الدولية بما فيها ISO و SFDA و حلال وشهادة سابر المطلوبة لأسواق الخليج." },
    },
    {
      icon: Truck,
      en: { title: "Logistics Infrastructure", desc: "Turkey has world-class ports, modern freight infrastructure, and established shipping routes to Saudi Arabia and the entire Gulf region." },
      ar: { title: "بنية لوجستية متقدمة", desc: "تمتلك تركيا موانئ عالمية وبنية شحن حديثة وخطوط ملاحة راسخة إلى السعودية والخليج." },
    },
    {
      icon: Globe,
      en: { title: "Diverse Manufacturing", desc: "From textiles and food products to industrial equipment and construction materials — Turkey covers virtually every B2B category." },
      ar: { title: "تصنيع متنوع", desc: "من المنسوجات والمنتجات الغذائية إلى المعدات الصناعية ومواد البناء — تغطي تركيا كل فئات B2B." },
    },
    {
      icon: ShieldCheck,
      en: { title: "Trade Agreements", desc: "Turkey has free trade agreements with many countries, reducing customs duties and making cross-border trade more efficient." },
      ar: { title: "اتفاقيات تجارية", desc: "لدى تركيا اتفاقيات تجارة حرة مع العديد من الدول مما يقلل الرسوم الجمركية ويجعل التجارة أكثر كفاءة." },
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
            {lang === "ar" ? "لماذا التوريد من" : "Why Source from"}{" "}
            <span className="text-gradient-gold">{lang === "ar" ? "تركيا؟" : "Turkey?"}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {lang === "ar"
              ? "تركيا هي واحدة من أسرع مراكز التصنيع نمواً في العالم — وهذا هو السبب"
              : "Turkey is one of the world's fastest-growing manufacturing hubs — here's why it matters for your business"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((r, i) => {
            const loc = r[lang as "en" | "ar"] || r.en;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-6 rounded-2xl border border-border/50 bg-background/50 hover:border-primary/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <r.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-bold mb-2">{loc.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{loc.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyTurkeySection;
