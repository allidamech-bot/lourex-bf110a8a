import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const Testimonials = forwardRef<HTMLElement>((_props, ref) => {
  const { lang } = useI18n();

  const title = lang === "ar" ? "ماذا يقول عملاؤنا" : lang === "tr" ? "Müşterilerimiz Ne Diyor" : "What Our Clients Say";

  const testimonials = [
    {
      en: { quote: "LOUREX helped us find reliable manufacturers quickly and securely. The verification process gives us real confidence.", name: "Ahmad K.", role: "Import Manager, Saudi Arabia" },
      ar: { quote: "ساعدنا LOUREX في العثور على مصنّعين موثوقين بسرعة وأمان. عملية التوثيق تمنحنا ثقة حقيقية.", name: "أحمد ك.", role: "مدير استيراد، السعودية" },
      tr: { quote: "LOUREX, güvenilir üreticileri hızlı ve güvenli bir şekilde bulmamıza yardımcı oldu.", name: "Ahmad K.", role: "İthalat Müdürü, Suudi Arabistan" },
    },
    {
      en: { quote: "The platform streamlined our entire sourcing process. From factory to warehouse, everything is tracked.", name: "Fatima R.", role: "Procurement Director, UAE" },
      ar: { quote: "المنصة بسّطت عملية التوريد بالكامل. من المصنع إلى المستودع، كل شيء متتبّع.", name: "فاطمة ر.", role: "مديرة مشتريات، الإمارات" },
      tr: { quote: "Platform, tüm tedarik sürecimizi kolaylaştırdı. Fabrikadan depoya her şey takip ediliyor.", name: "Fatima R.", role: "Satın Alma Direktörü, BAE" },
    },
    {
      en: { quote: "As a supplier, LOUREX opened doors to new markets we couldn't reach before. The B2B tools are excellent.", name: "Mehmet Y.", role: "Factory Owner, Turkey" },
      ar: { quote: "كمورّد، فتح لنا LOUREX أبواباً لأسواق جديدة لم نتمكن من الوصول إليها من قبل.", name: "محمد ي.", role: "صاحب مصنع، تركيا" },
      tr: { quote: "Tedarikçi olarak LOUREX, daha önce ulaşamadığımız yeni pazarlara kapı açtı.", name: "Mehmet Y.", role: "Fabrika Sahibi, Türkiye" },
    },
    {
      en: { quote: "The escrow payment system gives both buyers and sellers peace of mind. Truly a game changer for B2B trade.", name: "Sara M.", role: "Business Owner, Kuwait" },
      ar: { quote: "نظام الدفع بالضمان يمنح المشترين والبائعين راحة البال. حقاً نقلة نوعية في التجارة.", name: "سارة م.", role: "صاحبة أعمال، الكويت" },
      tr: { quote: "Emanet ödeme sistemi hem alıcılara hem satıcılara güven veriyor.", name: "Sara M.", role: "İş Sahibi, Kuveyt" },
    },
  ];

  const initials = (name: string) => name.split(" ").map(w => w[0]).join("").toUpperCase();
  const colors = ["bg-blue-500/20 text-blue-500", "bg-emerald-500/20 text-emerald-500", "bg-purple-500/20 text-purple-500", "bg-primary/20 text-primary"];

  return (
    <section ref={ref} className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-5xl font-bold">{title}</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => {
            const loc = t[lang as "en" | "ar" | "tr"] || t.en;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="luxury-card p-8 relative"
              >
                <Quote className="w-8 h-8 text-primary/10 absolute top-6 end-6" />
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground leading-relaxed mb-6 italic">"{loc.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${colors[i % colors.length]}`}>
                    {initials(loc.name)}
                  </div>
                  <div>
                    <div className="font-serif font-bold text-sm">{loc.name}</div>
                    <div className="text-xs text-muted-foreground">{loc.role}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
Testimonials.displayName = "Testimonials";

export default Testimonials;
